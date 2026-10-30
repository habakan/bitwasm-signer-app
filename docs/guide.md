---
outline: false
# Scrolling to a section replays these taps on a fresh demo, so the phone shows that step
demo:
  load-key: ["#demo-seed"]
  connect: ["#demo-seed", "#account"]
  sign: ["#demo-seed", "#psbt", "#scan-test"]
  create: ["#create-mnemonic"]
---

# Try the signer

<sup>[日本語](ja/guide.md)</sup>

The phone on this page runs the signer's browser demo. It is the same Rust signing engine as the app, built to WebAssembly, on testnet. Follow the steps below in it. The demo only uses the published BIP39 test words, so never send real bitcoin to its addresses.

Scrolling to a step sets the phone to that screen, and **Reset this screen** under it brings it back after you tap around.

## 1. Load the test key {#load-key}

Tap **Use the test key**. It loads `abandon` ×11 + `about`, the BIP39 test words.

The wallet screen shows the fingerprint `73c5 da0a`. Compare it with the fingerprint in your wallet app to check that both use the same key.

## 2. Connect your wallet app {#connect}

Tap **Connect your wallet app**. The signer shows its public keys as a QR code for a watch-only wallet such as Sparrow or Nunchuk. The QR holds no private keys.

## 3. Sign a transaction {#sign}

1. Tap **Sign a transaction**. In the app this opens the camera to scan the wallet app's animated QR.
2. Tap **Use the test transaction** to load a sample testnet transaction.
3. The review shows the amount, the network fee and every output. Tick each address after you compare it with the one in your wallet app, and scroll to the end.
4. Tap **Sign transaction**, then **Sign**.
5. The signed transaction appears as QR codes. In the app you scan them with your wallet app and send the payment from there.

## 4. Make a new wallet {#create}

Lock the wallet, then tap **Create a new wallet (demo)**. It walks through making the words from secure random numbers or dice rolls, writing them down and a short quiz. **See how these words were made** shows how the words come from the entropy.

Words made in the browser are only for trying the steps. Make the words for real funds in the app, on a phone that stays offline.

## Next

- To make a phone that only signs, see [Signer Lockdown](lockdown.md).
- Common questions are in the [FAQ](faq.md).
