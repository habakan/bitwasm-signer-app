use serde::de::DeserializeOwned;
use tauri::{AppHandle, Runtime, plugin::PluginApi};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Signer<R>> {
    Ok(Signer(app.clone()))
}

/// Access to the signer APIs.
pub struct Signer<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Signer<R> {
    pub fn state(&self) -> crate::Result<SignerState> {
        Ok(SignerState {
            loaded: false,
            fingerprint: None,
            testnet: false,
            storage: false,
            device_secure: false,
            saved: 0,
            multisig: String::new(),
            restrictions: Vec::new(),
        })
    }
    pub fn set_network(&self, _testnet: bool) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn scan_seed_qr(&self) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn import_mnemonic(&self) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn set_storage(&self, _enabled: bool) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn set_restriction(&self, _id: String, _level: String) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn set_theme(&self, _theme: String) -> crate::Result<()> {
        Ok(())
    }
    pub fn unlock_saved(&self) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn erase_saved(&self) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn register_multisig(&self) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn export_multisig(&self) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn forget_multisig(&self) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn scan_psbt(&self) -> crate::Result<SignedPsbtResult> {
        Err(crate::Error::Unsupported)
    }
    pub fn export_account(&self) -> crate::Result<SignerState> {
        Err(crate::Error::Unsupported)
    }
    pub fn create_mnemonic(&self) -> crate::Result<NativeActionResult> {
        Err(crate::Error::Unsupported)
    }
    pub fn bip85_mnemonic(&self) -> crate::Result<NativeActionResult> {
        Err(crate::Error::Unsupported)
    }
    pub fn find_address(&self) -> crate::Result<NativeActionResult> {
        Err(crate::Error::Unsupported)
    }
    pub fn sign_message(&self) -> crate::Result<NativeActionResult> {
        Err(crate::Error::Unsupported)
    }
    pub fn lock(&self) -> crate::Result<()> {
        Ok(())
    }
    pub fn parser_info(&self) -> crate::Result<ParserInfo> {
        Ok(ParserInfo {
            hash: "9407abe3a65a56ebcfcab6da3b685f4e21ce9f6a60b3feddd299ddc0def89bab".into(),
        })
    }
}
