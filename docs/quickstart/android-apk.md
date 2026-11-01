# Android, easy

<sup>[日本語](../ja/quickstart/android-apk.md)</sup>

Trusts the author's release, the installer page and your PC. Costs being unable to load a key while a "Require" item is on. The signing phone never goes online.

## 1. Turn on USB debugging {#android-apk-debug}

On the phone, show Developer options (tap Build number in About phone seven times) and turn on USB debugging.

<Shot name="android-devopts" />

## 2. Install the APK with the installer page {#android-apk-install}

On the PC, download the APK and `SHA256SUMS` from the [releases](https://github.com/bitwasm-project/bit-hanko/releases), open the [installer page](https://bitwasm-project.github.io/bit-hanko/install/#apk) with "Install an APK only" and pick both. It installs only if they match. Then turn off USB debugging and turn on airplane mode.

<Shot name="installer" wide />

## 3. Set device restrictions to "Require" {#android-apk-restrictions}

In the signer, under Settings › Device restrictions, set network, Bluetooth and NFC, third-party keyboards, USB debugging and accessibility services to "Require".

<Shot name="android-restrictions" />

## 4. Save the key {#android-apk-storage}

Set a screen lock and save the key (Android Keystore, no Google account). Type the passphrase on the built-in keyboard.

<Shot name="android-storage" />
