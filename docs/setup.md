# Setup

<sup>[日本語](ja/setup.md)</sup>

Setting up the signer comes down to two choices: how you install the app, and how you use it. You can make both to suit the trade-off between risk and effort that you want.

1. [Installing the app](install.md): whose build you trust. Choose between this site, your own GitHub Pages, the author's release and your own build.
2. [Using the app](use.md): whether to keep the key on the phone, and how far to lock the phone down. Weigh the risks each setting removes against the convenience it costs.
3. [Setups step by step](recipes.md): the steps for five common combinations of the two.

What is protected where is described in [Security](security.md).

## Platforms {#platforms}

The signer runs on iPhone (iOS) and Android. Both can be built as native apps, but the web app (PWA) gets you started right away. Once opened online and taken in, the web app runs offline from then on. Every form runs the same signing engine (WASM).

| | Native app | Web app (PWA) |
| --- | --- | --- |
| iPhone | Build it yourself (Xcode). A release is planned | Add to Home Screen from Safari. Saving keys needs iOS 18 or later |
| Android | The release APK, or build it yourself. Works with [Signer Lockdown](lockdown.md) | Add to Home Screen from Chrome. Saving keys needs a Google account |
