use serde::de::DeserializeOwned;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    AppHandle, Runtime,
    plugin::{PluginApi, PluginHandle},
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_signer);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Signer<R>> {
    #[cfg(target_os = "android")]
    crate::wasmi_jni::keep_exports_linked();
    #[cfg(target_os = "ios")]
    crate::wasmi_host::keep_exports_linked();
    #[cfg(target_os = "android")]
    let handle =
        api.register_android_plugin("app.bithanko.signer", "SignerPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_signer)?;
    Ok(Signer {
        handle,
        testnet: AtomicBool::new(false),
    })
}

/// Access to the signer APIs.
pub struct Signer<R: Runtime> {
    handle: PluginHandle<R>,
    testnet: AtomicBool,
}

trait NetworkResult {
    fn set_testnet(&mut self, testnet: bool);
}

impl NetworkResult for SignerState {
    fn set_testnet(&mut self, testnet: bool) {
        self.testnet = testnet;
    }
}

impl NetworkResult for SignedPsbtResult {
    fn set_testnet(&mut self, testnet: bool) {
        self.testnet = testnet;
    }
}

impl NetworkResult for NativeActionResult {
    fn set_testnet(&mut self, testnet: bool) {
        self.testnet = testnet;
    }
}

impl<R: Runtime> Signer<R> {
    fn network_result<T: NetworkResult>(&self, mut result: T) -> T {
        result.set_testnet(self.testnet.load(Ordering::Relaxed));
        result
    }

    pub fn state(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("state", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn set_network(&self, testnet: bool) -> crate::Result<SignerState> {
        let mut state: SignerState = self
            .handle
            .run_mobile_plugin("setNetwork", serde_json::json!({ "testnet": testnet }))?;
        self.testnet.store(testnet, Ordering::Relaxed);
        state.set_testnet(testnet);
        Ok(state)
    }
    pub fn scan_seed_qr(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("scanSeedQr", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn import_mnemonic(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("importMnemonic", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn set_storage(&self, enabled: bool) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("setStorage", serde_json::json!({ "enabled": enabled }))
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn set_restriction(&self, id: String, level: String) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin(
                "setRestriction",
                serde_json::json!({ "id": id, "level": level }),
            )
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn set_theme(&self, theme: String) -> crate::Result<()> {
        self.handle
            .run_mobile_plugin("setTheme", serde_json::json!({ "theme": theme }))
            .map_err(Into::into)
    }
    pub fn unlock_saved(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("unlockSaved", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn erase_saved(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("eraseSaved", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn scan_psbt(&self) -> crate::Result<SignedPsbtResult> {
        self.handle
            .run_mobile_plugin("scanPsbt", ())
            .map(|result: SignedPsbtResult| self.network_result(result))
            .map_err(Into::into)
    }
    pub fn export_account(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("exportAccount", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn register_multisig(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("registerMultisig", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn export_multisig(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("exportMultisig", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn forget_multisig(&self) -> crate::Result<SignerState> {
        self.handle
            .run_mobile_plugin("forgetMultisig", ())
            .map(|state: SignerState| self.network_result(state))
            .map_err(Into::into)
    }
    pub fn create_mnemonic(&self) -> crate::Result<NativeActionResult> {
        self.handle
            .run_mobile_plugin("createMnemonic", ())
            .map(|result: NativeActionResult| self.network_result(result))
            .map_err(Into::into)
    }
    pub fn bip85_mnemonic(&self) -> crate::Result<NativeActionResult> {
        self.handle
            .run_mobile_plugin("bip85Mnemonic", ())
            .map(|result: NativeActionResult| self.network_result(result))
            .map_err(Into::into)
    }
    pub fn find_address(&self) -> crate::Result<NativeActionResult> {
        self.handle
            .run_mobile_plugin("findAddress", ())
            .map(|result: NativeActionResult| self.network_result(result))
            .map_err(Into::into)
    }
    pub fn sign_message(&self) -> crate::Result<NativeActionResult> {
        self.handle
            .run_mobile_plugin("signMessage", ())
            .map(|result: NativeActionResult| self.network_result(result))
            .map_err(Into::into)
    }
    pub fn lock(&self) -> crate::Result<()> {
        self.handle
            .run_mobile_plugin("lock", ())
            .map_err(Into::into)
    }
    pub fn parser_info(&self) -> crate::Result<ParserInfo> {
        self.handle
            .run_mobile_plugin("parserInfo", ())
            .map_err(Into::into)
    }
}
