const state = {
  data: {
    ai: [],
    styles: [],
    stylePrompts: {},
    subcategories: {},
    scenes: [],
    lighting: [],
    colors: [],
    moods: [],
    camera: [],
    poses: [],
    character: {
      faceModels: [],
      hairStyles: [],
      hairColors: [],
      expressions: [],
      eyeStyles: [],
      makeup: [],
      skinTones: [],
      vibes: []
    },
    promptRules: {}
  },
  resolved: {
    pose: "",
    lighting: "",
    color: ""
  }
};

const $ = (id) => document.getElementById(id);

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function splitPromptText(value) {
  return safeText(value)
    .split(/\s*,\s*/)
    .map((item) => safeText(item))
    .filter(Boolean);
}

function normalizePhrase(value) {
  return safeText(value).toLowerCase().replace(/\s+/g, " ");
}

function getOptionValue(item) {
  return safeText(item?.value ?? item?.en ?? item?.id ?? "");
}

function getOptionLabel(item) {
  return safeText(item?.jp ?? item?.label ?? getOptionValue(item));
}

function getOptionPrompt(item) {
  if (!item) return [];
  if (Array.isArray(item.prompt)) {
    return item.prompt.map((entry) => safeText(entry)).filter(Boolean);
  }
  if (typeof item.prompt === "string") {
    return splitPromptText(item.prompt);
  }
  return splitPromptText(getOptionValue(item));
}

function flattenPhrases(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenPhrases(entry));
  }
  if (typeof value === "string") {
    const single = safeText(value);
    return single ? [single] : [];
  }
  return [];
}

function dedupePhrases(value) {
  const seen = new Set();
  const result = [];

  for (const phrase of flattenPhrases(value)) {
    const normalized = normalizePhrase(phrase);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(phrase);
  }

  return result;
}

function uniqueBlock(block, seen) {
  const result = [];

  for (const phrase of dedupePhrases(block)) {
    const normalized = normalizePhrase(phrase);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(phrase);
  }

  return result;
}

function buildPromptText(blocks) {
  const seen = new Set();

  return blocks
    .map((block) => uniqueBlock(block, seen))
    .filter((block) => block.length > 0)
    .map((block) => block.join(",\n"))
    .join(",\n\n");
}

function weightedPhrase(phrase, weight) {
  const safePhrase = safeText(phrase);
  const safeWeight = safeText(weight);
  if (!safePhrase) return "";
  if (!safeWeight) return safePhrase;
  return `(${safePhrase}:${safeWeight})`;
}

function applyWeightBlock(block, weight) {
  return dedupePhrases(block).map((phrase) => weightedPhrase(phrase, weight));
}

function findOption(items, value) {
  return items.find((item) => getOptionValue(item) === value) || null;
}

function getRuleArray(path) {
  return Array.isArray(path) ? path : [];
}

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load: ${path} (${res.status})`);
  }
  return res.json();
}

async function loadAllData() {
  const [
    ai,
    styles,
    stylePrompts,
    subcategories,
    scenes,
    lighting,
    colors,
    moods,
    camera,
    poses,
    character,
    promptRules
  ] = await Promise.all([
    loadJson("./data/ai.json"),
    loadJson("./data/styles.json"),
    loadJson("./data/style_prompts.json"),
    loadJson("./data/subcategories.json"),
    loadJson("./data/scenes.json"),
    loadJson("./data/lighting.json"),
    loadJson("./data/colors.json"),
    loadJson("./data/moods.json"),
    loadJson("./data/camera.json"),
    loadJson("./data/pose.json"),
    loadJson("./data/character.json"),
    loadJson("./data/prompt_rules.json")
  ]);

  state.data.ai = ai;
  state.data.styles = styles;
  state.data.stylePrompts = stylePrompts;
  state.data.subcategories = subcategories;
  state.data.scenes = scenes;
  state.data.lighting = lighting;
  state.data.colors = colors;
  state.data.moods = moods;
  state.data.camera = camera;
  state.data.poses = poses;
  state.data.character = character;
  state.data.promptRules = promptRules;
}

function fillSelect(selectId, items, options = {}) {
  const { placeholder = "" } = options;
  const el = $(selectId);
  if (!el) return;

  el.innerHTML = "";

  if (placeholder) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    el.appendChild(opt);
  }

  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = getOptionValue(item);
    opt.textContent = getOptionLabel(item);
    el.appendChild(opt);
  }
}

function setSelectValue(selectId, value) {
  const el = $(selectId);
  if (!el) return;
  el.value = value;
}

function fillSubcategorySelect(styleValue) {
  const list = state.data.subcategories[styleValue] || [];
  fillSelect("subcategory", list, { placeholder: "選択してください" });
}

function bindRange(rangeId, outputId) {
  const range = $(rangeId);
  const output = $(outputId);
  if (!range || !output) return;

  const sync = () => {
    output.textContent = Number(range.value).toFixed(2);
  };

  range.addEventListener("input", sync);
  sync();
}

function getSelectedText(selectId) {
  const el = $(selectId);
  if (!el || el.selectedIndex < 0) return "";
  return safeText(el.options[el.selectedIndex]?.textContent || "");
}

function getDefaults() {
  return state.data.promptRules.defaults || {};
}

function getStyleNote(style) {
  return state.data.promptRules.styleNotes?.[style] || {};
}

function getUiValues() {
  const defaults = getDefaults();

  return {
    ai: safeText($("ai")?.value),
    style: safeText($("style")?.value),
    subcategory: safeText($("subcategory")?.value),
    scene: safeText($("scene")?.value),
    lightingMode: safeText($("lighting")?.value || defaults.lightingMode || "auto"),
    lightingManual: safeText($("lightingManual")?.value),
    colorMode: safeText($("color")?.value || defaults.colorMode || "auto"),
    colorManual: safeText($("colorManual")?.value),
    mood: safeText($("mood")?.value),
    camera: safeText($("camera")?.value),
    pose: safeText($("pose")?.value || defaults.pose || "auto"),
    faceLock: safeText($("faceLock")?.value || defaults.faceLock || "on"),
    hairLock: safeText($("hairLock")?.value || defaults.hairLock || "on"),

    faceModel: safeText($("faceModel")?.value),
    hairStyle: safeText($("hairStyle")?.value),
    hairColor: safeText($("hairColor")?.value),
    expression: safeText($("expression")?.value),
    eyeStyle: safeText($("eyeStyle")?.value),
    makeup: safeText($("makeup")?.value),
    skinTone: safeText($("skinTone")?.value),
    vibe: safeText($("vibe")?.value),
    characterExtra: safeText($("characterExtra")?.value),
    userNegative: safeText($("negativeExtra")?.value),

    silhouetteWeight: Number($("silhouetteWeight")?.value || 1.3).toFixed(2),
    fabricWeight: Number($("fabricWeight")?.value || 1.2).toFixed(2),
    sceneWeight: Number($("sceneWeight")?.value || 1.1).toFixed(2),
    characterWeight: Number($("characterWeight")?.value || 1.2).toFixed(2)
  };
}

function resolvePose(values) {
  const fallback = safeText(state.data.promptRules.fallbacks?.pose || "runway stance");
  if (values.pose && values.pose !== "auto") {
    return values.pose;
  }
  return safeText(state.data.promptRules.autoMappings?.poseByStyle?.[values.style] || fallback);
}

function resolveLighting(values) {
  const fallback = safeText(state.data.promptRules.fallbacks?.lighting || "Softbox Fashion Lighting");
  if (values.lightingMode === "manual") {
    return values.lightingManual || fallback;
  }
  return safeText(state.data.promptRules.autoMappings?.lightingByScene?.[values.scene] || fallback);
}

function resolveColorGrade(values) {
  const fallback = safeText(state.data.promptRules.fallbacks?.color || "Luxury Neutral Editorial");
  if (values.colorMode === "manual") {
    return values.colorManual || fallback;
  }

  const sceneOverride =
    state.data.promptRules.autoMappings?.colorByStyleScene?.[values.style]?.[values.scene];
  if (sceneOverride) {
    return safeText(sceneOverride);
  }

  return safeText(state.data.promptRules.autoMappings?.colorByStyle?.[values.style] || fallback);
}

function resolveSelections(values) {
  return {
    pose: resolvePose(values),
    lighting: resolveLighting(values),
    color: resolveColorGrade(values)
  };
}

function resolveFaceBlock(values) {
  const rules = state.data.promptRules.locks?.face || {};
  const base =
    values.faceLock === "on"
      ? getRuleArray(rules.on)
      : getRuleArray(rules.off).concat(splitPromptText(values.faceModel));

  if (values.faceLock === "on") {
    return dedupePhrases(base);
  }

  return dedupePhrases([
    base,
    splitPromptText(values.expression),
    splitPromptText(values.eyeStyle),
    splitPromptText(values.makeup),
    splitPromptText(values.skinTone)
  ]);
}

function resolveHairBlock(values) {
  const rules = state.data.promptRules.locks?.hair || {};
  const base =
    values.hairLock === "on"
      ? getRuleArray(rules.on)
      : getRuleArray(rules.off);

  if (values.hairLock === "on") {
    return dedupePhrases(base);
  }

  return dedupePhrases([
    base,
    splitPromptText(values.hairStyle),
    splitPromptText(values.hairColor)
  ]);
}

function getStylePrompt(style) {
  const prompt = state.data.stylePrompts[style];
  if (Array.isArray(prompt)) return prompt;
  return splitPromptText(prompt);
}

function getWaAccessory() {
  const waAccessories = getRuleArray(state.data.promptRules.styleAccessories?.Wa);
  return waAccessories[0] || "";
}

function buildArtDirectionBlock(values) {
  const base = getRuleArray(state.data.promptRules.promptBlocks?.artDirection);
  const extras = [];
  const styleNote = getStyleNote(values.style);

  if (styleNote.guidance) {
    extras.push(safeText(styleNote.guidance));
  }

  return dedupePhrases([base, extras]);
}

function buildModelPresenceBlock(values) {
  return dedupePhrases([
    getRuleArray(state.data.promptRules.promptBlocks?.modelPresence),
    splitPromptText(values.vibe),
    splitPromptText(values.characterExtra)
  ]);
}

function buildStyleBlock(values) {
  const styleNote = getStyleNote(values.style);
  const block = [
    getStylePrompt(values.style),
    splitPromptText(values.subcategory),
    weightedPhrase("petticoat volume and bell-shaped skirt", values.silhouetteWeight),
    weightedPhrase("structured waistline", values.silhouetteWeight),
    weightedPhrase("readable lace frill and textile detail", values.fabricWeight),
    weightedPhrase("garment structure clarity", values.fabricWeight),
    "modest styling"
  ];

  if (styleNote.requiredPhrases) {
    block.push(getRuleArray(styleNote.requiredPhrases));
  }

  if (values.style === "Wa") {
    block.push(getWaAccessory());
  }

  return dedupePhrases(block);
}

function buildSceneBlock(values) {
  const scene = findOption(state.data.scenes, values.scene);
  const prompt = scene ? getOptionPrompt(scene) : ["supportive fashion backdrop"];

  return dedupePhrases([
    weightedPhrase(getOptionValue(scene) || "supportive fashion backdrop", values.sceneWeight),
    prompt,
    "environment preserved as supportive fashion backdrop",
    "outfit readability takes priority over the location"
  ]);
}

function buildCameraBlock(values) {
  return dedupePhrases([
    "fashion photography composition",
    splitPromptText(values.camera)
  ]);
}

function buildLightingBlock(resolvedLighting) {
  const lighting = findOption(state.data.lighting, resolvedLighting);

  return dedupePhrases([
    resolvedLighting,
    getOptionPrompt(lighting),
    "lighting enhances fabric visibility and lace readability"
  ]);
}

function buildColorBlock(resolvedColor) {
  const color = findOption(state.data.colors, resolvedColor);

  return dedupePhrases([
    resolvedColor,
    getOptionPrompt(color),
    "natural skin and black fabric texture preserved"
  ]);
}

function buildEditorialFinishBlock(values) {
  return dedupePhrases([
    getRuleArray(state.data.promptRules.promptBlocks?.editorialFinish),
    splitPromptText(values.mood)
  ]);
}

function buildPositivePrompt(values, resolved) {
  const aiLeadIn = {
    gpt: ["photorealistic fashion editorial image"],
    nano: ["cinematic fashion film frame"],
    sd: ["(masterpiece:1.2)", "(best quality:1.2)", "(photorealistic:1.1)"]
  };

  const blocks = [
    dedupePhrases([aiLeadIn[values.ai] || [], getRuleArray(state.data.promptRules.promptBlocks?.quality)]),
    getRuleArray(state.data.promptRules.promptBlocks?.magazineAuthority),
    buildArtDirectionBlock(values),
    buildModelPresenceBlock(values),
    [resolved.pose],
    buildStyleBlock(values),
    applyWeightBlock(resolveFaceBlock(values), values.characterWeight),
    applyWeightBlock(resolveHairBlock(values), values.characterWeight),
    buildSceneBlock(values),
    buildCameraBlock(values),
    buildLightingBlock(resolved.lighting),
    buildColorBlock(resolved.color),
    buildEditorialFinishBlock(values)
  ];

  return buildPromptText(blocks).trim();
}

function buildNegativePrompt(values) {
  const negativePresets = state.data.promptRules.negativePresets || {};
  const globalNegative = getRuleArray(negativePresets.global);
  const styleExtra = getRuleArray(negativePresets.styles?.[values.style]);
  const styleLegacy = getRuleArray(negativePresets.legacyStyles?.[values.style]);
  const userNegative = splitPromptText(values.userNegative);

  return dedupePhrases([
    globalNegative,
    styleExtra,
    styleLegacy,
    userNegative
  ]).join(", ");
}

function toggleConditionalFields(values = getUiValues()) {
  const lightingField = $("lightingManualField");
  const colorField = $("colorManualField");

  if (lightingField) {
    lightingField.hidden = values.lightingMode !== "manual";
  }

  if (colorField) {
    colorField.hidden = values.colorMode !== "manual";
  }
}

function setResolvedValue(id, value) {
  const el = $(id);
  if (!el) return;
  el.textContent = safeText(value) || "未設定";
}

function updateStyleDescription(style) {
  const el = $("styleDescription");
  if (!el) return;

  const description = safeText(getStyleNote(style).description);
  el.textContent = description || "スタイルを選ぶと説明が表示されます。";
}

function updateResolvedPreview(resolved) {
  setResolvedValue("resolvedPose", resolved.pose);
  setResolvedValue("resolvedLighting", resolved.lighting);
  setResolvedValue("resolvedColor", resolved.color);
}

function updateCharacterPreview(values = getUiValues()) {
  const previewEl = $("characterPreview");
  const chipsEl = $("previewChips");
  if (!previewEl || !chipsEl) return;

  const texts = [
    `顔固定 ${getSelectedText("faceLock") || values.faceLock.toUpperCase()}`,
    `髪固定 ${getSelectedText("hairLock") || values.hairLock.toUpperCase()}`,
    values.faceLock === "off" ? getSelectedText("faceModel") : "",
    values.hairLock === "off" ? getSelectedText("hairStyle") : "",
    values.hairLock === "off" ? getSelectedText("hairColor") : "",
    values.faceLock === "off" ? getSelectedText("expression") : "",
    values.faceLock === "off" ? getSelectedText("eyeStyle") : "",
    values.faceLock === "off" ? getSelectedText("makeup") : "",
    values.faceLock === "off" ? getSelectedText("skinTone") : "",
    getSelectedText("vibe")
  ].filter(Boolean);

  const extra = safeText(values.characterExtra);
  previewEl.textContent = texts.join(" / ") + (extra ? ` / ${extra}` : "");
  chipsEl.innerHTML = "";

  for (const text of texts) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = text;
    chipsEl.appendChild(chip);
  }

  if (extra) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = extra;
    chipsEl.appendChild(chip);
  }
}

function generatePrompt() {
  const values = getUiValues();
  const resolved = resolveSelections(values);

  state.resolved = resolved;

  toggleConditionalFields(values);
  updateResolvedPreview(resolved);
  updateStyleDescription(values.style);
  updateCharacterPreview(values);

  $("positive").value = buildPositivePrompt(values, resolved);
  $("negative").value = buildNegativePrompt(values);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("コピーしました");
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    alert("コピーしました");
  }
}

function copyPrompt() {
  const text =
    `Positive Prompt:\n${$("positive").value}\n\n` +
    `Negative Prompt:\n${$("negative").value}`;
  copyText(text);
}

function copyPositive() {
  copyText($("positive").value);
}

function copyNegative() {
  copyText($("negative").value);
}

function randomizeSelect(selectId, { skipEmpty = true } = {}) {
  const el = $(selectId);
  if (!el || !el.options.length) return;

  const options = Array.from(el.options);
  const candidates = skipEmpty
    ? options.filter((option) => option.value !== "")
    : options;

  if (!candidates.length) return;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  el.value = picked.value;
}

function applyRecommendedLocks() {
  setSelectValue("faceLock", getDefaults().faceLock || "on");
  setSelectValue("hairLock", getDefaults().hairLock || "on");
}

function randomLook() {
  randomizeSelect("ai");
  randomizeSelect("style");
  fillSubcategorySelect($("style")?.value || "");
  randomizeSelect("subcategory");
  randomizeSelect("scene");
  randomizeSelect("camera");
  randomizeSelect("pose", { skipEmpty: false });
  randomizeSelect("mood");

  if (Math.random() < 0.65) {
    setSelectValue("lighting", "auto");
  } else {
    setSelectValue("lighting", "manual");
    randomizeSelect("lightingManual");
  }

  if (Math.random() < 0.65) {
    setSelectValue("color", "auto");
  } else {
    setSelectValue("color", "manual");
    randomizeSelect("colorManual");
  }

  randomizeSelect("faceModel");
  randomizeSelect("hairStyle");
  randomizeSelect("hairColor");
  randomizeSelect("expression");
  randomizeSelect("eyeStyle");
  randomizeSelect("makeup");
  randomizeSelect("skinTone");
  randomizeSelect("vibe");

  applyRecommendedLocks();

  const extras = [
    "",
    "subtle wink",
    "soft catchlight in the eyes",
    "refined noble aura",
    "slightly dreamy expression",
    "calm elegant presence"
  ];
  $("characterExtra").value =
    extras[Math.floor(Math.random() * extras.length)];

  generatePrompt();
}

function randomCharacter() {
  randomizeSelect("faceModel");
  randomizeSelect("hairStyle");
  randomizeSelect("hairColor");
  randomizeSelect("expression");
  randomizeSelect("eyeStyle");
  randomizeSelect("makeup");
  randomizeSelect("skinTone");
  randomizeSelect("vibe");

  applyRecommendedLocks();

  const extras = [
    "",
    "subtle wink",
    "soft catchlight in the eyes",
    "quiet aristocratic mood",
    "slightly dreamy expression"
  ];
  $("characterExtra").value =
    extras[Math.floor(Math.random() * extras.length)];

  generatePrompt();
}

function bindEvents() {
  $("style")?.addEventListener("change", () => {
    fillSubcategorySelect($("style")?.value || "");
    generatePrompt();
  });

  [
    "ai",
    "subcategory",
    "scene",
    "lighting",
    "lightingManual",
    "color",
    "colorManual",
    "mood",
    "camera",
    "pose",
    "faceLock",
    "hairLock",
    "faceModel",
    "hairStyle",
    "hairColor",
    "expression",
    "eyeStyle",
    "makeup",
    "skinTone",
    "vibe"
  ].forEach((id) => {
    $(id)?.addEventListener("change", generatePrompt);
  });

  $("characterExtra")?.addEventListener("input", generatePrompt);

  [
    "silhouetteWeight",
    "fabricWeight",
    "sceneWeight",
    "characterWeight"
  ].forEach((id) => {
    $(id)?.addEventListener("input", generatePrompt);
  });

  $("generateBtn")?.addEventListener("click", generatePrompt);
  $("randomLookBtn")?.addEventListener("click", randomLook);
  $("randomCharacterBtn")?.addEventListener("click", randomCharacter);

  $("copyPromptBtn")?.addEventListener("click", copyPrompt);
  $("copyPositiveBtn")?.addEventListener("click", copyPositive);
  $("copyNegativeBtn")?.addEventListener("click", copyNegative);
}

function applyDefaults() {
  const defaults = getDefaults();

  setSelectValue("pose", defaults.pose || "auto");
  setSelectValue("lighting", defaults.lightingMode || "auto");
  setSelectValue("color", defaults.colorMode || "auto");
  setSelectValue("faceLock", defaults.faceLock || "on");
  setSelectValue("hairLock", defaults.hairLock || "on");
}

async function init() {
  try {
    await loadAllData();

    fillSelect("ai", state.data.ai);
    fillSelect("style", state.data.styles, { placeholder: "選択してください" });
    fillSelect("scene", state.data.scenes);
    fillSelect("camera", state.data.camera);
    fillSelect("pose", state.data.poses);
    fillSelect("lighting", getRuleArray(state.data.promptRules.uiOptions?.lightingModes));
    fillSelect("lightingManual", state.data.lighting);
    fillSelect("color", getRuleArray(state.data.promptRules.uiOptions?.colorModes));
    fillSelect("colorManual", state.data.colors);
    fillSelect("mood", state.data.moods);
    fillSelect("faceLock", getRuleArray(state.data.promptRules.uiOptions?.lockModes));
    fillSelect("hairLock", getRuleArray(state.data.promptRules.uiOptions?.lockModes));

    fillSelect("faceModel", state.data.character.faceModels);
    fillSelect("hairStyle", state.data.character.hairStyles);
    fillSelect("hairColor", state.data.character.hairColors);
    fillSelect("expression", state.data.character.expressions);
    fillSelect("eyeStyle", state.data.character.eyeStyles);
    fillSelect("makeup", state.data.character.makeup);
    fillSelect("skinTone", state.data.character.skinTones);
    fillSelect("vibe", state.data.character.vibes);

    fillSubcategorySelect($("style")?.value || "");
    applyDefaults();

    bindRange("silhouetteWeight", "silhouetteWeightValue");
    bindRange("fabricWeight", "fabricWeightValue");
    bindRange("sceneWeight", "sceneWeightValue");
    bindRange("characterWeight", "characterWeightValue");

    bindEvents();
    generatePrompt();
  } catch (error) {
    console.error(error);

    const positive = $("positive");
    const negative = $("negative");

    if (positive) {
      positive.value =
        "Initialization failed. Check JSON paths and local server setup.";
    }
    if (negative) {
      negative.value = String(error.message || error);
    }

    const preview = $("characterPreview");
    if (preview) {
      preview.textContent = "初期化に失敗しました。JSONのパスやローカルサーバー設定を確認してください。";
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
