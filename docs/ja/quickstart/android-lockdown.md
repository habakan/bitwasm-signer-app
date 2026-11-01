# Android(lockdown build)

<sup>[English](../../quickstart/android-lockdown.md)</sup>

このパターンで信頼するのは、作者のリリース(USBで入れるなら導入ページとPCも)です。失う利便性として、端末をほかの用途に使えません。詳しい手順は[Signer Lockdown](../lockdown.md)にあります。

## 1. 工場出荷リセットする {#android-lockdown-reset}

アカウントは1つも追加しません。Device Ownerはアカウントのない端末にしか設定できません。

## 2. Lockdownを入れる {#android-lockdown-install}

- QR: ようこそ画面の同じ場所を6回タップし、Wi-Fiにつないでリリースの`provisioning-<version>.png`を読みます。PCは画像を表示するだけで、中身はリリースが決めます([QRで導入する](../lockdown.md#qr-で導入する))
- USB: 一度もネットにつなぎません。先に画面ロックを設定してUSBデバッグをオンにし、PCの導入ページで Lockdown のAPKと`SHA256SUMS`を選んで入れます([ネットワークを使わずに導入する](../lockdown.md#ネットワークを使わずに導入する))

## 3. 制限を適用する {#android-lockdown-apply}

画面ロックを設定します。Googleアカウントは追加せず、Google Servicesの画面のスイッチはすべてオフにします。Signer Lockdown を開いて「署名アプリを入れる」、機内モードをオンにして「制限を適用」を押します。

<div class="shots">
<Shot name="lockdown-status" caption="署名アプリを入れたあとの状態" />
<Shot name="lockdown-apply" caption="機内モードにしてから「制限を適用」" />
</div>

## 4. 鍵を保存して使う {#android-lockdown-use}

鍵を保存します(Android Keystore)。必要なら 設定 › 端末の機能制限 も「必須」にします。更新は、SDカードか、Lockdownの「PC から USB でアプリを更新」で行い、`SHA256SUMS`と照合します。状態を確かめたいときは、制限を一時解除して PC から`lockdown/audit.sh`を実行します。

<Shot name="android-storage" />
