# Build it yourself

<sup>[日本語](../ja/quickstart/build.md)</sup>

Trusts the source and your build tools. Costs the build itself, and on iOS signing with a developer account.

## 1. Build it {#build-build}

Read the source and follow [Build](https://github.com/habakan/bitwasm-signer-app#build) in the README. On Android, make a release build (debug builds are very slow on a phone).

## 2. Install it {#build-install}

On Android, install with `adb install` or with "Install an APK only" on the installer page. On iOS, sign and install it from Xcode with your own developer account. Then turn on airplane mode.

It goes with the ways of using the app in any of the other setups. It is signed with a different key from the author's release, so it cannot update a release install.
