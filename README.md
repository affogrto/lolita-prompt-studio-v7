# Lolita Prompt Studio V7

日本語UIで選択し、英語の画像生成用 Prompt を作る静的Webアプリです。  
GitHub Pages でそのまま公開できます。

## 特徴
- 日本語UI → 英語Prompt生成
- Gothic Lolita風ダークUI
- Character Builder搭載
- Weight Slider搭載
- Random Look / Random Character
- GitHub Pages対応
- iPhone Safariでも使いやすいレスポンシブ設計

## ファイル構成
- index.html
- style.css
- app.js
- data/*.json

## ローカル確認方法
`fetch()` で JSON を読むため、HTMLファイルを直接開くのではなくローカルサーバーで確認してください。

### 例
python -m http.server 8000

ブラウザで以下を開きます。
(https://affogrto.github.io/lolita-prompt-studio-v7/)

## GitHub Pages 公開手順
1. GitHub に新規リポジトリを作成
2. ファイル一式を push
3. GitHub の Settings → Pages を開く
4. Source を "Deploy from a branch" に設定
5. Branch は `main`、Folder は `/ (root)` を選択
6. 公開URLで動作確認

## データ追加方法
`data/*.json` を編集してください。

- UI表示は `jp`
- Prompt生成は `en`

例:
{ "jp": "ゴシックロリータ", "en": "Gothic" }

## iPhone Safari での使い方
1. 公開URLを Safari で開く
2. 共有メニューから「ホーム画面に追加」
3. アプリのように起動可能

## 仕様
- UI文言はすべて日本語
- Positive Prompt / Negative Prompt は英語
- Character Preview は日本語表示
