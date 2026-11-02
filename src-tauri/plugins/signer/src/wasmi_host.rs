use std::{
    ffi::{CStr, CString, c_char},
    panic::{AssertUnwindSafe, catch_unwind},
    slice,
    sync::{Mutex, OnceLock},
};

use serde::Serialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use wasmi::{Engine as WasmiEngine, Instance, Linker, Memory, Module, Store, Val, ValType};
use zeroize::{Zeroize, Zeroizing};

const PARSER_SHA256: &str = "9407abe3a65a56ebcfcab6da3b685f4e21ce9f6a60b3feddd299ddc0def89bab";
const SIGNER_SHA256: &str = "d27fe4f8050193cc7101cf7fab26b0740a1b39e33c867ebc66cd05d9f9003508";
const CHECKER_SHA256: &str = "579bf43d0652ed8152fae6d2ad2b0bf97afb9422e96b0d9e3658a3bd9f2a5912";
const PLAN_SIZE: usize = 6712;
const PLAN_N_INPUTS: usize = 16;
const PLAN_N_OUTPUTS: usize = 17;
const PLAN_PREVTX_MAX: usize = 32768;
const REVIEW_TOTAL_IN: usize = 0;
const REVIEW_TOTAL_OUT: usize = 8;
const REVIEW_FEE: usize = 16;
const REVIEW_OWNER: usize = 24;
const REVIEW_WILL_SIGN: usize = 40;
const FACTS_SIZE: usize = 40;
const REVIEW_N_SIGN: usize = 56;
const DISPLAY_SPEND: usize = 8;
const DISPLAY_N_OUTPUTS: usize = 16;
const DISPLAY_OUTPUTS: usize = 24;
const DISPLAY_OUTPUT_SIZE: usize = 184;
const DISPLAY_OUT_AMOUNT: usize = 0;
const DISPLAY_OUT_OWNER: usize = 8;
const DISPLAY_OUT_TEXT_KIND: usize = 9;
const DISPLAY_OUT_TEXT: usize = 10;
const DISPLAY_OUT_TEXT_CAP: usize = 167;
const SIGNATURE_SIZE: usize = 108;
const MAX_SIGNATURES: usize = 16;
/// Anti-exfil buffers, 16 x 33 bytes: the coordinator's n per input, and Q per signature
const NONCES_SIZE: usize = 33 * MAX_SIGNATURES;
const SIGNER_EXPORTS: &[&str] = &[
    "signer_input",
    "signer_input_cap",
    "signer_plan",
    "signer_prevtx",
    "signer_review_output",
    "signer_display_output",
    "signer_sigs",
    "signer_nonces",
    "signer_nonce_points",
    "signer_xpub_output",
    "signer_desc_output",
    "signer_mnemonic_output",
    "signer_seedqr_output",
    "signer_message_output",
    "signer_message_sig",
    "signer_multisig_output",
    "signer_multisig_load",
    "signer_multisig_load_cbor",
    "signer_multisig_unload",
    "signer_cbor_output",
    "signer_account_cbor",
    "signer_multisig_cbor",
    "signer_init",
    "signer_seed_from_mnemonic",
    "signer_seed_from_seedqr",
    "signer_load_seed",
    "signer_unload",
    "signer_fingerprint",
    "signer_set_prevtx",
    "signer_review",
    "signer_display",
    "signer_sign",
    "signer_xpub",
    "signer_find_address",
    "signer_mnemonic_from_entropy",
    "signer_mnemonic_from_dice",
    "signer_seedqr_from_mnemonic",
    "signer_bip85_mnemonic",
    "signer_message_review",
    "signer_message_sign",
    "signer_facts",
    "signer_facts_output",
];
const MESSAGE_ADDRESS: usize = 0;
const MESSAGE_TEXT_KIND: usize = 75;
const MESSAGE_TEXT: usize = 76;
const MESSAGE_TEXT_CAP: usize = 1025;
const CORE_ERR_NOT_FOUND: i64 = 12;
const PARSER_WASM: &[u8] = include_bytes!("../android/src/main/assets/parser.wasm");
const SIGNER_WASM: &[u8] = include_bytes!("../android/src/main/assets/signer.wasm");
const CHECKER_WASM: &[u8] = include_bytes!("../android/src/main/assets/checker.wasm");

static ENGINE: OnceLock<Mutex<Option<SignerEngine>>> = OnceLock::new();
// A signer.wasm of its own for typing a mnemonic, so it never holds a key
static WORD_ENTRY: OnceLock<Mutex<Option<WasmModule>>> = OnceLock::new();

struct WasmModule {
    store: Store<()>,
    instance: Instance,
    memory: Memory,
}

impl WasmModule {
    fn new(wasm: &[u8]) -> Result<Self, String> {
        let engine = WasmiEngine::default();
        let module = Module::new(&engine, wasm).map_err(|error| error.to_string())?;
        let mut store = Store::new(&engine, ());
        let instance = Linker::<()>::new(&engine)
            .instantiate_and_start(&mut store, &module)
            .map_err(|error| error.to_string())?;
        let memory = instance
            .get_memory(&store, "memory")
            .ok_or_else(|| "WASM module has no exported memory".to_owned())?;
        Ok(Self {
            store,
            instance,
            memory,
        })
    }

    fn call(&mut self, name: &str, args: &[i64]) -> Result<i64, String> {
        let function = self
            .instance
            .get_func(&self.store, name)
            .ok_or_else(|| format!("WASM export not found: {name}"))?;
        let function_type = function.ty(&self.store);
        if function_type.params().len() != args.len() {
            return Err(format!(
                "WASM export {name} expects {} arguments",
                function_type.params().len()
            ));
        }
        let inputs = function_type
            .params()
            .iter()
            .zip(args)
            .map(|(ty, value)| match ty {
                ValType::I32 => Ok(Val::I32(*value as i32)),
                ValType::I64 => Ok(Val::I64(*value)),
                _ => Err(format!(
                    "WASM export {name} has an unsupported parameter type"
                )),
            })
            .collect::<Result<Vec<_>, _>>()?;
        let mut outputs = function_type
            .results()
            .iter()
            .map(|ty| Val::default_for_ty(*ty))
            .collect::<Vec<_>>();
        function
            .call(&mut self.store, &inputs, &mut outputs)
            .map_err(|error| error.to_string())?;
        match outputs.first() {
            None => Ok(0),
            Some(Val::I32(value)) => Ok(*value as i64),
            Some(Val::I64(value)) => Ok(*value),
            _ => Err(format!("WASM export {name} has an unsupported return type")),
        }
    }

    fn has_export(&self, name: &str) -> bool {
        self.instance.get_func(&self.store, name).is_some()
    }

    fn read(&self, offset: usize, length: usize) -> Result<Vec<u8>, String> {
        checked_range(offset, length, self.memory.data_size(&self.store))?;
        let mut bytes = vec![0; length];
        self.memory
            .read(&self.store, offset, &mut bytes)
            .map_err(|error| error.to_string())?;
        Ok(bytes)
    }

    fn write(&mut self, offset: usize, bytes: &[u8]) -> Result<(), String> {
        checked_range(offset, bytes.len(), self.memory.data_size(&self.store))?;
        self.memory
            .write(&mut self.store, offset, bytes)
            .map_err(|error| error.to_string())
    }

    fn read_c_string(&self, offset: usize, capacity: usize) -> Result<String, String> {
        let mut bytes = self.read(offset, capacity)?;
        let length = bytes
            .iter()
            .position(|byte| *byte == 0)
            .unwrap_or(bytes.len());
        let text = String::from_utf8_lossy(&bytes[..length]).into_owned();
        bytes.zeroize();
        Ok(text)
    }

    fn write_input(&mut self, bytes: &[u8]) -> Result<(), String> {
        let capacity = usize::try_from(self.call("signer_input_cap", &[])?)
            .map_err(|error| error.to_string())?;
        if bytes.len() > capacity {
            return Err("input does not fit in signer buffer".to_owned());
        }
        let offset =
            usize::try_from(self.call("signer_input", &[])?).map_err(|error| error.to_string())?;
        self.write(offset, bytes)
    }

    fn clear_input(&mut self, length: usize) -> Result<(), String> {
        let offset =
            usize::try_from(self.call("signer_input", &[])?).map_err(|error| error.to_string())?;
        self.write(offset, &vec![0; length])
    }

    fn read_and_clear(
        &mut self,
        export: &str,
        length: usize,
    ) -> Result<Zeroizing<Vec<u8>>, String> {
        let offset = usize::try_from(self.call(export, &[])?).map_err(|error| error.to_string())?;
        let bytes = Zeroizing::new(self.read(offset, length)?);
        self.write(offset, &vec![0; length])?;
        Ok(bytes)
    }
}

impl Drop for WasmModule {
    fn drop(&mut self) {
        self.memory.data_mut(&mut self.store).zeroize();
    }
}

struct SignerEngine {
    parser: WasmModule,
    checker: WasmModule,
    signer_wasm: Vec<u8>,
    signer: Option<WasmModule>,
    fingerprint: Option<u32>,
    testnet: bool,
    reviewed: bool,
    multisig: Option<String>,
}

impl SignerEngine {
    fn new(parser_wasm: &[u8], signer_wasm: &[u8], checker_wasm: &[u8]) -> Result<Self, String> {
        verify_hash(&parser_wasm, PARSER_SHA256, "parser.wasm")?;
        verify_hash(&signer_wasm, SIGNER_SHA256, "signer.wasm")?;
        verify_hash(&checker_wasm, CHECKER_SHA256, "checker.wasm")?;
        let parser = WasmModule::new(&parser_wasm)?;
        let checker = WasmModule::new(&checker_wasm)?;
        for name in ["checker_input", "checker_output", "checker_run_plan"] {
            if !checker.has_export(name) {
                return Err(format!("not a checker.wasm module: {name} missing"));
            }
        }
        for name in [
            "parser_input",
            "parser_input_cap",
            "parser_parse",
            "parser_plan",
            "parser_ur_receive",
            "parser_nonces",
            "parser_nonce_points",
        ] {
            if !parser.has_export(name) {
                return Err(format!("not a parser.wasm module: {name} missing"));
            }
        }
        Ok(Self {
            parser,
            checker,
            signer_wasm: signer_wasm.to_vec(),
            signer: None,
            fingerprint: None,
            testnet: false,
            reviewed: false,
            multisig: None,
        })
    }

    fn state(&self) -> Value {
        json!({"loaded": self.signer.is_some(), "fingerprint": self.fingerprint.map(|value| format!("{value:08x}")), "testnet": self.testnet, "multisig": self.multisig.clone().unwrap_or_default()})
    }

    fn set_network(&mut self, testnet: bool) -> Result<Value, String> {
        if self.signer.is_some() {
            return Err("Lock the signing key before changing networks".to_owned());
        }
        self.testnet = testnet;
        Ok(self.state())
    }

    fn parser_info(&self) -> Value {
        json!({"hash": PARSER_SHA256})
    }

    fn new_signer(&self) -> Result<WasmModule, String> {
        let mut signer = WasmModule::new(&self.signer_wasm)?;
        for name in SIGNER_EXPORTS {
            if !signer.has_export(name) {
                return Err(format!("not a signer.wasm module: {name} missing"));
            }
        }
        if signer.call("signer_init", &[if self.testnet { 1 } else { 0 }])? != 1 {
            return Err("signer initialization failed".to_owned());
        }
        Ok(signer)
    }

    fn load_seed_qr(&mut self, payload: &mut [u8], passphrase: &mut [u8]) -> Result<Value, String> {
        self.load_secret(payload, passphrase, false)
    }

    fn load_mnemonic(
        &mut self,
        mnemonic: &mut [u8],
        passphrase: &mut [u8],
    ) -> Result<Value, String> {
        self.load_secret(mnemonic, passphrase, true)
    }

    fn load_secret(
        &mut self,
        payload: &mut [u8],
        passphrase: &mut [u8],
        mnemonic: bool,
    ) -> Result<Value, String> {
        let (signer, fingerprint) = self.seed_signer(payload, passphrase, mnemonic)?;
        self.lock();
        self.signer = Some(signer);
        self.fingerprint = Some(fingerprint);
        Ok(self.state())
    }

    // The fingerprint a seed gets with this passphrase; the module is dropped here, so no key is loaded
    fn preview_fingerprint(
        &self,
        payload: &mut [u8],
        passphrase: &mut [u8],
        mnemonic: bool,
    ) -> Result<Value, String> {
        let (_, fingerprint) = self.seed_signer(payload, passphrase, mnemonic)?;
        Ok(json!({"fingerprint": format!("{fingerprint:08x}")}))
    }

    fn seed_signer(
        &self,
        payload: &mut [u8],
        passphrase: &mut [u8],
        mnemonic: bool,
    ) -> Result<(WasmModule, u32), String> {
        let raw_seed = !mnemonic && payload.len() == 64;
        let length = payload.len();
        let pass_length = passphrase.len();
        if raw_seed && pass_length != 0 {
            payload.zeroize();
            passphrase.zeroize();
            return Err("A passphrase can only be used with a SeedQR".to_owned());
        }
        let input = Zeroizing::new(
            payload
                .iter()
                .chain(passphrase.iter())
                .copied()
                .collect::<Vec<_>>(),
        );
        payload.zeroize();
        passphrase.zeroize();
        let mut signer = self.new_signer()?;
        signer.write_input(input.as_slice())?;
        let seeded = if raw_seed {
            signer.call("signer_load_seed", &[])
        } else {
            signer.call(
                if mnemonic {
                    "signer_seed_from_mnemonic"
                } else {
                    "signer_seed_from_seedqr"
                },
                &[length as i64, pass_length as i64],
            )
        };
        signer.clear_input(input.len())?;
        let seeded = seeded?;
        if seeded != 1 {
            return Err(if raw_seed {
                "64-byte seed could not be loaded".to_owned()
            } else if mnemonic {
                "The mnemonic is invalid or its checksum does not match".to_owned()
            } else {
                "SeedQR is invalid or its checksum does not match".to_owned()
            });
        }
        let fingerprint = signer.call("signer_fingerprint", &[])? as u32;
        Ok((signer, fingerprint))
    }

    fn mnemonic_from_entropy(&self, entropy: &mut [u8]) -> Result<Zeroizing<Vec<u8>>, String> {
        let length = entropy.len();
        let input = Zeroizing::new(entropy.to_vec());
        entropy.zeroize();
        let mut signer = self.new_signer()?;
        signer.write_input(input.as_slice())?;
        let length = signer.call("signer_mnemonic_from_entropy", &[length as i64])?;
        if length <= 0 {
            return Err("mnemonic_from_entropy failed".to_owned());
        }
        signer.read_and_clear("signer_mnemonic_output", length as usize)
    }

    fn mnemonic_from_dice(
        &self,
        rolls: &mut [u8],
        words: usize,
    ) -> Result<Zeroizing<Vec<u8>>, String> {
        if !matches!(words, 12 | 24) {
            return Err("dice can produce 12 or 24 words".to_owned());
        }
        let length = rolls.len();
        let input = Zeroizing::new(rolls.to_vec());
        rolls.zeroize();
        let mut signer = self.new_signer()?;
        signer.write_input(input.as_slice())?;
        let length = signer.call("signer_mnemonic_from_dice", &[length as i64, words as i64])?;
        if length <= 0 {
            return Err("mnemonic_from_dice failed".to_owned());
        }
        signer.read_and_clear("signer_mnemonic_output", length as usize)
    }

    fn dice_check(&self, rolls: &[u8], words: usize) -> Result<i32, String> {
        let mut signer = self.new_signer()?;
        signer.write_input(rolls)?;
        Ok(signer.call("signer_dice_check", &[rolls.len() as i64, words as i64])? as i32)
    }

    fn seedqr_from_mnemonic(
        &self,
        mnemonic: &mut [u8],
        compact: bool,
    ) -> Result<Zeroizing<Vec<u8>>, String> {
        let length = mnemonic.len();
        let input = Zeroizing::new(mnemonic.to_vec());
        mnemonic.zeroize();
        let mut signer = self.new_signer()?;
        signer.write_input(input.as_slice())?;
        let length = signer.call(
            "signer_seedqr_from_mnemonic",
            &[length as i64, if compact { 1 } else { 0 }],
        )?;
        if length <= 0 {
            return Err("seedqr_from_mnemonic failed".to_owned());
        }
        signer.read_and_clear("signer_seedqr_output", length as usize)
    }

    fn bip85_mnemonic(&mut self, words: usize, index: usize) -> Result<Zeroizing<Vec<u8>>, String> {
        if !matches!(words, 12 | 18 | 24) || index > i32::MAX as usize {
            return Err("BIP85 word count or index is out of range".to_owned());
        }
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "Load a seed first".to_owned())?;
        let length = signer.call("signer_bip85_mnemonic", &[words as i64, index as i64])?;
        if length <= 0 {
            return Err("bip85_mnemonic failed".to_owned());
        }
        signer.read_and_clear("signer_mnemonic_output", length as usize)
    }

    fn find_address(
        &mut self,
        address: &mut [u8],
        account: usize,
        count: usize,
    ) -> Result<Option<(u8, u32)>, String> {
        if account > i32::MAX as usize || !(1..=100_000).contains(&count) {
            return Err("account or address search count is out of range".to_owned());
        }
        let input = Zeroizing::new(address.to_vec());
        address.zeroize();
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "Load a seed first".to_owned())?;
        signer.write_input(input.as_slice())?;
        let result = signer.call(
            "signer_find_address",
            &[input.len() as i64, account as i64, count as i64],
        );
        signer.clear_input(input.len())?;
        let result = result?;
        if result >= 0 {
            return Ok(Some(((result >> 20) as u8, (result & 0xfffff) as u32)));
        }
        if result == -CORE_ERR_NOT_FOUND {
            return Ok(None);
        }
        Err(format!("FIND_ADDRESS_{}", -result))
    }

    fn message_review(
        &mut self,
        message: &mut [u8],
        purpose: usize,
        account: usize,
        chain: usize,
        index: usize,
    ) -> Result<Value, String> {
        if !matches!(purpose, 49 | 84)
            || account > i32::MAX as usize
            || chain > 1
            || index > i32::MAX as usize
        {
            return Err("message signing path is out of range".to_owned());
        }
        let input = Zeroizing::new(message.to_vec());
        message.zeroize();
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "Load a seed first".to_owned())?;
        signer.write_input(input.as_slice())?;
        let result = signer.call(
            "signer_message_review",
            &[
                input.len() as i64,
                purpose as i64,
                account as i64,
                chain as i64,
                index as i64,
            ],
        );
        signer.clear_input(input.len())?;
        let result = result?;
        if result != 0 {
            return Err(format!("MESSAGE_REVIEW_{result}"));
        }
        let output = usize::try_from(signer.call("signer_message_output", &[])?)
            .map_err(|error| error.to_string())?;
        let address = signer.read_c_string(output + MESSAGE_ADDRESS, MESSAGE_TEXT_KIND)?;
        let is_hex = signer.read(output + MESSAGE_TEXT_KIND, 1)?[0] != 0;
        let text = signer.read_c_string(output + MESSAGE_TEXT, MESSAGE_TEXT_CAP)?;
        signer.write(output, &vec![0; 1101])?;
        Ok(json!({"address": address, "isHex": is_hex, "text": text}))
    }

    fn message_sign(&mut self) -> Result<Vec<u8>, String> {
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "Load a seed first".to_owned())?;
        if signer.call("signer_message_sign", &[])? != 0 {
            return Err("MESSAGE_NOT_REVIEWED".to_owned());
        }
        let offset = usize::try_from(signer.call("signer_message_sig", &[])?)
            .map_err(|error| error.to_string())?;
        let signature = signer.read(offset, 65)?;
        signer.write(offset, &[0; 65])?;
        Ok(signature)
    }

    fn lock(&mut self) {
        if let Some(mut signer) = self.signer.take() {
            let _ = signer.call("signer_unload", &[]);
        }
        self.fingerprint = None;
        self.reviewed = false;
        self.multisig = None;
    }

    // What to show before trusting a multisig setup; the core has registered it once this returns
    fn multisig_load(&mut self, text: &[u8]) -> Result<Value, String> {
        self.multisig_load_with(text, "signer_multisig_load")
    }

    fn multisig_load_cbor(&mut self, cbor: &[u8]) -> Result<Value, String> {
        self.multisig_load_with(cbor, "signer_multisig_load_cbor")
    }

    fn multisig_load_with(&mut self, bytes: &[u8], function: &str) -> Result<Value, String> {
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "Load a seed first".to_owned())?;
        self.multisig = None;
        signer.write_input(bytes)?;
        let code = signer.call(function, &[bytes.len() as i64])?;
        signer.clear_input(bytes.len())?;
        if code != 0 {
            return Err(if code == 13 {
                "This wallet does not hold this seed's key, or its first address is not the one stated. Check the passphrase.".to_owned()
            } else {
                format!("SIGNER_MULTISIG_{code}")
            });
        }
        let at = usize::try_from(signer.call("signer_multisig_output", &[])?)
            .map_err(|error| error.to_string())?;
        let head = signer.read(at, 16)?;
        let fingerprints: Vec<String> = (0..usize::from(head[1]).min(3))
            .map(|i| {
                format!(
                    "{:08x}",
                    u32::from_le_bytes(head[4 + 4 * i..8 + 4 * i].try_into().unwrap())
                )
            })
            .collect();
        self.multisig = Some(format!("{} of {}", head[0], fingerprints.len()));
        Ok(json!({
            "threshold": head[0],
            "ours": head[2],
            "fingerprints": fingerprints,
            "receive": signer.read_c_string(at + 16, 75)?,
            "descriptor": signer.read_c_string(at + 91, 640)?,
        }))
    }

    fn multisig_forget(&mut self) -> Result<Value, String> {
        if let Some(signer) = self.signer.as_mut() {
            signer.call("signer_multisig_unload", &[])?;
        }
        self.multisig = None;
        Ok(self.state())
    }

    // The animated UR may carry a legacy text payload or a typed crypto-output descriptor
    fn receive_multisig_ur(&mut self, part: &str) -> Result<Value, String> {
        let input = usize::try_from(self.parser.call("parser_input", &[])?)
            .map_err(|error| error.to_string())?;
        if part.len() > 32768 {
            return Err("UR frame is too large".to_owned());
        }
        self.parser.write(input, part.as_bytes())?;
        let received = self
            .parser
            .call("parser_ur_receive", &[part.len() as i64])?;
        if received < 0 {
            return Err(format!("UR_ERR_{}", -received));
        }
        if received == 0 {
            let progress = self.parser.call("parser_ur_progress", &[])?;
            return Ok(json!({"complete": false, "progress": progress}));
        }
        let payload = self.parser.read(input, received as usize)?;
        let wallet = match self.parser.call("parser_ur_kind", &[])? {
            1 => self.multisig_load(&payload)?,
            2 => self.multisig_load_cbor(&payload)?,
            _ => return Err("This UR is not a multisig setup".to_owned()),
        };
        Ok(json!({"complete": true, "multisig": wallet}))
    }

    // kind 1 crypto-account, 2 crypto-output, from CBOR the signer made
    fn cbor_frames(&mut self, kind: i64, account: usize) -> Result<Value, String> {
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "Load a seed first".to_owned())?;
        let length = if kind == 1 {
            signer.call("signer_account_cbor", &[account as i64])?
        } else {
            signer.call("signer_multisig_cbor", &[])?
        };
        if length < 0 {
            return Err(format!("SIGNER_CBOR_{}", -length));
        }
        let at = usize::try_from(signer.call("signer_cbor_output", &[])?)
            .map_err(|error| error.to_string())?;
        let cbor = signer.read(at, length as usize)?;
        let output = usize::try_from(self.parser.call("parser_output", &[])?)
            .map_err(|error| error.to_string())?;
        self.parser.write(output, &cbor)?;
        let sequence_length = self
            .parser
            .call("parser_ur_encode_cbor", &[kind, cbor.len() as i64, 100])?;
        if sequence_length <= 0 {
            return Err(format!("UR_ERR_{}", -sequence_length));
        }
        let input = usize::try_from(self.parser.call("parser_input", &[])?)
            .map_err(|error| error.to_string())?;
        let mut frames = Vec::with_capacity(sequence_length as usize);
        for _ in 0..sequence_length {
            let length = self.parser.call("parser_ur_encode_next", &[])?;
            if length < 0 {
                return Err(format!("UR_ERR_{}", -length));
            }
            frames.push(
                String::from_utf8(self.parser.read(input, length as usize)?)
                    .map_err(|error| error.to_string())?,
            );
        }
        Ok(json!({"frames": frames}))
    }

    fn reset_ur(&mut self) -> Result<Value, String> {
        self.parser.call("parser_ur_reset", &[])?;
        self.reviewed = false;
        Ok(json!({"reset": true}))
    }

    fn receive_ur(&mut self, part: &str) -> Result<Value, String> {
        if self.signer.is_none() {
            return Err("Load a SeedQR first".to_owned());
        }
        let input = usize::try_from(self.parser.call("parser_input", &[])?)
            .map_err(|error| error.to_string())?;
        let capacity = usize::try_from(self.parser.call("parser_input_cap", &[])?)
            .map_err(|error| error.to_string())?;
        let bytes = part.as_bytes();
        if bytes.len() > capacity {
            return Err(format!(
                "UR frame is {} bytes, parser capacity is {capacity}",
                bytes.len()
            ));
        }
        self.parser.write(input, bytes)?;
        let received = self
            .parser
            .call("parser_ur_receive", &[bytes.len() as i64])?;
        if received < 0 {
            return Err(format!("UR_ERR_{}", -received));
        }
        let progress = self.parser.call("parser_ur_progress", &[])?.clamp(0, 100);
        if received == 0 {
            return Ok(json!({"complete": false, "progress": progress}));
        }
        let psbt = self.parser.read(input, received as usize)?;
        let fingerprint = self
            .fingerprint
            .ok_or_else(|| "The signing key is locked".to_owned())?;
        let input = usize::try_from(self.parser.call("parser_input", &[])?)
            .map_err(|error| error.to_string())?;
        self.parser.write(input, &psbt)?;
        let parse_rc = self
            .parser
            .call("parser_parse", &[psbt.len() as i64, fingerprint as i64])?;
        if parse_rc != 0 {
            return Err(format!("P_ERR_{parse_rc}"));
        }
        let plan_offset = usize::try_from(self.parser.call("parser_plan", &[])?)
            .map_err(|error| error.to_string())?;
        let plan = self.parser.read(plan_offset, PLAN_SIZE)?;
        let prev_txs = self.load_plan_into_signer(&plan)?;
        self.reviewed = true;
        let review = self.read_review()?;
        if !self.checker_agrees(&plan, &prev_txs).unwrap_or(false) {
            self.cancel_review()?;
            return Err(
                "checker.wasm's review disagrees with signer.wasm, so this transaction is refused"
                    .to_owned(),
            );
        }
        Ok(json!({"complete": true, "progress": 100, "review": review}))
    }

    fn load_plan_into_signer(&mut self, plan: &[u8]) -> Result<Vec<Vec<u8>>, String> {
        if plan.len() != PLAN_SIZE {
            return Err(format!(
                "a plan is {} bytes, expected {PLAN_SIZE}",
                plan.len()
            ));
        }
        let input_count = usize::from(plan[PLAN_N_INPUTS]).min(MAX_SIGNATURES);
        let mut prev_txs = Vec::with_capacity(input_count);
        for index in 0..input_count {
            let length = self.parser.call("parser_prevtx_len", &[index as i64])?;
            if length <= 0 {
                prev_txs.push(Vec::new());
                continue;
            }
            let offset = self.parser.call("parser_prevtx_off", &[index as i64])?;
            let input = self.parser.call("parser_input", &[])?;
            let at = usize::try_from(input + offset).map_err(|error| error.to_string())?;
            prev_txs.push(self.parser.read(at, length as usize)?);
        }
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "The signing key is locked".to_owned())?;
        let plan_offset =
            usize::try_from(signer.call("signer_plan", &[])?).map_err(|error| error.to_string())?;
        signer.write(plan_offset, plan)?;
        let prev_tx_offset = usize::try_from(signer.call("signer_prevtx", &[])?)
            .map_err(|error| error.to_string())?;
        let mut used = 0usize;
        for index in 0..MAX_SIGNATURES {
            let tx = prev_txs.get(index).map(Vec::as_slice).unwrap_or_default();
            if tx.is_empty() {
                signer.call("signer_set_prevtx", &[index as i64, 0, 0])?;
                continue;
            }
            if used + tx.len() > PLAN_PREVTX_MAX {
                return Err(format!("prevtx {index} does not fit"));
            }
            signer.write(prev_tx_offset + used, tx)?;
            if signer.call(
                "signer_set_prevtx",
                &[index as i64, used as i64, tx.len() as i64],
            )? != 1
            {
                return Err(format!("prevtx {index} does not fit"));
            }
            used += tx.len();
        }
        Ok(prev_txs)
    }

    /// A separate model of the review decides the same plan from signer.wasm's facts; a trap or
    /// any other answer than signer.wasm's totals, inputs to sign and owners is a disagreement
    fn checker_agrees(&mut self, plan: &[u8], prev_txs: &[Vec<u8>]) -> Result<bool, String> {
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "The signing key is locked".to_owned())?;
        if signer.call("signer_facts", &[])? != 0 {
            return Ok(false);
        }
        let facts_at = usize::try_from(signer.call("signer_facts_output", &[])?)
            .map_err(|error| error.to_string())?;
        let facts = signer.read(facts_at, FACTS_SIZE)?;
        let review_at = usize::try_from(signer.call("signer_review_output", &[])?)
            .map_err(|error| error.to_string())?;
        let review = signer.read(review_at, 64)?;
        let display_at = usize::try_from(signer.call("signer_display_output", &[])?)
            .map_err(|error| error.to_string())?;
        let display = signer.read(display_at, 2968)?;
        let inputs = usize::from(plan[PLAN_N_INPUTS]).min(MAX_SIGNATURES);
        let outputs = usize::from(plan[PLAN_N_OUTPUTS]).min(16);
        let mut input = [plan, &facts].concat();
        for index in 0..inputs {
            let tx = prev_txs.get(index).map(Vec::as_slice).unwrap_or_default();
            input.extend_from_slice(&(tx.len() as u32).to_le_bytes());
            input.extend_from_slice(tx);
        }
        let mut expected = vec![0];
        expected.extend_from_slice(&review[REVIEW_TOTAL_IN..REVIEW_FEE + 8]);
        expected.extend_from_slice(&review[REVIEW_WILL_SIGN..REVIEW_WILL_SIGN + inputs]);
        expected.extend_from_slice(&review[REVIEW_OWNER..REVIEW_OWNER + outputs]);
        // and the screen: spend, then each output's amount, kind of text and text
        expected.extend_from_slice(&display[DISPLAY_SPEND..DISPLAY_SPEND + 8]);
        for index in 0..outputs {
            let at = DISPLAY_OUTPUTS + index * DISPLAY_OUTPUT_SIZE;
            let text =
                &display[at + DISPLAY_OUT_TEXT..at + DISPLAY_OUT_TEXT + DISPLAY_OUT_TEXT_CAP];
            let text = &text[..text.iter().position(|b| *b == 0).unwrap_or(text.len())];
            expected
                .extend_from_slice(&display[at + DISPLAY_OUT_AMOUNT..at + DISPLAY_OUT_AMOUNT + 8]);
            expected.extend_from_slice(&[display[at + DISPLAY_OUT_TEXT_KIND], text.len() as u8]);
            expected.extend_from_slice(text);
        }
        let at = usize::try_from(self.checker.call("checker_input", &[])?)
            .map_err(|error| error.to_string())?;
        self.checker.write(at, &input)?;
        let length = self
            .checker
            .call("checker_run_plan", &[input.len() as i64])?;
        if length <= 0 {
            return Ok(false);
        }
        let at = usize::try_from(self.checker.call("checker_output", &[])?)
            .map_err(|error| error.to_string())?;
        Ok(self.checker.read(at, length as usize)? == expected)
    }

    fn read_review(&mut self) -> Result<Value, String> {
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "The signing key is locked".to_owned())?;
        let code = signer.call("signer_review", &[])?;
        if code != 0 {
            self.reviewed = false;
            return Err(format!("SIGNER_REVIEW_{code}"));
        }
        if signer.call("signer_display", &[])? != 0 {
            self.reviewed = false;
            return Err("Could not prepare transaction display".to_owned());
        }
        let review_at = usize::try_from(signer.call("signer_review_output", &[])?)
            .map_err(|error| error.to_string())?;
        let display_at = usize::try_from(signer.call("signer_display_output", &[])?)
            .map_err(|error| error.to_string())?;
        let review = signer.read(review_at, 64)?;
        let display = signer.read(display_at, 2968)?;
        let output_count = usize::from(display[DISPLAY_N_OUTPUTS]).min(16);
        let mut outputs = Vec::with_capacity(output_count);
        for index in 0..output_count {
            let offset = DISPLAY_OUTPUTS + index * DISPLAY_OUTPUT_SIZE;
            outputs.push(json!({
                "amount": read_u64(&display, offset + DISPLAY_OUT_AMOUNT)?,
                "owner": owner_name(display[offset + DISPLAY_OUT_OWNER]),
                "kind": text_kind(display[offset + DISPLAY_OUT_TEXT_KIND]),
                "text": read_c_text(&display, offset + DISPLAY_OUT_TEXT, DISPLAY_OUT_TEXT_CAP)?,
            }));
        }
        Ok(json!({
            "totalIn": read_u64(&review, REVIEW_TOTAL_IN)?,
            "totalOut": read_u64(&review, REVIEW_TOTAL_OUT)?,
            "fee": read_u64(&review, REVIEW_FEE)?,
            "spend": read_u64(&display, DISPLAY_SPEND)?,
            "signatures": review[REVIEW_N_SIGN],
            "outputs": outputs,
        }))
    }

    fn cancel_review(&mut self) -> Result<Value, String> {
        if let Some(signer) = self.signer.as_mut() {
            let plan = usize::try_from(signer.call("signer_plan", &[])?)
                .map_err(|error| error.to_string())?;
            signer.write(plan, &vec![0; PLAN_SIZE])?;
        }
        self.reviewed = false;
        Ok(json!({"cancelled": true}))
    }

    fn sign(&mut self) -> Result<Value, String> {
        if !self.reviewed {
            return Err("Review the transaction before signing".to_owned());
        }
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "The signing key is locked".to_owned())?;
        let nonces_at = usize::try_from(self.parser.call("parser_nonces", &[])?)
            .map_err(|error| error.to_string())?;
        let nonces = self.parser.read(nonces_at, NONCES_SIZE)?;
        let at = usize::try_from(signer.call("signer_nonces", &[])?)
            .map_err(|error| error.to_string())?;
        signer.write(at, &nonces)?;
        let count = signer.call("signer_sign", &[])?;
        self.reviewed = false;
        if count < 0 {
            return Err(format!("SIGNER_SIGN_{}", -count));
        }
        if count as usize > MAX_SIGNATURES {
            return Err(format!(
                "Signer returned {count} signatures; maximum is {MAX_SIGNATURES}"
            ));
        }
        let signature_offset =
            usize::try_from(signer.call("signer_sigs", &[])?).map_err(|error| error.to_string())?;
        let mut signatures = Vec::with_capacity(count as usize);
        for index in 0..(count as usize).min(MAX_SIGNATURES) {
            let offset = signature_offset + index * SIGNATURE_SIZE;
            let slot = signer.read(offset, SIGNATURE_SIZE)?;
            let length = usize::from(slot[34]).min(73);
            signatures.push((
                slot[0],
                slot[1..34].to_vec(),
                slot[35..35 + length].to_vec(),
            ));
        }
        let at = usize::try_from(signer.call("signer_nonce_points", &[])?)
            .map_err(|error| error.to_string())?;
        let points = signer.read(at, NONCES_SIZE)?;
        let at = usize::try_from(self.parser.call("parser_nonce_points", &[])?)
            .map_err(|error| error.to_string())?;
        self.parser.write(at, &points)?;
        let base = usize::try_from(self.parser.call("parser_sigs", &[])?)
            .map_err(|error| error.to_string())?;
        self.parser
            .write(base, &vec![0; SIGNATURE_SIZE * MAX_SIGNATURES])?;
        for (index, (input, public_key, signature)) in signatures.iter().enumerate() {
            let offset = base + index * SIGNATURE_SIZE;
            self.parser.write(offset, &[*input])?;
            self.parser.write(offset + 1, public_key)?;
            self.parser.write(offset + 34, &[signature.len() as u8])?;
            self.parser.write(offset + 35, signature)?;
        }
        let length = self
            .parser
            .call("parser_finalize", &[signatures.len() as i64])?;
        if length < 0 {
            return Err(format!("P_ERR_{}", -length));
        }
        let output = usize::try_from(self.parser.call("parser_output", &[])?)
            .map_err(|error| error.to_string())?;
        let signed_psbt = self.parser.read(output, length as usize)?;
        let sequence_length = self
            .parser
            .call("parser_ur_encode_start", &[signed_psbt.len() as i64, 100])?;
        if sequence_length < 0 {
            return Err(format!("UR_ERR_{}", -sequence_length));
        }
        if sequence_length == 0 {
            return Err("No signed PSBT QR frames were produced".to_owned());
        }
        let input = usize::try_from(self.parser.call("parser_input", &[])?)
            .map_err(|error| error.to_string())?;
        let mut frames = Vec::with_capacity(sequence_length as usize);
        for _ in 0..sequence_length {
            let length = self.parser.call("parser_ur_encode_next", &[])?;
            if length < 0 {
                return Err(format!("UR_ERR_{}", -length));
            }
            frames.push(
                String::from_utf8(self.parser.read(input, length as usize)?)
                    .map_err(|error| error.to_string())?,
            );
        }
        Ok(json!({"frames": frames}))
    }

    fn account(&mut self, purpose: usize, account: usize) -> Result<Value, String> {
        if !matches!(purpose, 48 | 49 | 84 | 86) || account > i32::MAX as usize {
            return Err("account purpose or index is out of range".to_owned());
        }
        let signer = self
            .signer
            .as_mut()
            .ok_or_else(|| "Load a SeedQR first".to_owned())?;
        let code = signer.call("signer_xpub", &[purpose as i64, account as i64])?;
        if code != 0 {
            return Err(format!("SIGNER_XPUB_{code}"));
        }
        let xpub = signer.call("signer_xpub_output", &[])? as usize;
        let descriptor = signer.call("signer_desc_output", &[])? as usize;
        Ok(json!({
            "frames": [
                signer.read_c_string(xpub, 120)?,
                signer.read_c_string(descriptor, 180)?,
            ]
        }))
    }
}

fn checked_range(offset: usize, length: usize, size: usize) -> Result<(), String> {
    if offset > size || length > size - offset {
        Err(format!(
            "WASM memory range {offset}+{length} exceeds {size} bytes"
        ))
    } else {
        Ok(())
    }
}

fn verify_hash(bytes: &[u8], expected: &str, name: &str) -> Result<(), String> {
    let digest = Sha256::digest(bytes);
    let actual = digest
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    if actual == expected {
        Ok(())
    } else {
        Err(format!("{name} failed SHA-256 verification: {actual}"))
    }
}

fn read_u64(bytes: &[u8], offset: usize) -> Result<u64, String> {
    let slice = bytes
        .get(offset..offset + 8)
        .ok_or_else(|| "WASM review data is truncated".to_owned())?;
    Ok(u64::from_le_bytes(slice.try_into().map_err(
        |error: std::array::TryFromSliceError| error.to_string(),
    )?))
}

fn read_c_text(bytes: &[u8], offset: usize, capacity: usize) -> Result<String, String> {
    let slice = bytes
        .get(offset..offset + capacity)
        .ok_or_else(|| "WASM display data is truncated".to_owned())?;
    let length = slice
        .iter()
        .position(|byte| *byte == 0)
        .unwrap_or(slice.len());
    Ok(String::from_utf8_lossy(&slice[..length]).into_owned())
}

fn owner_name(value: u8) -> &'static str {
    match value {
        0 => "Send to",
        1 => "Change",
        2 => "Self",
        _ => "Unknown",
    }
}

fn text_kind(value: u8) -> &'static str {
    match value {
        0 => "Address",
        1 => "OP_RETURN",
        2 => "Script",
        _ => "Unknown",
    }
}

fn engine_cell() -> &'static Mutex<Option<SignerEngine>> {
    ENGINE.get_or_init(|| Mutex::new(None))
}

fn with_engine<T>(
    operation: impl FnOnce(&mut SignerEngine) -> Result<T, String>,
) -> Result<T, String> {
    let mut guard = engine_cell().lock().map_err(|error| error.to_string())?;
    let engine = guard
        .as_mut()
        .ok_or_else(|| "The Wasmi engine is not initialized".to_owned())?;
    operation(engine)
}

fn with_word_entry(
    operation: impl FnOnce(&mut WasmModule) -> Result<Value, String>,
) -> Result<Value, String> {
    let mut guard = WORD_ENTRY
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|error| error.to_string())?;
    if guard.is_none() {
        verify_hash(SIGNER_WASM, SIGNER_SHA256, "signer.wasm")?;
        *guard = Some(WasmModule::new(SIGNER_WASM)?);
    }
    operation(guard.as_mut().ok_or("no word entry module")?)
}

// The input is the typed letters, then little-endian uint16 word indices; the module wipes it
fn word_call(
    module: &mut WasmModule,
    name: &str,
    letters: &[u8],
    indices: &[u8],
    args: &[i64],
) -> Result<i64, String> {
    let mut input = Zeroizing::new(letters.to_vec());
    input.extend_from_slice(indices);
    module.write_input(&input)?;
    module.call(name, args)
}

fn words_output(module: &mut WasmModule, count: i64) -> Result<Vec<u16>, String> {
    let count = usize::try_from(count).map_err(|error| error.to_string())?;
    let raw = module.read_and_clear("signer_words_output", 2 * count)?;
    Ok(raw
        .chunks(2)
        .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
        .collect())
}

fn reply<T: Serialize>(result: Result<T, String>) -> *mut c_char {
    let mut value = match result {
        Ok(data) => json!({"ok": true, "data": data}),
        Err(error) => json!({"ok": false, "error": error}),
    };
    let mut text = serde_json::to_string(&value)
        .unwrap_or_else(|_| "{\"ok\":false,\"error\":\"Serialization failed\"}".to_owned());
    let pointer = CString::new(text.as_bytes())
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut());
    text.zeroize();
    zeroize_json(&mut value);
    pointer
}

fn zeroize_json(value: &mut Value) {
    match value {
        Value::String(text) => text.zeroize(),
        Value::Array(values) => values.iter_mut().for_each(zeroize_json),
        Value::Object(values) => values.values_mut().for_each(zeroize_json),
        _ => {}
    }
}

fn ffi_reply(operation: impl FnOnce() -> Result<Value, String>) -> *mut c_char {
    let result = catch_unwind(AssertUnwindSafe(operation))
        .unwrap_or_else(|_| Err("Wasmi operation panicked".to_owned()));
    reply(result)
}

unsafe fn copy_string(pointer: *const c_char) -> Result<String, String> {
    if pointer.is_null() {
        return Err("Received a null string".to_owned());
    }
    unsafe { CStr::from_ptr(pointer) }
        .to_str()
        .map(str::to_owned)
        .map_err(|error| error.to_string())
}

unsafe fn copy_bytes(pointer: *const u8, length: i32) -> Result<Vec<u8>, String> {
    let length = usize::try_from(length).map_err(|error| error.to_string())?;
    if length > 0 && pointer.is_null() {
        return Err("Received a null byte buffer".to_owned());
    }
    Ok(if length == 0 {
        Vec::new()
    } else {
        unsafe { slice::from_raw_parts(pointer, length) }.to_vec()
    })
}

fn secret_string(bytes: Zeroizing<Vec<u8>>) -> Result<Value, String> {
    let mut secret = String::from_utf8(bytes.to_vec()).map_err(|error| error.to_string())?;
    let result = json!({"mnemonic": secret});
    secret.zeroize();
    Ok(result)
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_init() -> *mut c_char {
    ffi_reply(|| {
        let engine = SignerEngine::new(PARSER_WASM, SIGNER_WASM, CHECKER_WASM)?;
        *engine_cell().lock().map_err(|error| error.to_string())? = Some(engine);
        Ok(json!({"initialized": true}))
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_state() -> *mut c_char {
    ffi_reply(|| {
        Ok(engine_cell()
            .lock()
            .map_err(|error| error.to_string())?
            .as_ref()
            .map(SignerEngine::state)
            .unwrap_or_else(|| json!({"loaded": false, "fingerprint": null, "testnet": false})))
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_set_network(testnet: i32) -> *mut c_char {
    ffi_reply(|| with_engine(|engine| engine.set_network(testnet != 0)))
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_parser_info() -> *mut c_char {
    ffi_reply(|| with_engine(|engine| Ok(engine.parser_info())))
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_load_seed_qr(
    payload: *const u8,
    length: i32,
    passphrase: *const u8,
    pass_length: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let mut payload = Zeroizing::new(unsafe { copy_bytes(payload, length) }?);
        let mut passphrase = Zeroizing::new(unsafe { copy_bytes(passphrase, pass_length) }?);
        with_engine(|engine| engine.load_seed_qr(payload.as_mut_slice(), passphrase.as_mut_slice()))
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_load_mnemonic(
    mnemonic: *const u8,
    length: i32,
    passphrase: *const u8,
    pass_length: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let mut mnemonic = Zeroizing::new(unsafe { copy_bytes(mnemonic, length) }?);
        let mut passphrase = Zeroizing::new(unsafe { copy_bytes(passphrase, pass_length) }?);
        with_engine(|engine| {
            engine.load_mnemonic(mnemonic.as_mut_slice(), passphrase.as_mut_slice())
        })
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_preview_fingerprint(
    payload: *const u8,
    length: i32,
    passphrase: *const u8,
    pass_length: i32,
    mnemonic: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let mut payload = Zeroizing::new(unsafe { copy_bytes(payload, length) }?);
        let mut passphrase = Zeroizing::new(unsafe { copy_bytes(passphrase, pass_length) }?);
        with_engine(|engine| {
            engine.preview_fingerprint(
                payload.as_mut_slice(),
                passphrase.as_mut_slice(),
                mnemonic != 0,
            )
        })
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_wordlist() -> *mut c_char {
    ffi_reply(|| {
        with_word_entry(|module| {
            let offset = usize::try_from(module.call("signer_wordlist", &[])?)
                .map_err(|error| error.to_string())?;
            let raw = module.read(offset, 2048 * 8)?;
            let words = raw
                .chunks(8)
                .map(|word| {
                    String::from_utf8_lossy(word)
                        .trim_end_matches('\0')
                        .to_owned()
                })
                .collect::<Vec<_>>();
            Ok(json!({"words": words}))
        })
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_word_letters(
    letters: *const u8,
    length: i32,
    filter: *const u8,
    filter_bytes: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let letters = Zeroizing::new(unsafe { copy_bytes(letters, length) }?);
        let filter = Zeroizing::new(unsafe { copy_bytes(filter, filter_bytes) }?);
        with_word_entry(|module| {
            let args = [letters.len() as i64, (filter.len() / 2) as i64];
            Ok(
                json!({"letters": word_call(module, "signer_word_letters", &letters, &filter, &args)?}),
            )
        })
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_word_matches(
    letters: *const u8,
    length: i32,
    filter: *const u8,
    filter_bytes: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let letters = Zeroizing::new(unsafe { copy_bytes(letters, length) }?);
        let filter = Zeroizing::new(unsafe { copy_bytes(filter, filter_bytes) }?);
        with_word_entry(|module| {
            let args = [letters.len() as i64, (filter.len() / 2) as i64];
            let rc = word_call(module, "signer_word_matches", &letters, &filter, &args)?;
            Ok(json!({"matches": words_output(module, rc & 0xfff)?, "exact": rc >> 12 == 1}))
        })
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_final_words(
    first: *const u8,
    bytes: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let first = Zeroizing::new(unsafe { copy_bytes(first, bytes) }?);
        with_word_entry(|module| {
            let args = [(first.len() / 2 + 1) as i64];
            let count = word_call(module, "signer_final_words", &[], &first, &args)?;
            Ok(json!({"words": words_output(module, count)?}))
        })
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_word_entry_end() -> *mut c_char {
    ffi_reply(|| {
        let mut guard = WORD_ENTRY
            .get_or_init(|| Mutex::new(None))
            .lock()
            .map_err(|error| error.to_string())?;
        if let Some(mut module) = guard.take() {
            module.call("signer_unload", &[])?;
        }
        Ok(json!({"ended": true}))
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_mnemonic_from_entropy(
    entropy: *const u8,
    length: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let mut entropy = Zeroizing::new(unsafe { copy_bytes(entropy, length) }?);
        with_engine(|engine| secret_string(engine.mnemonic_from_entropy(entropy.as_mut_slice())?))
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_mnemonic_from_dice(
    rolls: *const u8,
    length: i32,
    words: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let words = usize::try_from(words).map_err(|error| error.to_string())?;
        let mut rolls = Zeroizing::new(unsafe { copy_bytes(rolls, length) }?);
        with_engine(|engine| secret_string(engine.mnemonic_from_dice(rolls.as_mut_slice(), words)?))
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_dice_check(
    rolls: *const u8,
    length: i32,
    words: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let words = usize::try_from(words).map_err(|error| error.to_string())?;
        let rolls = Zeroizing::new(unsafe { copy_bytes(rolls, length) }?);
        with_engine(|engine| Ok(json!({"flags": engine.dice_check(&rolls, words)?})))
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_seedqr_from_mnemonic(
    mnemonic: *const u8,
    length: i32,
    compact: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let compact = compact != 0;
        let mut mnemonic = Zeroizing::new(unsafe { copy_bytes(mnemonic, length) }?);
        with_engine(|engine| {
            let payload = engine.seedqr_from_mnemonic(mnemonic.as_mut_slice(), compact)?;
            Ok(json!({"payload": payload.as_slice(), "compact": compact}))
        })
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_bip85_mnemonic(words: i32, index: i32) -> *mut c_char {
    ffi_reply(|| {
        let words = usize::try_from(words).map_err(|error| error.to_string())?;
        let index = usize::try_from(index).map_err(|error| error.to_string())?;
        with_engine(|engine| secret_string(engine.bip85_mnemonic(words, index)?))
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_find_address(
    address: *const c_char,
    account: i32,
    count: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let address = unsafe { copy_string(address) }?;
        let trimmed = address.trim();
        let without_scheme = trimmed
            .get(..8)
            .filter(|prefix| prefix.eq_ignore_ascii_case("bitcoin:"))
            .map(|_| &trimmed[8..])
            .unwrap_or(trimmed);
        let normalized = without_scheme.split('?').next().unwrap_or_default();
        let mut address = Zeroizing::new(normalized.as_bytes().to_vec());
        let account = usize::try_from(account).map_err(|error| error.to_string())?;
        let count = usize::try_from(count).map_err(|error| error.to_string())?;
        with_engine(
            |engine| match engine.find_address(address.as_mut_slice(), account, count)? {
                Some((chain, index)) => Ok(json!({"found": true, "chain": chain, "index": index})),
                None => Ok(json!({"found": false})),
            },
        )
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_message_review(
    message: *const u8,
    length: i32,
    purpose: i32,
    account: i32,
    chain: i32,
    index: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let mut message = Zeroizing::new(unsafe { copy_bytes(message, length) }?);
        let purpose = usize::try_from(purpose).map_err(|error| error.to_string())?;
        let account = usize::try_from(account).map_err(|error| error.to_string())?;
        let chain = usize::try_from(chain).map_err(|error| error.to_string())?;
        let index = usize::try_from(index).map_err(|error| error.to_string())?;
        with_engine(|engine| {
            engine.message_review(message.as_mut_slice(), purpose, account, chain, index)
        })
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_message_sign() -> *mut c_char {
    ffi_reply(|| {
        with_engine(|engine| {
            let signature = engine.message_sign()?;
            Ok(json!({"signature": signature}))
        })
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_lock() -> *mut c_char {
    ffi_reply(|| {
        with_engine(|engine| {
            engine.lock();
            Ok(json!({"locked": true}))
        })
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_reset_ur() -> *mut c_char {
    ffi_reply(|| with_engine(SignerEngine::reset_ur))
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_receive_ur(part: *const c_char) -> *mut c_char {
    ffi_reply(|| {
        let part = unsafe { copy_string(part) }?;
        with_engine(|engine| engine.receive_ur(&part))
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_cancel_review() -> *mut c_char {
    ffi_reply(|| with_engine(SignerEngine::cancel_review))
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_sign() -> *mut c_char {
    ffi_reply(|| with_engine(SignerEngine::sign))
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_account(purpose: i32, account: i32) -> *mut c_char {
    ffi_reply(|| {
        let purpose = usize::try_from(purpose).map_err(|error| error.to_string())?;
        let account = usize::try_from(account).map_err(|error| error.to_string())?;
        with_engine(|engine| engine.account(purpose, account))
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_multisig_load(
    text: *const u8,
    length: i32,
) -> *mut c_char {
    ffi_reply(|| {
        let text = unsafe { copy_bytes(text, length) }?;
        with_engine(|engine| engine.multisig_load(&text))
    })
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_receive_multisig_ur(
    part: *const c_char,
) -> *mut c_char {
    ffi_reply(|| {
        let part = unsafe { copy_string(part) }?;
        with_engine(|engine| engine.receive_multisig_ur(&part))
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_multisig_forget() -> *mut c_char {
    ffi_reply(|| with_engine(SignerEngine::multisig_forget))
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_account_ur(account: i32) -> *mut c_char {
    ffi_reply(|| {
        let account = usize::try_from(account).map_err(|error| error.to_string())?;
        with_engine(|engine| engine.cbor_frames(1, account))
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_multisig_ur() -> *mut c_char {
    ffi_reply(|| with_engine(|engine| engine.cbor_frames(2, 0)))
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_free_string(pointer: *mut c_char) {
    if !pointer.is_null() {
        let string = unsafe { CString::from_raw(pointer) };
        let length = string.as_bytes_with_nul().len();
        unsafe { slice::from_raw_parts_mut(pointer.cast::<u8>(), length) }.zeroize();
        drop(string);
    }
}

pub fn keep_exports_linked() {
    std::hint::black_box([
        bitwasm_ios_engine_init as *const (),
        bitwasm_ios_engine_state as *const (),
        bitwasm_ios_engine_set_network as *const (),
        bitwasm_ios_engine_parser_info as *const (),
        bitwasm_ios_engine_load_seed_qr as *const (),
        bitwasm_ios_engine_load_mnemonic as *const (),
        bitwasm_ios_engine_wordlist as *const (),
        bitwasm_ios_engine_word_letters as *const (),
        bitwasm_ios_engine_word_matches as *const (),
        bitwasm_ios_engine_final_words as *const (),
        bitwasm_ios_engine_word_entry_end as *const (),
        bitwasm_ios_engine_mnemonic_from_entropy as *const (),
        bitwasm_ios_engine_mnemonic_from_dice as *const (),
        bitwasm_ios_engine_dice_check as *const (),
        bitwasm_ios_engine_seedqr_from_mnemonic as *const (),
        bitwasm_ios_engine_bip85_mnemonic as *const (),
        bitwasm_ios_engine_find_address as *const (),
        bitwasm_ios_engine_message_review as *const (),
        bitwasm_ios_engine_message_sign as *const (),
        bitwasm_ios_engine_lock as *const (),
        bitwasm_ios_engine_reset_ur as *const (),
        bitwasm_ios_engine_receive_ur as *const (),
        bitwasm_ios_engine_cancel_review as *const (),
        bitwasm_ios_engine_sign as *const (),
        bitwasm_ios_engine_account as *const (),
        bitwasm_ios_engine_multisig_load as *const (),
        bitwasm_ios_engine_receive_multisig_ur as *const (),
        bitwasm_ios_engine_multisig_forget as *const (),
        bitwasm_ios_engine_account_ur as *const (),
        bitwasm_ios_engine_multisig_ur as *const (),
        bitwasm_ios_engine_free_string as *const (),
    ]);
}

#[cfg(test)]
mod tests;
