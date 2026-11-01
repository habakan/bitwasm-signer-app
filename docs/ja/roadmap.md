# ロードマップ

<sup>[English](../roadmap.md)</sup>

## スマートカード（Satochip / JavaCard）対応

鍵をカードの中に置き、アプリは取引の確認と署名の依頼だけをする形を目指します。カードには画面がないので、確認はこれまでどおりアプリの画面で行います（[#22](https://github.com/habakan/bitwasm-signer-app/issues/22)）。

### 段階

| 段階 | 内容 | 前提 |
| --- | --- | --- |
| 0 | NFCでカードと話す部分と、Satochipのsecure channel（ECDH）。カードの状態とxpubを読み、アカウントのQRを出す | Satochipカード |
| 1 | カードの初期化（PINの設定）と、アプリで作ったseedの書き込み | 段階0 |
| 2 | 空のJavaCardにSatochip appletを入れ、カード管理の鍵を変える（Androidから） | 空のJavaCard、appletのライセンス確認 |
| 3 | カードで署名する | signer.wasmの変更 |
| 4 | Seedkeeperをseedの保存先にする（任意） | 段階0 |

### カードで署名する流れ

3rdIteration/seedsignerのSatochip対応（`helpers/satochip_signer.py`）と同じ分担にします。カードは取引を見ず、32バイトのsighashに署名するだけです。

1. parser.wasmとsigner.wasmでPSBTを解析し、checker.wasmと照合した確認画面を出す（今と同じ）
2. 承認後、署名する入力ごとにBIP32パスの公開鍵をカードから読み、PSBTの公開鍵と一致するか確かめる
3. signer.wasmがsighashを出し、カードが署名する
4. 返ってきた署名をlow-Sにそろえ、signer.wasmがPSBTの`partial_sigs`に入れる

signer.wasmに、鍵を持たずにsighashを出す方法と、外から署名を受け取る方法を足します。これはbitwasm-signer本体の変更です。Taproot（Schnorr）はapplet v0.14以降で使えますが、seedsignerの実装はECDSAだけなので別に確かめます。

### appletのインストール

GlobalPlatformのSCP02 / SCP03でカード管理部と話し、CAPファイルをLOAD / INSTALLします（GlobalPlatformProと同じ手順）。

- 空のカードの多くは管理の鍵が既定値のままです。そのままだとappletを消したり差し替えたりできるので、インストールの最後に鍵を変えます。新しい鍵の保管方法も決めます。
- CAPファイルはwasmと同じくSHA-256で照合します。SatochipAppletのソースから再現できるビルドかと、同梱して配ってよいライセンスかを先に確かめます。
- iOSのCore NFCはInfo.plistに書いたAIDとしか話せません。カード管理部のAIDで足りるかは未確認なので、Androidを先にします。

### 共通の作業

- カードとのやり取りはRustで書き、`wasmi_host.rs`と同じくAndroidとiOSで共有します。pysatochip（LGPL v3）は取り込まず、appletの仕様から書きます。
- Android: `IsoDep`。iOS: Core NFCのISO 7816とentitlement。
- PINはアプリ内のキーパッドで入力し、OSのキーボードを使いません。
- NFCはネットワークではないので、端末の機能制限とは別に扱います。
