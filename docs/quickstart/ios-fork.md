# iPhone, served by you

<sup>[日本語](../ja/quickstart/ios-fork.md)</sup>

Trusts the commit you choose, your GitHub account and WebKit. Costs loading the recovery words or a SeedQR each time. If this site or repository is taken over later, the build you added is not affected.

## 1. Fork it and build it on your own Pages {#ios-fork-build}

1. Fork this repository. To add a particular version, make its tag or commit the fork's main
2. In the fork's Actions tab, enable workflows (they start disabled in a fork)
3. In the fork's Settings › Pages, set Source to "GitHub Actions"
4. Under Actions › Pages, Run workflow once. When it finishes, the run summary shows "web app build"

## 2. Add it to the home screen {#ios-fork-add}

Open `https://<your username>.github.io/bitwasm-signer-app/app/` in Safari, add it to the home screen as in [iPhone, quick start](ios-pages.md#ios-pages-add), and keep it open until it is ready for offline use.

<Shot name="preparing" />

## 3. Check the build and turn on airplane mode {#ios-fork-version}

Check that This build in Settings matches the "web app build" from step 1 and "Web app build" in the release notes for the same commit.

<Shot name="version" />

## 4. Use it without saving the key {#ios-fork-use}

Load the key from a SeedQR or your recovery words each time, and tap Close wallet when you are done. Leaving the app wipes the key too. Type the passphrase on the built-in keyboard.

<Shot name="offline" />

You can delete the fork once it is added: the home screen app runs from the files it took. If you keep the fork, note that it shares an origin with your other pages under github.io.
