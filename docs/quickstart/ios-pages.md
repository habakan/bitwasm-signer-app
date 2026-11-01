# iPhone, quick start

<sup>[日本語](../ja/quickstart/ios-pages.md)</sup>

Trusts this site (at install time), WebKit and your Apple Account. Costs little beyond keeping the phone offline.

## 1. Open it in Safari {#ios-pages-open}

On the iPhone, before any key is on it, open the [web app](https://bitwasm-project.github.io/bit-hanko/app/) in Safari. So that you do not install a copy from another site, check that the URL is `bitwasm-project.github.io/bit-hanko/app/`.

<Shot name="ios-open" />

## 2. Add it to the home screen {#ios-pages-add}

Tap "…" at the bottom right and choose Share, then View More and Add to Home Screen. Leave Open as Web App on and tap Add. On some versions of iOS, it is under the share button at the bottom of the screen.

<div class="shots">
<Shot name="ios-menu" caption="Share from &quot;…&quot;" />
<Shot name="ios-share2" caption="Add to Home Screen under View More" />
<Shot name="ios-addsheet" caption="Tap Add" />
</div>

## 3. Open it from the home screen {#ios-pages-launch}

Open it from its new icon on the home screen. Keep it open and online until "Getting ready for offline use" goes away.

<div class="shots">
<Shot name="ios-icon" plain caption="The new icon" />
<Shot name="preparing" caption="Wait until it is ready" />
</div>

## 4. Check the build {#ios-pages-version}

Open Settings at the top right, and compare This build at the bottom with "Web app build" in the release notes.

<Shot name="version" />

## 5. Turn on airplane mode {#ios-pages-offline}

While the phone is online, a red notice shows and no key loads. Turning on airplane mode clears it.

<Shot name="ios-standalone" />

## 6. Turn on key storage {#ios-pages-storage}

Sign in to your Apple Account with iCloud Keychain on (iOS 18 or later). Choosing Save on this device under Key storage in Settings creates this app's passkey.

<Shot name="storage" />

## 7. Load the key and save it {#ios-pages-load}

Back on the home screen, load the key from a SeedQR or your recovery words, and you are asked whether to save it. After that it opens with Face ID or the passcode. Type the passphrase on the built-in keyboard.

<Shot name="offline" />

Go online only to update, then go to the home screen and open the app again. Check the build again afterwards.
