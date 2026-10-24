# デザイン

<sup>[English](../design.md)</sup>

アプリの見た目は `design/tokens.json` と `src/design/icons.ts` で決まります。画面のコードとスタイルは、ここで決めた名前だけを参照します。

## 色・文字・余白を変える

`design/tokens.json` の値を書き換えて `pnpm tokens` を実行します。次の3つのファイルが作り直され、ブラウザの画面、Android、iOSの画面が同じ値を使います。生成されたファイルは直接書き換えないでください。

- `src/design/tokens.css`
- `src-tauri/plugins/signer/android/.../DesignTokens.kt`
- `src-tauri/plugins/signer/ios/Sources/DesignTokens.swift`

たとえば画面の背景は `surface`、カードの輪郭は `line`、タイルのアイコンの丸は `icon-well` です。

- 文字の色と背景の組み合わせは、コントラスト比4.5:1以上を保ってください。アイコンと枠線は3:1以上です。
- 状態(安全・警告・危険)は、色だけでなくアイコンと言葉でも伝えます。色を変えても区別がつくか確かめてください。
- アプリはオフラインで使うため、ネットからフォントを読み込みません。`css` の `font-sans` と `font-mono` には端末に入っている書体を並べます。

## ライトテーマとダークテーマ

`tokens.json` の `color.light` と `color.dark` に、同じ名前の色をそれぞれ書きます。片方にしかない色があると `pnpm tokens` が止まります。どちらを使うかは設定の「表示」で選び、「端末に合わせる」では端末のダークモードに従います。選んだテーマはAndroidとiOSの画面にも伝わります(`src/design/theme.ts`)。

## アイコンを変える

`src/design/icons.ts` の `icons` に、24×24の格子で描いたSVGのパスを書きます。線は `currentColor` で描かれるので、色は `tokens.json` の側で決まります。同じ名前のパスを差し替えると、そのアイコンを使うすべての画面が変わります。

## 言葉を変える

画面の文言は `src/views.ts` と `src/main.ts` の `tr("日本語", "English")`、Androidの画面は `Design.tr` にあります。日本語で画面を作り、英語でも収まるか確かめてください。

## 確かめ方

`pnpm dev` を起動し、`?ui-preview=home`、`ready`、`settings`、`restrictions` を付けて開くと、端末なしで各画面を表示できます。言語はブラウザの言語設定に従います。

ネイティブの画面の部品は、Androidは `Design.kt`、iOSは `Design.swift` にあります。どちらも `DesignTokens` の値と、Webビューで選んだテーマを使います。取り消しやエラーのメッセージの日本語は、それぞれの `messages` の表にあります。
