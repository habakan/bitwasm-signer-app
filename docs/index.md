---
outline: false
# Scrolling to a section moves the phone on the right to that screen (see Demo.vue)
demo:
  overview: []
  offline: ["#settings"]
  create: ["#create-mnemonic"]
  dice: ["#create-mnemonic", "#walk-next", "#walk-next", "#walk-next", "#walk-dice", "#words-12", "[data-face=\"3\"]", "[data-face=\"5\"]", "[data-face=\"1\"]", "[data-face=\"6\"]", "[data-face=\"2\"]"]
  write-down: ["#create-mnemonic", "#walk-next", "#walk-next", "#walk-next", "#walk-random", "#words-12"]
  quiz: ["#create-mnemonic", "#walk-next", "#walk-next", "#walk-next", "#walk-random", "#words-12", "#write-done"]
  load: ["#demo-seed", "#passphrase-continue"]
  passphrase: ["#demo-seed", "type:#passphrase=TREZOR"]
  connect: ["#demo-seed", "#passphrase-continue", "#account"]
  receive: ["#demo-seed", "#passphrase-continue", "#find-address", "#address-test"]
  scan: ["#demo-seed", "#passphrase-continue", "#psbt"]
  review: ["#demo-seed", "#passphrase-continue", "#psbt", "#scan-test"]
  sign: ["#demo-seed", "#passphrase-continue", "#psbt", "#scan-test", ".sheet .check input", "scroll:.sheet .screen-body", "#review-sign", "#confirm-sign"]
  lock: ["#demo-seed", "#passphrase-continue", "#lock"]
---

# bitwasm-signer-app

<sup>[日本語](ja/index.md)</sup>

bitwasm-signer is an app for air-gapped signing. It passes Bitcoin transactions as PSBTs (BIP174) in QR codes, so the private key that signs them stays on a device that never connects to anything.
bitwasm-signer-app brings what air-gapped signing needs to a phone: loading the private key, signing, and showing the signed PSBT as a QR code.

## Under the hood {#overview}

The app runs [bitwasm-signer](https://github.com/habakan/bitwasm-signer), a set of WebAssembly modules made for signing bitcoin.
![bitwasm-signer runs the same WebAssembly modules everywhere](https://github.com/habakan/bitwasm-signer/raw/main/docs/everywhere.svg)

With WebAssembly, **byte-for-byte the same signing logic runs in every environment**, including [a dedicated signing device built on a microcontroller](https://github.com/habakan/bitwasm-signer-pico). The aim is signing software that is easy to run and maintain because it is portable.

The phone on the right of this page also runs **the real WebAssembly modules**, so **you can try the app's screens and steps on testnet.**
As you scroll, the phone moves to the screen each section talks about. Switch to **Try it yourself** above the phone to tap through it yourself, and the text moves to the section for whatever you tap. A few screens, such as the keypad for typing words, are only in the app; for those the phone stays on the previous step. Never send real bitcoin to the demo's addresses.

## 1. Setup {#offline}

The signer runs on Android and iOS. How to install it depends on what you are willing to trust; see [Setup](setup.md). On Android, [Signer Lockdown](lockdown.md) makes a dedicated signer that keeps airplane mode on and, as Device Owner, blocks USB debugging, new apps and accounts.

Once installed, Settings › Device restrictions lets you choose how the signer treats things that could leak what is on the screen or what you type: networks, Bluetooth and NFC, third-party keyboards, USB debugging and accessibility services. For each one you choose whether it is ignored, warns, or stops the key from loading while it is on. The browser demo does not have these checks.

## 2. Make a key {#create}

Your key is a list of 12 or 24 words, the recovery phrase. Tap **Create a new wallet**. The signer makes the words from secure random numbers, or from dice you roll yourself if you would rather not trust the phone's random numbers.

Have paper and a pen ready, and do this where no one and no camera can see.

### Roll dice {#dice}

To make the words from dice, roll a die and tap the face that came up, once per roll. 12 words take exactly 50 rolls and 24 words 99. The signer warns if the rolls look uneven or follow a pattern that a fair die almost never gives.

### Write the words down {#write-down}

Write the words on paper, in order. Anyone who sees them can take your bitcoin, and with the paper you can get it back even if you lose the phone.

### Check what you wrote {#quiz}

A five-question quiz asks for words from your paper. A slip of the pen shows up here, while you can still fix it. Only after the quiz can the new words be used to sign.

## 3. Load your key {#load}

By default the signer keeps no key. You load it each time you sign, and it is wiped when you lock the signer or leave the app. To keep it on the phone instead, see [More features](#more).

There are three ways to load it: scan your backup as a SeedQR, type the words, or, in the browser demo, tap **Use the test key**. Next comes the passphrase screen; leave it blank if you have none. The wallet screen then shows the key's **fingerprint**. Compare it with the one in your wallet app to check that both use the same key. The test words give `73c5 da0a`.

### Type the words {#type-words}

Words are typed on the signer's own keypad, not the phone's keyboard, so the keyboard cannot learn them. Letters that lead to no word cannot be pressed, and the last word only offers words that fit the checksum.

### Use a passphrase {#passphrase}

A passphrase added to the words makes a different key, and so does a typo in it. The passphrase screen shows the fingerprint without a passphrase and, as you type, with the one you typed. Check that it matches the fingerprint you noted before you tap **Continue**. With the test words, `TREZOR` gives `b4e3 f5ed`.

## 4. Connect your wallet app {#connect}

Tap **Connect your wallet app**. The signer shows your public keys as an animated QR code. Scan it with the wallet app to add a watch-only wallet. It holds no private keys. You only need to do this once.

## 5. Receive {#receive}

The wallet app shows receive addresses. Before you hand one out, check that it really belongs to your key with **Check an address**. Scan the QR on the wallet app's receive screen, or type the address. The signer searches the first receive and change addresses, 1000 of each unless you change the range, and shows whether the address is yours and where it is. The browser demo has **Use the test address** in place of the camera.

## 6. Send {#send}

The wallet app builds the transaction, and the signer checks and signs it.

### Scan the transaction {#scan}

In the wallet app, make the transaction and show it as a QR code. Tap **Sign a transaction** and point the camera at it. The browser demo has **Use the test transaction** instead of a camera.

### Check what it pays {#review}

The review shows the amount, the network fee and every output: where the bitcoin goes and the change that comes back to you. Compare each address with the wallet app and tick it. **Sign transaction** only works after every output is ticked and you have scrolled to the end, so nothing can be skipped.

### Return the signature {#sign}

The signed transaction appears as QR codes. Scan them with the wallet app and send the payment from there. The signer never goes online.

## 7. When you are done {#lock}

Tap **Lock**. The key is wiped from memory. The same happens when you leave the app.

## More features {#more}

Under **Advanced** on the wallet screen, in the app:

- **Register a multisig**: a wallet that needs several keys (up to three) to spend. The signer then shows its change as change and does not sign inputs from other wallets.
- **Sign a message** (BIP137) to prove you own an address.
- **Derive a child mnemonic** (BIP85): new words for another wallet, recoverable from the same backup.

In **Settings**, **Save on this device** keeps 12 or 24 word keys encrypted on the phone, opened with the screen lock or biometrics. The passphrase is never saved; at unlock you type it, and the key opens only if the fingerprint matches.

## Next

- [Signer Lockdown](lockdown.md): turn an Android phone into a signer only.
- [Install over USB](https://habakan.github.io/bitwasm-signer-app/install/) without connecting the phone to a network.
- [FAQ](faq.md)
