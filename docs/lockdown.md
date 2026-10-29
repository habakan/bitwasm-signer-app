# Signer Lockdown

<sup>[日本語](ja/lockdown.md)</sup>

Signer Lockdown (`lockdown/`) turns an Android phone into a phone that only signs. It is a small device owner app: it installs the signer that comes bundled inside it, then has Android itself block what a signer does not need. The PC only hands Lockdown to the phone, so there is little PC-side code to trust.

Tested on a phone running Android 10.

## What it locks

- Airplane mode stays on. Bluetooth, Wi-Fi, tethering, mobile network and location settings cannot be changed
- No new accounts or users, no installs from unknown sources, no enabling or disabling apps in Settings, no safe mode, no USB file transfer, no USB debugging
- Only built-in accessibility services and keyboards
- The signer cannot be uninstalled, so a seed saved on the phone is not lost by accident
- The apps in `lockdown/profiles/hide.txt` that the phone has are hidden (common Google, AOSP and MediaTek apps)
- Optionally, saved Wi-Fi networks are forgotten

Lifting the restrictions or removing the device owner asks for the screen lock. Lifting does not turn back on what Android turned off when the restrictions were applied: USB debugging, other apps' permission to install apps, and the voice input keyboard.

## Set up with the QR code

Each release has `signer-lockdown-<version>.apk` (with the signer inside) and `provisioning-<version>.png`. The phone is online only while it downloads Lockdown, before any key is on it. No PC is needed beyond showing the QR code.

1. Factory reset the phone. A device owner can only be set on a phone with no accounts
2. On the welcome screen, tap the same spot six times. A QR code reader opens
3. Connect to Wi-Fi and scan `provisioning-<version>.png`. The phone downloads Lockdown from the release and checks it against the SHA-256 in the QR code. "This device belongs to your organization" refers to Lockdown; tap Next
4. Set a screen lock. Do not add a Google account, and turn off every switch on the Google Services screen
5. Open Signer Lockdown and tap Install the signer
6. Turn on airplane mode and tap Apply restrictions. The Wi-Fi network used in step 3 is forgotten unless you untick the box

Android 12 and later need two more provisioning screens (`GET_PROVISIONING_MODE` / `ADMIN_POLICY_COMPLIANCE`) that Lockdown does not have yet.

## Set up without a network

For a phone that should never join a network. A PC moves the APK over USB instead.

Prepare the phone as in steps 1 and 4 above, then enable Developer options (tap Build number seven times in About phone) and turn on USB debugging.

Then, in Chrome or Edge on the PC:

1. Download `signer-lockdown-<version>.apk` from the release
2. Open the [installer page](https://habakan.github.io/bitwasm-signer-app/lockdown/) and choose the APK. Check the SHA-256 it shows against `SHA256SUMS` on the release page
3. Connect the phone, pick it in the browser's dialog and allow USB debugging on the phone. If adb runs on the PC, stop it first (`adb kill-server`), or the browser cannot claim the phone
4. The page installs Lockdown and makes it the device owner. Continue from step 5 above; applying the restrictions turns USB debugging off

The page (`installer/`) is built from this repository with [ya-webadb](https://github.com/yume-chan/ya-webadb) (MIT), pinned to exact versions, and talks to the phone over WebUSB. While connected it has full adb access to the phone, so close it once Lockdown is set up.

To use it on a PC that stays offline, open the page once while online and install it from the browser's address bar (Chrome or Edge). The installed app then opens without a network. The build ID in the top bar shows which version is cached.

To install an APK without Lockdown, such as the signer on its own, choose Install an APK only at the top of the page (or open it with `#apk`). It only installs the APK and does not set a device owner.

With the Android platform tools installed, `lockdown/install.sh <bitwasm-signer.apk> <signer-lockdown.apk>` does the same from a terminal and asks before each step.

## Update without a PC or a network

The signer and Lockdown can be updated with the restrictions on, from an APK on a microSD card or a USB stick.

1. Copy the release APK to the card
2. In Lockdown, tap Update an app from an SD card and choose the APK
3. Check the version and SHA-256 shown against `SHA256SUMS` on the release page, then tap Update

Only the signer and Lockdown packages are accepted. Android refuses an APK signed with a different key or an older version (an APK re-signed with another key was refused in testing). Lockdown keeps no expected hash, so a new signer release does not need a new Lockdown.

## Check from a PC

`lockdown/audit.sh` reads the phone's state over adb without changing anything: boot and OS integrity, radios, enabled apps against the profile, apps holding powerful permissions, accounts, backup and the lock screen. It needs USB debugging, so run it before applying the restrictions or after lifting them.

## Development

- `lockdown/provision.sh <bitwasm-signer.apk>` builds a debug Lockdown, shows the QR code and serves the APK to the LAN. The release workflow runs it with the release URL instead
- Building needs JDK 25 and the Android SDK (`cd lockdown && ./gradlew assembleDebug`)
- Add a phone maker's own apps to `lockdown/profiles/hide.txt`. Keep `com.google.android.webview`, which draws the signer's screens
