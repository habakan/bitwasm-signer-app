use tauri::{
    Manager, Runtime,
    plugin::{Builder, TauriPlugin},
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;
#[cfg(any(target_os = "ios", test))]
mod wasmi_host;
#[cfg(target_os = "android")]
mod wasmi_jni;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Signer;
#[cfg(mobile)]
use mobile::Signer;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the signer APIs.
pub trait SignerExt<R: Runtime> {
    fn signer(&self) -> &Signer<R>;
}

impl<R: Runtime, T: Manager<R>> crate::SignerExt<R> for T {
    fn signer(&self) -> &Signer<R> {
        self.state::<Signer<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("signer")
        .invoke_handler(tauri::generate_handler![
            commands::state,
            commands::set_network,
            commands::scan_seed_qr,
            commands::import_mnemonic,
            commands::set_storage,
            commands::set_restriction,
            commands::set_theme,
            commands::unlock_saved,
            commands::erase_saved,
            commands::scan_psbt,
            commands::export_account,
            commands::register_multisig,
            commands::export_multisig,
            commands::forget_multisig,
            commands::create_mnemonic,
            commands::bip85_mnemonic,
            commands::find_address,
            commands::sign_message,
            commands::lock,
            commands::parser_info
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            let signer = mobile::init(app, api)?;
            #[cfg(desktop)]
            let signer = desktop::init(app, api)?;
            app.manage(signer);
            Ok(())
        })
        .build()
}
