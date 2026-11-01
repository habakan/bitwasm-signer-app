# 自分でビルド

<sup>[English](../../quickstart/build.md)</sup>

このパターンで信頼するのは、ソースとビルド環境です。失う利便性はビルドの手間で、iOSは開発者アカウントでの署名が要ります。

## 1. ビルドする {#build-build}

ソースを読み、READMEの[ビルド](https://github.com/bitwasm-project/bit-hanko#build)の手順に従います。Androidはリリースビルドにしてください(デバッグビルドはスマホではとても遅い)。

## 2. 入れる {#build-install}

Androidは`adb install`か、導入ページの「APK だけ入れる」で入れます。iOSはXcodeで自分の開発者アカウントで署名して入れます。入れたら機内モードにします。

使い方はほかのどのパターンとも組み合わせられます。作者のリリースとは署名鍵が違うので、リリースのAPKの上からは更新できません。
