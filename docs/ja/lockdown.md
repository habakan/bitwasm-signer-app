# Signer Lockdown

<sup>[English](../lockdown.md)</sup>

Signer Lockdown（`lockdown/`）は、Android 端末を署名専用機にするアプリです。Device Owner として動き、中に同梱した署名アプリを入れたうえで、署名に要らない機能を Android 自身に禁止させます。PC は Lockdown を端末に渡すだけなので、信頼しなければならない PC 側のコードは少なくて済みます。

Android 10 の端末で確認しています。

## 禁止するもの

- 機内モードはオンのまま。Bluetooth・Wi-Fi・テザリング・モバイルネットワーク・位置情報の設定は変えられない
- アカウントとユーザーの追加、提供元不明のアプリのインストール、設定画面でのアプリの有効・無効の切り替え、セーフモード、USB ファイル転送、USB デバッグ
- ユーザー補助と IME は端末に最初から入っているものだけ
- 署名アプリはアンインストールできない（端末に保存した seed を誤って消さないため）
- `lockdown/profiles/hide.txt` に挙げたアプリのうち、端末にあるものを隠す（Google・AOSP・MediaTek のよくあるアプリ）
- 選べば、保存済み Wi-Fi を消す

一時解除と Device Owner の解除は、画面ロックの認証が要ります。一時解除しても、制限を掛けた時点で Android がオフにしたもの（USB デバッグ、他アプリのインストール許可、音声入力 IME）はオンに戻りません。

## QR で導入する

リリースには `signer-lockdown-<version>.apk`（署名アプリ同梱）と `provisioning-<version>.png` が付きます。端末がネットワークにつながるのは Lockdown をダウンロードする間だけで、まだ鍵は入っていません。PC は QR を表示するのに使うだけです。

1. 端末を工場出荷リセットする。Device Owner はアカウントが1つもない端末にしか設定できない
2. ようこそ画面の同じ場所を6回タップする。QR の読み取り画面が開く
3. Wi-Fi につなぎ、`provisioning-<version>.png` を読む。端末はリリースから Lockdown をダウンロードし、QR に入っている SHA-256 と照合する。「This device belongs to your organization」の organization は Lockdown のこと。Next で進む
4. 画面ロックを設定する。Google アカウントは追加せず、Google Services の画面のスイッチはすべてオフにする
5. Signer Lockdown を開き「署名アプリを入れる」
6. 機内モードをオンにして「制限を適用」。手順3の Wi-Fi は、チェックを外さなければ消える

Android 12 以降は、Lockdown にまだない2つの画面（`GET_PROVISIONING_MODE` / `ADMIN_POLICY_COMPLIANCE`）が要ります。

## ネットワークを使わずに導入する

端末を一度もネットワークにつなぎたくない場合です。Wi-Fi の代わりに、PC から USB で APK を渡します。

上の手順1と4と同じように端末を準備し、開発者向けオプションを出して（端末情報のビルド番号を7回タップ）、USB デバッグをオンにします。

続けて PC の Chrome か Edge で:

1. リリースから `signer-lockdown-<version>.apk` をダウンロードする
2. [導入ページ](https://habakan.github.io/bitwasm-signer-app/install/)を開き、APK と同じリリースの `SHA256SUMS` を選ぶ。ページが照合し、一致したときだけ入れられる
3. 端末をつなぎ、ブラウザのダイアログで端末を選び、端末で USB デバッグを許可する。PC で adb が動いていると USB を取り合うので、先に止める（`adb kill-server`）
4. ページが Lockdown を入れて Device Owner にする。上の手順5から続ける。制限を適用すると USB デバッグは止まる

このページ（`installer/`）はこのリポジトリから、版を固定した [ya-webadb](https://github.com/yume-chan/ya-webadb)（MIT）でビルドしていて、WebUSB で端末と話します。つないでいる間は端末に対して adb のすべての操作ができるので、Lockdown の設定が済んだら閉じてください。

オフラインの PC で使うときは、一度オンラインでページを開き、ブラウザのアドレスバーからアプリとしてインストールしてください（Chrome か Edge）。インストールしたアプリはネットワークなしで開けます。どの版がキャッシュされているかは、上部のバーのビルド ID で確認できます。

Lockdown なしで APK だけを入れるとき（署名アプリだけを使う場合など）は、ページ上部で「APK だけ入れる」を選んでください（URL の末尾に `#apk` を付けて開いても同じです）。APK を入れるだけで、Device Owner は設定しません。

Android の platform-tools が入っていれば、`lockdown/install.sh <bitwasm-signer.apk> <signer-lockdown.apk>` でも同じことができます。各手順の前に確認を求めます。

## PC もネットワークも使わずに更新する

制限を掛けたまま、microSD か USB メモリに置いた APK で署名アプリと Lockdown を更新できます。

1. リリースの APK をカードに写す
2. Lockdown の「SD カードからアプリを更新」で APK を選ぶ
3. 表示された版と SHA-256 をリリースページの `SHA256SUMS` と照合して「更新」

受け付けるのは署名アプリと Lockdown のパッケージだけです。署名鍵が違う APK と古い版は Android が拒みます（別の鍵で署名し直した APK が拒まれることを確認済み）。Lockdown は期待するハッシュを持たないので、署名アプリのリリースのたびに Lockdown を更新する必要はありません。

## PC から確かめる

`lockdown/audit.sh` は adb で端末の状態を読むだけで、何も変えません。ブートと OS の健全性、無線、プロファイルに対して有効なアプリ、強い権限を持つアプリ、アカウント、バックアップ、ロック画面を見ます。USB デバッグが要るので、制限を掛ける前か一時解除した後に使います。

## 開発

- `lockdown/provision.sh <bitwasm-signer.apk>` は debug の Lockdown をビルドし、QR を表示して APK を LAN に配信する。リリース workflow はリリースの URL を渡して同じスクリプトを使う
- ビルドには JDK 25 と Android SDK が要る（`cd lockdown && ./gradlew assembleDebug`）
- メーカー独自のアプリは `lockdown/profiles/hide.txt` に足す。署名アプリの画面を描く `com.google.android.webview` は残す
