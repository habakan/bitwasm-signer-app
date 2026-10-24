use tauri::{AppHandle, Runtime, command};

use crate::{Result, SignerExt, models::*};

#[command]
pub(crate) async fn state<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().state()
}
#[command]
pub(crate) async fn set_network<R: Runtime>(
    app: AppHandle<R>,
    testnet: bool,
) -> Result<SignerState> {
    app.signer().set_network(testnet)
}
#[command]
pub(crate) async fn scan_seed_qr<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().scan_seed_qr()
}
#[command]
pub(crate) async fn import_mnemonic<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().import_mnemonic()
}
#[command]
pub(crate) async fn set_storage<R: Runtime>(
    app: AppHandle<R>,
    enabled: bool,
) -> Result<SignerState> {
    app.signer().set_storage(enabled)
}
#[command]
pub(crate) async fn set_restriction<R: Runtime>(
    app: AppHandle<R>,
    id: String,
    level: String,
) -> Result<SignerState> {
    app.signer().set_restriction(id, level)
}
#[command]
pub(crate) async fn set_theme<R: Runtime>(app: AppHandle<R>, theme: String) -> Result<()> {
    app.signer().set_theme(theme)
}
#[command]
pub(crate) async fn unlock_saved<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().unlock_saved()
}
#[command]
pub(crate) async fn erase_saved<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().erase_saved()
}
#[command]
pub(crate) async fn scan_psbt<R: Runtime>(app: AppHandle<R>) -> Result<SignedPsbtResult> {
    app.signer().scan_psbt()
}
#[command]
pub(crate) async fn export_account<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().export_account()
}
#[command]
pub(crate) async fn create_mnemonic<R: Runtime>(app: AppHandle<R>) -> Result<NativeActionResult> {
    app.signer().create_mnemonic()
}
#[command]
pub(crate) async fn bip85_mnemonic<R: Runtime>(app: AppHandle<R>) -> Result<NativeActionResult> {
    app.signer().bip85_mnemonic()
}
#[command]
pub(crate) async fn find_address<R: Runtime>(app: AppHandle<R>) -> Result<NativeActionResult> {
    app.signer().find_address()
}
#[command]
pub(crate) async fn sign_message<R: Runtime>(app: AppHandle<R>) -> Result<NativeActionResult> {
    app.signer().sign_message()
}
#[command]
pub(crate) async fn lock<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.signer().lock()
}
#[command]
pub(crate) async fn parser_info<R: Runtime>(app: AppHandle<R>) -> Result<ParserInfo> {
    app.signer().parser_info()
}
#[command]
pub(crate) async fn register_multisig<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().register_multisig()
}
#[command]
pub(crate) async fn export_multisig<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().export_multisig()
}
#[command]
pub(crate) async fn forget_multisig<R: Runtime>(app: AppHandle<R>) -> Result<SignerState> {
    app.signer().forget_multisig()
}
