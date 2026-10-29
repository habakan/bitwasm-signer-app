# FAQ

<sup>[日本語](ja/faq.md)</sup>

## Keyboards and autofill

### Does the keyboard learn my passphrase or mnemonic?

The app asks the keyboard not to learn. On Android this is a request to the keyboard, and it is up to the keyboard to honor it.

| Input | Android | iOS |
| --- | --- | --- |
| Mnemonic | Typed on an in-app keypad, never the system keyboard | Same |
| Passphrase | Password input, no suggestions, `IME_FLAG_NO_PERSONALIZED_LEARNING` | Secure text entry (`isSecureTextEntry`), no autocorrection |
| Dice rolls | Tapped on die-face buttons in the app, never the system keyboard | Same |

With Gboard on Android 10, the passphrase input passes these flags to the keyboard and Gboard switches to incognito mode. iOS has not been checked on a device.

### Are they saved by a password manager or autofill?

On Android the passphrase input is `IMPORTANT_FOR_AUTOFILL_NO`, so Google autofill and autofill services such as 1Password skip them, and no save prompt appears.

On iOS the password save prompt appears when an app has Associated Domains. This app has none, so it should not appear (not checked on a device).

### Can I use a third-party keyboard?

On iOS the app blocks third-party keyboards everywhere. tao (Tauri's window layer) does not implement `application(_:shouldAllowExtensionPointIdentifier:)` on its AppDelegate, so the plugin adds it at runtime when it loads. For the secure passphrase field, iOS switches to the system keyboard even without this.

On Android an app cannot restrict the keyboard. Use the keyboard that came with the device (such as Gboard).

### What if it may already have been learned?

- Android (Gboard): Settings › Privacy › turn off "Personalize Gboard", then run "Delete learned words and data".
- iOS: Settings › General › Transfer or Reset iPhone › Reset › Reset Keyboard Dictionary.

The same steps are shown under "Keyboard privacy" in the app's settings.

## Device restrictions

### What does "Device restrictions" in Settings do?

It detects device features that do not suit airgapped signing. Each item can be set to one of three levels. By default Bluetooth and NFC are Off and the rest are Warn.

- Off: not detected
- Warn: shows a warning at the top of the screen while it is on
- Require: warns, and also blocks loading and creating seeds while it is on. If the network or a radio turns on after a key is loaded, the key is erased at that moment

| Item | Android | iOS |
| --- | --- | --- |
| Network (Wi-Fi, mobile data, tethering, including ones without internet) | Detected | Detected |
| Bluetooth, NFC | Both detected | Only Bluetooth. Permission is requested when set to anything but Off |
| Third-party keyboard | Detects whether the default keyboard came with the device | No item, since the app blocks them |
| USB debugging | Detected | No item |
| Accessibility services | Detects services that are on, including screen readers such as TalkBack | No item |

On Android the app itself has no internet permission.

### What is always on, regardless of these settings?

- Android: screenshots and screen sharing are blocked (except in debug builds), and overlays from other apps are hidden (Android 12 and later)
- iOS: the screen is covered while recording or mirroring, and third-party keyboards are blocked
