# Setup

<sup>[日本語](ja/setup.md)</sup>

There are several ways to install the signer. Which one to pick depends on what you are willing to trust. The less you trust, the more work it takes.

## Choosing

| Way | What you trust | Does the signing phone go online | Platforms |
| --- | --- | --- | --- |
| [Build it yourself](#build) | The source (you can read it) and your build tools | No | Android, iOS |
| [Install the release APK over USB](#release-usb) | The GitHub release, the installer page and your PC | No | Android |
| [Install Lockdown over USB](#lockdown-usb) | The GitHub release, the installer page and your PC | No | Android |
| [Install Lockdown with the QR code](#lockdown-qr) | The GitHub release | On Wi-Fi only during setup, before any key is on it | Android |

Whichever way you choose, the app checks the SHA-256 of the WASM modules it loads and does not run if they differ.

## What you end up trusting {#trust}

- **The GitHub release**: release APKs are signed with the author's key, and each release comes with a `SHA256SUMS` file. `SHA256SUMS` shows that the download is intact, but cannot catch a release that was replaced as a whole. Once installed, Android only accepts updates signed with the same key.
- **The installer page**: the [installer page](https://habakan.github.io/bitwasm-signer-app/install/) writes to the phone over WebUSB from Chrome or Edge. While connected it can do anything adb can do to the phone. The page is built from this repository.
- **Your PC**: the USB ways also trust your PC and its browser. With the QR code, the PC only shows the QR code.
- **Your build tools**: building it yourself trusts Rust, the Android SDK or Xcode, and the npm dependencies.

## Build it yourself {#build}

For when you would rather not trust the release. Read the source, build it on your own PC and install it.

- Android: build the APK as described under [Build](https://github.com/habakan/bitwasm-signer-app#build) in the README, then install it with `adb install` or with "Install an APK only" on the installer page. Debug builds are very slow on a phone, so use a release build.
- iOS: there is no distribution yet, so sign and install it from Xcode with your own developer account. iOS has only been tried in the Simulator.

An APK you build yourself is signed with a different key from the author's release, so it cannot update a release install.

## Install the release APK over USB {#release-usb}

Installs just the APK, without the signing phone ever going online.

1. On the phone, show the developer options (tap the build number in About phone seven times) and turn on USB debugging
2. On the PC, download the APK and `SHA256SUMS` from the [releases](https://github.com/habakan/bitwasm-signer-app/releases)
3. Open the [installer page](https://habakan.github.io/bitwasm-signer-app/install/#apk) in "Install an APK only" mode and pick the APK and `SHA256SUMS`. It installs only when they match
4. When done, turn USB debugging off and turn on airplane mode

## Install Signer Lockdown {#lockdown}

On Android, [Signer Lockdown](lockdown.md) makes a factory-reset phone a dedicated signer. It keeps airplane mode on and blocks USB debugging, new apps and accounts. The signer comes inside Lockdown.

### Over USB {#lockdown-usb}

The phone never goes online. Use the installer page as above to install Lockdown and make it the Device Owner. See [Set up without a network](lockdown.md#set-up-without-a-network) for the steps.

### With the QR code {#lockdown-qr}

The PC only shows the QR code. The phone is on Wi-Fi only while it downloads Lockdown, and checks it against the SHA-256 in the QR code. See [Set up with the QR code](lockdown.md#set-up-with-the-qr-code) for the steps.

## After installing {#after}

- Turn on airplane mode and keep the phone off every network (Lockdown keeps it on for you).
- In the signer, Settings › Device restrictions lets you choose what happens while networks, third-party keyboards and the like are on.
- On a phone with Lockdown, `lockdown/audit.sh` checks its state from a PC, before the restrictions are applied or while they are paused.
