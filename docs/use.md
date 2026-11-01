# Using the app

<sup>[日本語](ja/use.md)</sup>

Once it is installed, choose how to handle the key and the phone. The more you lock down, the more convenience you give up.

## Threats {#threats}

| Threat | For example | What helps |
| --- | --- | --- |
| The phone is stolen or lost | A key left on the phone is taken once the lock is broken | Not saving the key |
| Someone sees you type | People or cameras watch you enter the recovery words | Saving the key on the phone |
| The key or what you sign goes online | Malware or other apps send it over the network | Locking down the phone |
| Something on the phone reads it | Third-party keyboards, accessibility services, USB debugging, apps added later | Locking down the phone, levels 2 and 3; the built-in keyboard |
| You sign with a different build | You do not notice a replaced or old build | Checking the running build |

## What the signer provides {#provided}

The settings fall into three kinds.

- **The key**: do not save it, or save it on the phone. Pick one.
- **Locking down the phone**: three levels, guarded by you, checked by the app, and fixed by the OS. They stack.
- **Input and checks**: they add a little effort and go with any other choice.

## The key {#keys}

Keeping the key on the phone trades the risk of being watched for the risk of theft.

| | Do not save the key | Save the key on the phone |
| --- | --- | --- |
| Risk removed | Nothing is left on the phone if it is stolen or its lock is broken | Being watched by people or cameras each time you take out the paper and type |
| Trusted instead | Only the paper backup | The phone's lock; in the web app, the account and the browser's data too |
| Convenience lost | High: you enter the recovery words each time (or just scan a SeedQR) | Low: it takes less effort, not more |
| Android (native) | ○ | ○ Android Keystore behind the screen lock, no Google account |
| iPhone (native) | ○ | ○ Secure Enclave behind the passcode, this device only |
| Web app | ○ | △ encrypted with a passkey; iPhone needs iOS 18 or later |

Either way the paper backup stays essential. Anyone who knows the device passcode can open a saved key.

### Saving keys in the web app {#web-storage}

- With Settings › Key storage on, keys are encrypted with this app's passkey, and opening one asks for Face ID, a fingerprint or the device passcode.
- On iPhone it needs iOS 18 or later; earlier Safari lacks the passkey feature (PRF) that encrypts them.
- Creating the passkey needs an Apple Account with iCloud Keychain sync on. Opening saved keys needs it too: after signing out they cannot be opened, even with a copy of the keychain kept on the iPhone. The encrypted keys stay in this device's browser, so the passkey alone on another device cannot open them, but the signing iPhone has to be signed in to the account. To avoid that, do not save keys.
- Saved keys belong to the home screen app that saved them. On iPhone, adding the app to the home screen again makes a separate app that cannot see the earlier one's keys, and removing the earlier app removes its keys too. You do not need to add it again to get a new build.
- Passkeys on Android normally need a Google account, which Signer Lockdown, blocking new accounts, rules out. On Android, use the native app.

## Locking down the phone {#device}

Level 1 is guarded by you, level 2 is checked by the app, and level 3 is fixed by the OS. Each is stronger and costs more convenience than the last.

| Level | Risk removed | Convenience lost | Available on |
| --- | --- | --- | --- |
| 1. Keep it offline | The key or what you sign leaving over the network. In the web app, a taken-over site cannot push a new build | Medium: the phone cannot check balances or send by itself; everything goes through QR codes | All |
| 2. Device restrictions | Loading a key without noticing that Bluetooth, a keyboard, an accessibility service or the like is on | None to medium: with "Require", the key will not load until it is off | Native apps |
| 3. [Signer Lockdown](lockdown.md) | Apps added later, account sync, USB debugging, going online by mistake. You no longer need to trust the phone's other apps | High: the phone is good for nothing else, and needs a factory reset | Android only |

At level 1 every path depends on your own care: settings can be switched back, and you can forget. Levels 2 and 3 change each path like this.

| Path | 2. Device restrictions | 3. Signer Lockdown |
| --- | --- | --- |
| Network (Wi-Fi, mobile) | No key loads while online (Android, iOS; the web app always does this) | Airplane mode kept on |
| Bluetooth, NFC | A warning, or no key loads, while on (Android; iOS checks Bluetooth only) | Settings cannot be changed |
| Third-party keyboards | A warning, or no key loads, while one is installed (Android) | Built-in ones only |
| Accessibility services | A warning, or no key loads, while one is on (Android) | Built-in ones only |
| USB debugging | A warning, or no key loads, while on (Android) | Blocked |
| Apps and accounts added later | Not checked | Blocked |

Device restrictions are under Settings › Device restrictions. For each item choose off, warn, or require it to be off before a key loads. They only check; they do not turn anything off.

## Input and checks {#habits}

| Setting | Risk removed | Convenience lost |
| --- | --- | --- |
| Use the built-in keyboard | A third-party keyboard logging or sending the passphrase. Recovery words are typed on the app's own keys and never pass through the keyboard | Low: no favourite keyboard or dictionary |
| Check the running build | Signing with a replaced or old build without noticing. In the web app, Settings › This build; with Lockdown, `lockdown/audit.sh` from a PC | Low: one more thing to check |

The web app cannot block screenshots or screen recording, and knows whether the phone is online only as far as the browser tells it. See [Security](security.md#browser).
