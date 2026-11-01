# Setups step by step

<sup>[日本語](ja/recipes.md)</sup>

The steps for common combinations of [how you install](install.md) and [how you use](use.md) the app. Pick the one closest to yours.

| Setup | Install | The key | Lockdown level |
| --- | --- | --- | --- |
| [iPhone, quick start](#ios-pages) | Web app (this site) | Saved | 1 |
| [iPhone, served by you](#ios-fork) | Web app (your own Pages) | Not saved | 1 |
| [Android, easy](#android-apk) | The release APK | Saved | 1 and 2 |
| [Android, dedicated phone](#android-lockdown) | The release with Lockdown | Saved | 3 |
| [Build it yourself](#build) | Your own build | Either | Any |

## iPhone, quick start {#ios-pages}

Trusts this site (at install time), WebKit and your Apple Account. Costs little beyond keeping the phone offline.

Install:

1. On the iPhone, before any key is on it, open the [web app](https://habakan.github.io/bitwasm-signer-app/app/) in Safari. Check that the URL is `habakan.github.io/bitwasm-signer-app/app/`
2. Add it with Add to Home Screen in the share menu, and open it from the home screen
3. Keep it open and online until "Getting ready for offline use" goes away
4. Compare Settings › This build with "Web app build" in the release notes
5. Turn on airplane mode. While any network is on, it does not load a key and wipes a loaded one

Use:

1. Sign in to your Apple Account with iCloud Keychain on (iOS 18 or later)
2. Turn on Settings › Key storage, then load the key and save it
3. Type the passphrase on the built-in keyboard
4. Go online only to update, then go to the home screen and open the app again. Check the build again

## iPhone, served by you {#ios-fork}

Trusts the commit you choose, your GitHub account and WebKit. Costs loading the recovery words or a SeedQR each time. If this site or repository is taken over later, the build you added is not affected.

Install:

1. Fork this repository. To add a particular version, make its tag or commit the fork's main
2. In the fork's Actions tab, enable workflows (they start disabled in a fork)
3. In the fork's Settings › Pages, set Source to "GitHub Actions"
4. Under Actions › Pages, Run workflow once. When it finishes, the run summary shows "web app build"
5. Add `https://<your username>.github.io/bitwasm-signer-app/app/` to the home screen, as in steps 1 to 3 above
6. Check that Settings › This build matches the name from step 4 and "Web app build" in the release notes for the same commit, then turn on airplane mode

Use:

1. Do not save the key; load it from the recovery words or a SeedQR each time
2. Close wallet when you are done. Leaving the app wipes the key too
3. Type the passphrase on the built-in keyboard

You can delete the fork once it is added: the home screen app runs from the files it took. If you keep the fork, note that it shares an origin with your other pages under github.io.

## Android, easy {#android-apk}

Trusts the author's release, the installer page and your PC. Costs being unable to load a key while a "Require" item is on. The signing phone never goes online.

Install:

1. On the phone, show Developer options (tap Build number in About phone seven times) and turn on USB debugging
2. On the PC, download the APK and `SHA256SUMS` from the [releases](https://github.com/habakan/bitwasm-signer-app/releases)
3. Open the [installer page](https://habakan.github.io/bitwasm-signer-app/install/#apk) with "Install an APK only" and pick the APK and `SHA256SUMS`. It installs only if they match
4. Turn off USB debugging and turn on airplane mode

Use:

1. Under Settings › Device restrictions, set network, Bluetooth and NFC, third-party keyboards, USB debugging and accessibility services to "Require"
2. Set a screen lock and save the key (Android Keystore, no Google account)
3. Type the passphrase on the built-in keyboard

## Android, dedicated phone {#android-lockdown}

Trusts the author's release (and the installer page and your PC if installed over USB). Costs using the phone for anything else. The full steps are in [Signer Lockdown](lockdown.md).

Install:

1. Factory reset the phone. Do not add any account
2. Install Lockdown in one of two ways
   - QR code: tap the same spot on the welcome screen six times, join Wi-Fi and scan the release's `provisioning-<version>.png`. The PC only shows the image; the release decides what it holds ([Set up with the QR code](lockdown.md#set-up-with-the-qr-code))
   - USB: the phone never goes online. Set a screen lock and turn on USB debugging first, then pick the Lockdown APK and `SHA256SUMS` on the installer page on the PC ([Set up without a network](lockdown.md#set-up-without-a-network))
3. Set a screen lock. Do not add a Google account, and turn off every switch on the Google Services screen
4. Open Signer Lockdown, tap Install the signer, turn on airplane mode and tap Apply restrictions

Use:

1. Save the key (Android Keystore)
2. If you like, also set Settings › Device restrictions to "Require"
3. Update from an SD card or with Lockdown's update from a PC over USB, checking against `SHA256SUMS`
4. To check the phone's state, pause the restrictions and run `lockdown/audit.sh` from a PC

## Build it yourself {#build}

Trusts the source and your build tools. Costs the build itself, and on iOS signing with a developer account.

Install:

1. Read the source and follow [Build](https://github.com/habakan/bitwasm-signer-app#build) in the README. On Android, make a release build (debug builds are very slow on a phone)
2. Android: install with `adb install` or with "Install an APK only" on the installer page
3. iOS: sign and install it from Xcode with your own developer account
4. Turn on airplane mode

It goes with any of the ways of using the app above. It is signed with a different key from the author's release, so it cannot update a release install.
