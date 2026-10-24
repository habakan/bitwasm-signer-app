# bitwasm-signer-app

<sup>[日本語](docs/ja/README.md)</sup>

An Android / iOS signing app built on the `bitwasm-signer` parser and signer WASM modules. By default the app keeps no key: it loads the key for each signing and erases it when you are done.

**[Try the testnet demo in your browser](https://habakan.github.io/bitwasm-signer-app/)**

> **Warning:** This is experimental software. It has not been audited and comes with no warranty. The author is not responsible for lost funds or any other damage from using it. Keep amounts small.

## Screenshots

Android (A80, Android 10) and the iOS Simulator, on testnet with the public BIP39 test mnemonic.

<p align="center">
<img src="docs/images/android.png" width="260" alt="Android: reviewing a transaction">&nbsp;&nbsp;
<img src="docs/images/ios.png" width="229" alt="iOS: home">
</p>

## What it does on Android / iOS

- Loads a SeedQR / CompactSeedQR, with an optional BIP39 passphrase, or a 64 byte seed, and derives keys on the device
- Loads BIP39 English words (12 to 24) typed one at a time on an in-app keypad, with an optional passphrase. Letters that lead to no word cannot be pressed, and the last word only offers candidates that fit the checksum
- Creates a mnemonic from SecureRandom or dice and shows it as a Standard / Compact SeedQR
- A new mnemonic can be loaded as the signing key once it passes a five-question, four-choice backup check
- Derives BIP85 child mnemonics
- Receives an animated UR `crypto-psbt` with the camera
- Parses it with parser.wasm and shows signer.wasm's review on a native screen
- Signs after explicit approval and shows the signed PSBT as an animated UR
- Shows the account public keys as an animated UR `crypto-account` (BIP49 / BIP84 / BIP86 / BIP48), readable by Sparrow / Nunchuk / Keystone style wallets
- Shows BIP48 / BIP49 / BIP84 / BIP86 account xpubs and descriptors as QR codes
- Registers a P2WSH multisig (up to 3 keys) from a descriptor / BSMS / Coldcard QR (`ur:bytes` too). The key list and the first receive address are shown before registering. Afterwards change is shown as change, and inputs from other wallets are not signed. It can be exported as `crypto-output`, and in save mode it is restored together with the seed
- Address ownership checks and BIP137 message signing
- Erases the signing key on Lock, or when the app goes to the background
- With "Save on this device" in Settings, 12 / 24 word seeds can be kept on the device (memory only by default)

Mnemonics, SeedQRs, raw seeds and passphrases are never returned to the WebView.

## Saving on the device

Only the BIP39 entropy is stored (16 / 32 bytes, the same as a CompactSeedQR). The passphrase is not stored; the master fingerprint after applying it is. At unlock you enter the passphrase, and the seed is not loaded unless the fingerprint matches. 64 byte raw seeds and 15 / 18 / 21 word seeds cannot be saved.

| | Android | iOS |
| --- | --- | --- |
| Encryption | A Keystore AES-256-GCM key per seed (StrongBox when available; nothing is saved with a key outside the TEE or StrongBox; unusable while the screen is locked) | ECIES with a Secure Enclave P-256 key per seed (X9.63 SHA-256, AES-GCM) |
| Authentication | Biometrics or the screen lock on every use (15 seconds after authenticating on Android 10 and earlier) | Face ID / Touch ID or the passcode (`.userPresence`) |
| Location | `noBackupFilesDir/vault.json` (`allowBackup="false"`) | Keychain (`WhenPasscodeSetThisDeviceOnly`) |

Save mode cannot be chosen on a device without a screen lock (passcode). Deleting and erasing all also need device authentication. Save mode cannot be turned off while saved seeds remain. On iOS the app switcher snapshot and the screen during recording are covered in black; iOS itself cannot block screenshots. Input, review, showing secrets, key derivation and signing happen in the native layer. Public account data, signed PSBTs and message signatures are shown on native screens.

Keyboard learning and autofill are covered in [docs/faq.md](docs/faq.md).

## WASM

The WASM modules ship in `src-tauri/plugins/signer/android/src/main/assets/` and their SHA-256 is checked when they load.

| Module | SHA-256 |
| --- | --- |
| parser.wasm | `9407abe3a65a56ebcfcab6da3b685f4e21ce9f6a60b3feddd299ddc0def89bab` |
| signer.wasm | `f1ec4d091292d83f44cd479219914e1b2f080c930867e8086d731bf76deb979c` |
| checker.wasm | `7df36b4c3bfb2bec1826fb2a740e9f1ddd8281cb5530a878dc790ebfd7e63e37` |

checker.wasm is a separate model of the review, written independently of signer.wasm. After signer.wasm's review passes, checker.wasm decides the same plan from the previous transactions and signer.wasm's `signer_facts()`. The review screen is shown only when both agree on the totals, the fee, the inputs to sign, the owner of each output, and each output's amount and address (or OP_RETURN / script hex) as shown on screen. Otherwise nothing is signed.

On Android, Rust's Wasmi runs through JNI. On iOS, the Swift plugin calls the Rust Wasmi host. The minimum Android API is 26.

## Build

Install Android Studio, the Android SDK / NDK, JDK 25, and the Rust `aarch64-linux-android` and `armv7-linux-androideabi` targets.

```sh
pnpm install
pnpm build
JAVA_HOME=/path/to/jdk ANDROID_HOME=/path/to/android-sdk NDK_HOME=/path/to/ndk pnpm tauri android build --debug --target aarch64 armv7 --apk --ci
```

The output is `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`.

### Use release builds on devices

A debug build compiles the Rust side that runs the WASM (Wasmi) without optimization, so it is extremely slow on a device. On an A80 (ARMv7), loading a mnemonic (PBKDF2) took about 90 seconds in a debug build and about 3 seconds in a release build. Test with release builds.

If `src-tauri/gen/android/keystore.properties` exists (`storeFile` / `storePassword` / `keyAlias` / `keyPassword`; never commit it), release builds are signed with that key. Otherwise build an unsigned APK and sign it afterwards. The example below signs with the debug key, the same key as debug builds, so it installs over them and keeps the app's data. Do not use it for distribution.

```sh
JAVA_HOME=/path/to/jdk ANDROID_HOME=/path/to/android-sdk NDK_HOME=/path/to/ndk pnpm tauri android build --target armv7 --apk --ci
BT=$ANDROID_HOME/build-tools/<version>
$BT/zipalign -f -p 4 src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk aligned.apk
$BT/apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --key-pass pass:android \
  --ks-key-alias androiddebugkey --out bitwasm-signer-release.apk aligned.apk
adb install -r bitwasm-signer-release.apk
```

Match `--target` to the device's ABI (`adb shell getprop ro.product.cpu.abilist`; `arm64-v8a` means `aarch64`).

### Distributing the APK

Pushing a `v<version in tauri.conf.json>` tag makes GitHub Actions attach a universal APK (aarch64 / armv7) signed with the release key and a `SHA256SUMS` file to a draft release. Register these repository secrets first.

| Secret | Contents |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | The release keystore in base64 |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password |
| `ANDROID_KEY_ALIAS` | The key alias |
| `ANDROID_KEY_PASSWORD` | The key password |

With a different release key the app cannot be installed over the old one, and uninstalling it also erases the seeds saved on the device. Back up the keystore outside the repository.

## Browser demo

Try it at https://habakan.github.io/bitwasm-signer-app/ (deployed from `main` by GitHub Actions).

The same engine as iOS (`wasmi_host.rs`) is built for wasm32 and runs inside the page. It is testnet only, and the key is limited to the BIP39 test words (`abandon` eleven times and `about`). Words and SeedQRs cannot be entered. It runs on a device that is online, so never use it with real keys or funds.

```sh
pnpm dev:web     # open http://localhost:1420
pnpm build:web   # writes to dist-web
```

To try signing, scan a QR from a wallet app with the camera, or use the test transaction from `samples/psbt-ur-test-only.png`. The camera only works on localhost or HTTPS pages.

## Current scope

Building the Android ARMv7 APK, launching on an A80, reading SeedQRs and reviewing PSBTs have been checked. A full round trip of a signed PSBT has not. The Swift plugin and the Wasmi host are implemented for iOS. Native hosts for Windows / macOS / Linux are not.

Plans are in [docs/roadmap.md](docs/roadmap.md).
