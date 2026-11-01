# iPhone ・ すぐ使う

<sup>[English](../../quickstart/ios-pages.md)</sup>

このパターンで信頼するのは、このサイト(入れる時点)、WebKit、Appleアカウントです。失う利便性は、ネットにつながないこと以外にほとんどありません。

## 1. Safariで開く {#ios-pages-open}

鍵を入れる前のiPhoneで、[Webアプリ](https://habakan.github.io/bitwasm-signer-app/app/)をSafariで開きます。偽のサイトから入れないよう、URLが`habakan.github.io/bitwasm-signer-app/app/`か確かめてください。

<Shot name="ios-open" />

## 2. ホーム画面に追加する {#ios-pages-add}

右下の「…」から「共有」を選び、「表示を増やす」を押して「ホーム画面に追加」を選びます。「Webアプリとして開く」がオンのまま「追加」を押します。iOSのバージョンによっては、画面の下の共有ボタンから選びます。

<div class="shots">
<Shot name="ios-menu" caption="「…」から「共有」" />
<Shot name="ios-share2" caption="「表示を増やす」から「ホーム画面に追加」" />
<Shot name="ios-addsheet" caption="「追加」を押す" />
</div>

## 3. ホーム画面から開く {#ios-pages-launch}

ホーム画面に追加されたアイコンから開きます。「オフラインの準備をしています」が消えるまで、ネットにつないだまま開いておきます。

<div class="shots">
<Shot name="ios-icon" plain caption="追加されたアイコン" />
<Shot name="preparing" caption="準備が終わるまで待つ" />
</div>

## 4. バージョンを確かめる {#ios-pages-version}

右上の設定を開き、いちばん下の「このアプリのバージョン」を、リリースノートの「Web app build」と比べます。

<Shot name="version" />

## 5. 機内モードにする {#ios-pages-offline}

ネットにつながっている間は、赤い表示が出て鍵を読み込めません。機内モードにすると表示が消えます。

<Shot name="ios-standalone" />

## 6. 鍵の保存をオンにする {#ios-pages-storage}

Appleアカウントにサインインし、iCloudキーチェーンをオンにしておきます(iOS 18以降)。設定の「鍵の保存」で「この端末に保存」を選ぶと、このアプリのパスキーを作ります。

<Shot name="storage" />

## 7. 鍵を読み込んで保存する {#ios-pages-load}

ホームに戻り、SeedQRかシードフレーズで鍵を読み込むと、保存するか聞かれます。次からはFace IDかパスコードで開けます。パスフレーズは標準キーボードで入力してください。

<Shot name="offline" />

更新したいときだけネットにつなぎ、ホーム画面に戻ってから開き直します。そのあとバージョンをもう一度確かめてください。
