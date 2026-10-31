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
| [Add the web app to the home screen](#pwa) | GitHub Pages at the time you add it | Only during setup, before any key is on it | iOS, Android |
| [Add the web app from your own Pages](#pwa-fork) | The source at the commit you choose, and your GitHub account | Only during setup, before any key is on it | iOS, Android |

The APK and the iOS app check the SHA-256 of the WASM modules they load and do not run if they differ. In the web app the checking code comes from the site too, so the check cannot catch a replaced site.

## What you end up trusting {#trust}

- **The GitHub release**: release APKs are signed with the author's key, and each release comes with a `SHA256SUMS` file. `SHA256SUMS` shows that the download is intact, but cannot catch a release that was replaced as a whole. Once installed, Android only accepts updates signed with the same key.
- **The installer page**: the [installer page](https://habakan.github.io/bitwasm-signer-app/install/) writes to the phone over WebUSB from Chrome or Edge. While connected it can do anything adb can do to the phone. The page is built from this repository.
- **Your PC**: the USB ways also trust your PC and its browser. With the QR code, the PC only shows the QR code.
- **GitHub Pages**: the web app takes all its files from the site the first time it is opened from the home screen, then runs offline. You trust what the site served at that moment. After that it runs only that build, but going online lets a new build arrive, which takes over when you go to the home screen and open the app again. A compromised site cannot be stopped this way, so keep the phone offline once it is installed. Settings › This build shows the running build. Built by GitHub Actions, the same commit gives the same build name, so you can compare it with "Web app build" in the release notes. A build on another kind of machine, such as a Mac, does not match.
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

## Add the web app to the home screen {#pwa}

The same signing engine, running in the browser. On an iPhone it is the only way in that needs no signing of your own.

1. On the phone, before any key is on it, open the [web app](https://habakan.github.io/bitwasm-signer-app/app/) in Safari (iPhone) or Chrome (Android)
2. Add it with Add to Home Screen in the share menu or menu, and open it from the home screen
3. Keep it open and online until "Getting ready for offline use" goes away. On an iPhone it takes the files again when first opened from the home screen
4. Turn on airplane mode. While any network is on, it does not load a key and wipes a loaded one

It differs from the native apps:

- Recovery words are typed on the app's own keys, as in the native apps, so they never pass through the keyboard. The passphrase is typed on the keyboard, and third-party keyboards cannot be blocked, so use the keyboard that came with the phone.
- Keys can be saved once Settings › Key storage is on. They are encrypted with this app's passkey, and opening one asks for Face ID, a fingerprint or the device passcode. Anyone who knows the device passcode can open them, and browser data can be cleared, so the paper backup stays essential.
- Saving keys on iPhone needs iOS 18 or later; earlier Safari lacks the passkey feature (PRF) that encrypts them. Creating the passkey needs an Apple Account with iCloud Keychain sync on. Opening saved keys needs it too: after signing out, they cannot be opened, even with a copy of the keychain kept on the iPhone. The passkey syncs to that account's devices. The encrypted keys stay in this device's browser, so the passkey alone on another device cannot open them, but the signing iPhone has to be signed in to the account. To avoid that, keep keys in memory only.
- Saved keys belong to the home screen app that saved them. On iPhone, adding the app to the home screen again makes a separate app that shares no data, and it cannot see the earlier app's keys. Removing the earlier app from the home screen removes its keys too. You do not need to add it again to get a new build.
- Saving keys is mainly for iPhone. Passkeys on Android normally need a Google account, which Signer Lockdown, blocking new accounts, rules out. On Android, use the native app: it saves keys in the Android Keystore behind the screen lock, with no Google account.
- It knows whether the phone is online only as far as the browser tells it.
- It cannot block screenshots or screen recording. Leaving the app covers and reloads it, but whether the app switcher keeps a snapshot is up to the browser.
- Before opening it, check that the URL is `habakan.github.io/bitwasm-signer-app/app/`, so you do not install a copy from another site.

It has not been tried on a real iPhone yet, only in the Simulator and in desktop Chrome.

### From your own Pages {#pwa-fork}

Instead of trusting this site, build the same app with your own GitHub account and add it from there. If this site or repository is compromised later, the build you added is not affected.

1. Fork this repository. To add a particular version, make its tag or commit the fork's main
2. In the fork's Actions tab, enable workflows (they start disabled in a fork)
3. In the fork's Settings › Pages, set Source to "GitHub Actions"
4. Under Actions › Pages, Run workflow once. When it finishes, the run summary shows "web app build"
5. Add `https://<your username>.github.io/bitwasm-signer-app/app/` to the home screen, as in the steps above
6. Check that Settings › This build matches the name from step 4, and "Web app build" in the release notes for the same commit

You can delete the fork once it is added: the home screen app runs from the files it took. If you keep the fork, note that it shares an origin with your other pages under github.io.

## After installing {#after}

- Turn on airplane mode and keep the phone off every network (Lockdown keeps it on for you).
- In the signer, Settings › Device restrictions lets you choose what happens while networks, third-party keyboards and the like are on.
- On a phone with Lockdown, `lockdown/audit.sh` checks its state from a PC, before the restrictions are applied or while they are paused.
