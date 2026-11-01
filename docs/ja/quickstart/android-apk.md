# Android(WebUSB build)

<sup>[English](../../quickstart/android-apk.md)</sup>

このパターンで信頼するのは、作者のリリース、導入ページ、PCです。失う利便性として、機能制限を「必須」にした項目は、オフにするまで鍵を読み込めません。署名用のスマホは一度もネットにつなぎません。

## 1. USBデバッグをオンにする {#android-apk-debug}

スマホで開発者向けオプションを出し(端末情報のビルド番号を7回タップ)、USBデバッグをオンにします。

<Shot name="android-devopts" />

## 2. 導入ページでAPKを入れる {#android-apk-install}

PCで[リリース](https://github.com/bitwasm-project/bit-hanko/releases)からAPKと`SHA256SUMS`をダウンロードし、[導入ページ](https://bitwasm-project.github.io/bit-hanko/install/#apk)を「APK だけ入れる」で開いて両方を選びます。一致したときだけ入れられます。入れ終わったらUSBデバッグをオフにし、機内モードにします。

<Shot name="installer" wide />

## 3. 端末の機能制限を「必須」にする {#android-apk-restrictions}

署名アプリの 設定 › 端末の機能制限 で、ネットワーク、Bluetooth・NFC、サードパーティ製キーボード、USBデバッグ、ユーザー補助を「必須」にします。

<Shot name="android-restrictions" />

## 4. 鍵を保存する {#android-apk-storage}

画面ロックを設定し、鍵を保存します(Android Keystore。Googleアカウントは不要)。パスフレーズは標準キーボードで入力してください。

<Shot name="android-storage" />
