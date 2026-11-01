# iPhone ・ 配る人も自分

<sup>[English](../../quickstart/ios-fork.md)</sup>

このパターンで信頼するのは、選んだコミット、自分のGitHubアカウント、WebKitです。失う利便性として、開くたびにシードかSeedQRを読み込みます。後でこのサイトやリポジトリが乗っ取られても、入れたバージョンには関係しません。

## 1. forkして、自分のPagesでビルドする {#ios-fork-build}

1. このリポジトリをforkする。入れたいバージョンがあれば、そのタグかコミットをforkのmainにする
2. forkのActionsタブで、ワークフローを有効にする(forkでは最初は無効です)
3. forkのSettings › Pagesで、Sourceを「GitHub Actions」にする
4. Actions › Pages › Run workflowで一度ビルドする。終わると、実行結果の要約に「web app build」が出ます

## 2. ホーム画面に追加する {#ios-fork-add}

`https://<自分のユーザー名>.github.io/bitwasm-signer-app/app/`をSafariで開き、[iPhone ・ すぐ使う](ios-pages.md#ios-pages-add)と同じようにホーム画面に追加して、オフラインの準備が終わるまで開いておきます。

<Shot name="preparing" />

## 3. バージョンを確かめて、機内モードにする {#ios-fork-version}

設定の「このアプリのバージョン」が、1の「web app build」や、同じコミットのリリースノートの「Web app build」と同じか確かめます。

<Shot name="version" />

## 4. 鍵は保存せずに使う {#ios-fork-use}

使うたびにSeedQRかシードフレーズで読み込み、終わったら「ウォレットを閉じる」を押します。アプリを離れても鍵は消えます。パスフレーズは標準キーボードで入力してください。

<Shot name="offline" />

入れたあとはforkを消してもかまいません。ホーム画面のアプリは取り込んだファイルだけで動きます。forkを残す場合は、自分のgithub.ioの下にある他のページとオリジンを共有することに注意してください。
