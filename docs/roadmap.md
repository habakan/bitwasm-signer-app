# Roadmap

<sup>[日本語](ja/roadmap.md)</sup>

## Smartcards (Satochip / JavaCard)

The goal is to keep the key on a card, with the app only reviewing the transaction and asking the card to sign. The card has no screen, so the review stays on the app's screen as it is today ([#22](https://github.com/bitwasm-project/bit-hanko/issues/22)).

### Stages

| Stage | What | Needs |
| --- | --- | --- |
| 0 | NFC transport to the card and the Satochip secure channel (ECDH). Read the card status and xpub, and show the account QR | A Satochip card |
| 1 | Card setup (setting the PIN) and writing a seed created in the app | Stage 0 |
| 2 | Install the Satochip applet on a blank JavaCard and change the card manager keys (from Android) | A blank JavaCard, a check of the applet license |
| 3 | Sign on the card | Changes to signer.wasm |
| 4 | Use a Seedkeeper as seed storage (optional) | Stage 0 |

### Signing on the card

The split follows 3rdIteration/seedsigner's Satochip support (`helpers/satochip_signer.py`). The card never sees the transaction; it only signs a 32 byte sighash.

1. parser.wasm and signer.wasm parse the PSBT, and the review screen checked against checker.wasm is shown (as today)
2. After approval, for each input to sign, read the public key at its BIP32 path from the card and check that it matches the PSBT
3. signer.wasm produces the sighash and the card signs it
4. The returned signature is normalized to low-S, and signer.wasm puts it into the PSBT's `partial_sigs`

signer.wasm gains a way to produce sighashes without holding a key, and a way to accept signatures from outside. This is a change to bitwasm-signer itself. Taproot (Schnorr) is available from applet v0.14, but seedsigner's implementation is ECDSA only, so it needs checking separately.

### Installing the applet

Talk to the card manager over GlobalPlatform SCP02 / SCP03 and LOAD / INSTALL the CAP file (the same steps as GlobalPlatformPro).

- Most blank cards keep the default card manager keys. With those, anyone can delete or replace the applet, so the keys are changed at the end of the install. How to keep the new keys also needs deciding.
- The CAP file is checked by SHA-256, like the wasm modules. First confirm that it builds reproducibly from the SatochipApplet source and that its license allows shipping it with the app.
- iOS Core NFC only talks to AIDs listed in Info.plist. Whether the card manager's AID is enough is unknown, so Android comes first.

### Shared work

- Card communication is written in Rust and shared by Android and iOS, like `wasmi_host.rs`. pysatochip (LGPL v3) is not pulled in; the code is written from the applet's specification.
- Android: `IsoDep`. iOS: Core NFC ISO 7816 and the entitlement.
- The PIN is entered on the in-app keypad, never the system keyboard.
- NFC is not a network, so it is handled separately from device restrictions.
