use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SignerState {
    pub loaded: bool,
    pub fingerprint: Option<String>,
    pub testnet: bool,
    #[serde(default)]
    pub storage: bool,
    #[serde(default)]
    pub device_secure: bool,
    #[serde(default)]
    pub saved: u32,
    // "2 of 3" while a multisig is registered, empty otherwise
    #[serde(default)]
    pub multisig: String,
    #[serde(default)]
    pub restrictions: Vec<Restriction>,
}

// A device feature such as a network or USB debugging; level is "off", "warn" or "require"
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Restriction {
    pub id: String,
    pub level: String,
    pub active: bool,
    #[serde(default)]
    pub detail: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ParserInfo {
    pub hash: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedPsbtResult {
    pub loaded: bool,
    pub fingerprint: Option<String>,
    pub testnet: bool,
    pub signed: bool,
    pub shown: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct NativeActionResult {
    pub shown: bool,
    // Set when a new mnemonic passed its backup check and was loaded as the signing key
    #[serde(default)]
    pub loaded: bool,
    #[serde(default)]
    pub fingerprint: Option<String>,
    #[serde(default)]
    pub testnet: bool,
}
