use super::*;
const SEEDQR: &str = "000000000000000000000000000000000000000000000003";
const MNEMONIC: &str =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

fn engine() -> SignerEngine {
    SignerEngine::new(PARSER_WASM, SIGNER_WASM, CHECKER_WASM).unwrap()
}

fn loaded_engine() -> SignerEngine {
    let mut engine = engine();
    let mut payload = SEEDQR.as_bytes().to_vec();
    let mut passphrase = Vec::new();
    engine.load_seed_qr(&mut payload, &mut passphrase).unwrap();
    assert_eq!(engine.state()["fingerprint"], "73c5da0a");
    engine
}

fn assert_input_zero(signer: &mut WasmModule, length: usize) {
    let offset = signer.call("signer_input", &[]).unwrap() as usize;
    assert!(
        signer
            .read(offset, length)
            .unwrap()
            .iter()
            .all(|byte| *byte == 0)
    );
}

fn take_reply(pointer: *mut c_char) -> Value {
    assert!(!pointer.is_null());
    let text = Zeroizing::new(
        unsafe { std::ffi::CStr::from_ptr(pointer) }
            .to_string_lossy()
            .into_owned(),
    );
    unsafe { bitwasm_ios_engine_free_string(pointer) };
    serde_json::from_str(&text).unwrap()
}

fn data(reply: &Value) -> &Value {
    assert_eq!(reply["ok"], true, "{reply}");
    &reply["data"]
}

#[test]
fn seed_import_handles_passphrases_compact_qr_and_raw_seed() {
    let mut engine = engine();
    let mut payload = SEEDQR.as_bytes().to_vec();
    let mut passphrase = b"TREZOR".to_vec();
    let with_passphrase = engine.load_seed_qr(&mut payload, &mut passphrase).unwrap();
    assert_ne!(with_passphrase["fingerprint"], "73c5da0a");
    assert!(payload.iter().all(|byte| *byte == 0));
    assert!(passphrase.iter().all(|byte| *byte == 0));
    assert_input_zero(engine.signer.as_mut().unwrap(), SEEDQR.len() + 6);

    let mut compact = vec![0; 16];
    let mut passphrase = Vec::new();
    let state = engine.load_seed_qr(&mut compact, &mut passphrase).unwrap();
    assert_eq!(state["fingerprint"], "73c5da0a");
    assert!(compact.iter().all(|byte| *byte == 0));

    let mut raw_seed = vec![0; 64];
    let mut passphrase = Vec::new();
    let state = engine.load_seed_qr(&mut raw_seed, &mut passphrase).unwrap();
    assert_eq!(state["loaded"], true);
    assert_ne!(state["fingerprint"], "00000000");
    assert!(raw_seed.iter().all(|byte| *byte == 0));

    let mut raw_seed = vec![0; 64];
    let mut passphrase = b"not-valid-for-raw-seed".to_vec();
    assert!(engine.load_seed_qr(&mut raw_seed, &mut passphrase).is_err());
    assert!(raw_seed.iter().all(|byte| *byte == 0));
    assert!(passphrase.iter().all(|byte| *byte == 0));
}

#[test]
fn mnemonic_import_normalises_words_and_rejects_bad_checksums() {
    let mut engine = engine();
    let mut mnemonic = format!("  {}  ", MNEMONIC.to_uppercase()).into_bytes();
    let mut passphrase = Vec::new();
    let state = engine
        .load_mnemonic(&mut mnemonic, &mut passphrase)
        .unwrap();
    assert_eq!(state["fingerprint"], "73c5da0a");
    assert!(mnemonic.iter().all(|byte| *byte == 0));
    assert_input_zero(engine.signer.as_mut().unwrap(), MNEMONIC.len() + 4);

    let mut mnemonic = MNEMONIC.replace("about", "abandon").into_bytes();
    let mut passphrase = b"TREZOR".to_vec();
    assert!(
        engine
            .load_mnemonic(&mut mnemonic, &mut passphrase)
            .is_err()
    );
    assert!(passphrase.iter().all(|byte| *byte == 0));
    assert_eq!(engine.state()["fingerprint"], "73c5da0a");

    let words = data(&take_reply(bitwasm_ios_engine_wordlist()))["words"].clone();
    assert_eq!(words.as_array().unwrap().len(), 2048);
    assert_eq!(words[0], "abandon");
    assert_eq!(words[2047], "zoo");
}

#[test]
fn mnemonic_and_seedqr_generation_match_known_vectors() {
    let engine = engine();
    let mut entropy = [
        0x9e, 0x88, 0x5d, 0x95, 0x2a, 0xd3, 0x62, 0xca, 0xeb, 0x4e, 0xfe, 0x34, 0xa8, 0xe9, 0x1b,
        0xd2,
    ];
    let mnemonic = engine.mnemonic_from_entropy(&mut entropy).unwrap();
    assert_eq!(
        std::str::from_utf8(&mnemonic).unwrap(),
        "ozone drill grab fiber curtain grace pudding thank cruise elder eight picnic"
    );
    assert!(entropy.iter().all(|byte| *byte == 0));

    let mut rolls = vec![b'1'; 50];
    let dice_mnemonic = engine.mnemonic_from_dice(&mut rolls, 12).unwrap();
    assert_eq!(
        std::str::from_utf8(&dice_mnemonic).unwrap(),
        "diet glad hat rural panther lawsuit act drop gallery urge where fit"
    );
    assert!(rolls.iter().all(|byte| *byte == 0));

    let mut words =
        b"forum undo fragile fade shy sign arrest garment culture tube off merit".to_vec();
    let standard = engine.seedqr_from_mnemonic(&mut words, false).unwrap();
    assert_eq!(
        std::str::from_utf8(&standard).unwrap(),
        "073318950739065415961602009907670428187212261116"
    );
    assert!(words.iter().all(|byte| *byte == 0));

    let mut words =
        b"forum undo fragile fade shy sign arrest garment culture tube off merit".to_vec();
    let compact = engine.seedqr_from_mnemonic(&mut words, true).unwrap();
    assert_eq!(
        compact.as_slice(),
        &[
            0x5b, 0xbd, 0x9d, 0x71, 0xa8, 0xec, 0x79, 0x90, 0x83, 0x1a, 0xff, 0x35, 0x9d, 0x42,
            0x65, 0x45,
        ]
    );
    assert!(words.iter().all(|byte| *byte == 0));
}

#[test]
fn loaded_seed_supports_bip85_accounts_address_search_and_message_signing() {
    let mut engine = loaded_engine();
    let child = engine.bip85_mnemonic(12, 0).unwrap();
    assert_eq!(
        std::str::from_utf8(&child).unwrap(),
        "prosper short ramp prepare exchange stove life snack client enough purpose fold"
    );
    let output = engine
        .signer
        .as_mut()
        .unwrap()
        .call("signer_mnemonic_output", &[])
        .unwrap() as usize;
    assert!(
        engine
            .signer
            .as_mut()
            .unwrap()
            .read(output, child.len())
            .unwrap()
            .iter()
            .all(|byte| *byte == 0)
    );

    let bip84 = engine.account(84, 0).unwrap();
    assert_eq!(
        bip84["frames"][0],
        "xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V"
    );
    let bip49 = engine.account(49, 0).unwrap();
    assert!(
        bip49["frames"][1]
            .as_str()
            .unwrap()
            .starts_with("sh(wpkh([73c5da0a/49h/0h/0h]")
    );
    let bip86 = engine.account(86, 0).unwrap();
    assert_eq!(
        bip86["frames"][0],
        "xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ"
    );
    let bip48 = engine.account(48, 0).unwrap();
    assert_eq!(
        bip48["frames"][1],
        "[73c5da0a/48h/0h/0h/2h]xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf/<0;1>/*"
    );

    let mut address = b"bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g".to_vec();
    assert_eq!(
        engine.find_address(&mut address, 0, 10).unwrap(),
        Some((0, 1))
    );
    assert!(address.iter().all(|byte| *byte == 0));
    let mut missing = b"bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g".to_vec();
    assert_eq!(engine.find_address(&mut missing, 0, 1).unwrap(), None);

    let message_text = b"This is an example of a signed message.";
    let mut message = message_text.to_vec();
    let review = engine.message_review(&mut message, 84, 0, 0, 0).unwrap();
    assert_eq!(
        review["address"],
        "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"
    );
    assert_eq!(review["isHex"], false);
    assert_eq!(review["text"], std::str::from_utf8(message_text).unwrap());
    assert!(message.iter().all(|byte| *byte == 0));
    {
        let signer = engine.signer.as_mut().unwrap();
        assert_input_zero(signer, message_text.len());
        let message_output = signer.call("signer_message_output", &[]).unwrap() as usize;
        assert!(
            signer
                .read(message_output, 1101)
                .unwrap()
                .iter()
                .all(|byte| *byte == 0)
        );
    }

    let signature = engine.message_sign().unwrap();
    assert_eq!(signature.len(), 65);
    assert!((39..=42).contains(&signature[0]));
    let signer = engine.signer.as_mut().unwrap();
    let signature_output = signer.call("signer_message_sig", &[]).unwrap() as usize;
    assert!(
        signer
            .read(signature_output, 65)
            .unwrap()
            .iter()
            .all(|byte| *byte == 0)
    );
    assert!(
        engine
            .message_sign()
            .unwrap_err()
            .contains("MESSAGE_NOT_REVIEWED")
    );
}

#[test]
fn ios_ffi_exposes_seed_generation_and_review_operations() {
    keep_exports_linked();
    let init = take_reply(bitwasm_ios_engine_init());
    assert_eq!(data(&init)["initialized"], true);

    let entropy = [0; 16];
    let mnemonic = take_reply(unsafe {
        bitwasm_ios_engine_mnemonic_from_entropy(entropy.as_ptr(), entropy.len() as i32)
    });
    assert_eq!(data(&mnemonic)["mnemonic"], MNEMONIC);

    let rolls = vec![b'1'; 50];
    let dice = take_reply(unsafe {
        bitwasm_ios_engine_mnemonic_from_dice(rolls.as_ptr(), rolls.len() as i32, 12)
    });
    assert_eq!(
        data(&dice)["mnemonic"],
        "diet glad hat rural panther lawsuit act drop gallery urge where fit"
    );

    let words = MNEMONIC.as_bytes().to_vec();
    let seedqr = take_reply(unsafe {
        bitwasm_ios_engine_seedqr_from_mnemonic(words.as_ptr(), words.len() as i32, 0)
    });
    let digits = data(&seedqr)["payload"]
        .as_array()
        .unwrap()
        .iter()
        .map(|byte| byte.as_u64().unwrap() as u8)
        .collect::<Vec<_>>();
    assert_eq!(digits, SEEDQR.as_bytes());

    let passphrase = b"TREZOR".to_vec();
    let with_passphrase = take_reply(unsafe {
        bitwasm_ios_engine_load_seed_qr(
            SEEDQR.as_ptr(),
            SEEDQR.len() as i32,
            passphrase.as_ptr(),
            passphrase.len() as i32,
        )
    });
    assert_ne!(data(&with_passphrase)["fingerprint"], "73c5da0a");

    let no_passphrase = take_reply(unsafe {
        bitwasm_ios_engine_load_seed_qr(SEEDQR.as_ptr(), SEEDQR.len() as i32, std::ptr::null(), 0)
    });
    assert_eq!(data(&no_passphrase)["fingerprint"], "73c5da0a");

    let bip85 = take_reply(bitwasm_ios_engine_bip85_mnemonic(12, 0));
    assert_eq!(
        data(&bip85)["mnemonic"],
        "prosper short ramp prepare exchange stove life snack client enough purpose fold"
    );
    let account = take_reply(bitwasm_ios_engine_account(84, 0));
    assert_eq!(
        data(&account)["frames"][0],
        "xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V"
    );

    let uri =
        std::ffi::CString::new("bitcoin:BC1QNJG0JD8228AQ7EGYZACY8CYS3KNF9XVRERKF9G?amount=0.1")
            .unwrap();
    let found = take_reply(unsafe { bitwasm_ios_engine_find_address(uri.as_ptr(), 0, 10) });
    assert_eq!(data(&found)["found"], true);
    assert_eq!(data(&found)["chain"], 0);
    assert_eq!(data(&found)["index"], 1);

    let message = b"This is an example of a signed message.";
    let review = take_reply(unsafe {
        bitwasm_ios_engine_message_review(message.as_ptr(), message.len() as i32, 84, 0, 0, 0)
    });
    assert_eq!(
        data(&review)["address"],
        "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"
    );
    assert_eq!(data(&review)["text"], std::str::from_utf8(message).unwrap());

    let signature = take_reply(bitwasm_ios_engine_message_sign());
    assert_eq!(data(&signature)["signature"].as_array().unwrap().len(), 65);
    assert_eq!(data(&take_reply(bitwasm_ios_engine_lock()))["locked"], true);
}

#[test]
fn multisig_registers_and_public_keys_leave_as_ur() {
    let mut engine = loaded_engine();
    let key = |fp: &str, xpub: &str| format!("[{fp}/48h/0h/0h/2h]{xpub}/<0;1>/*");
    let descriptor = format!(
        "wsh(sortedmulti(2,{},{},{}))",
        key(
            "73c5da0a",
            "xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf"
        ),
        key(
            "3f635a63",
            "xpub6FHZCoNb3tg3o1GAJQxSwgFNF8mLRtTk2GgkF7n5rwzoxBhUEdFWa8cyZRHqytAzKZWsKz8627cQEMCCfR5GDSv6yXegqirpgDUX41Pxybr"
        ),
        key(
            "b8688df1",
            "xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX"
        ),
    );
    let wallet = engine.multisig_load(descriptor.as_bytes()).unwrap();
    assert_eq!(
        wallet["receive"],
        "bc1qea2gkgeszr7wm66x2ejkgdxm9nhg9462sszn75zmkhazev0t02vs70kkll"
    );
    assert_eq!(wallet["ours"], 0);
    assert_eq!(wallet["fingerprints"][2], "b8688df1");
    assert!(
        wallet["descriptor"]
            .as_str()
            .unwrap()
            .ends_with("#d9p6ar8k")
    );
    assert_eq!(engine.state()["multisig"], "2 of 3");

    let account = engine.cbor_frames(1, 0).unwrap();
    assert!(
        account["frames"][0]
            .as_str()
            .unwrap()
            .starts_with("UR:CRYPTO-ACCOUNT/")
    );
    let output = engine.cbor_frames(2, 0).unwrap();
    let frames = output["frames"].as_array().unwrap();
    assert!(frames[0].as_str().unwrap().starts_with("UR:CRYPTO-OUTPUT/"));
    engine.parser.call("parser_ur_reset", &[]).unwrap();
    let mut received = Value::Null;
    for frame in frames {
        received = engine.receive_multisig_ur(frame.as_str().unwrap()).unwrap();
    }
    assert_eq!(received["complete"], true);
    assert_eq!(received["multisig"]["receive"], wallet["receive"]);

    assert!(engine.multisig_load(b"wsh(sortedmulti(1,[00000000/48h/0h/0h/2h]xpub6FHZCoNb3tg3o1GAJQxSwgFNF8mLRtTk2GgkF7n5rwzoxBhUEdFWa8cyZRHqytAzKZWsKz8627cQEMCCfR5GDSv6yXegqirpgDUX41Pxybr/<0;1>/*))").is_err());
    assert_eq!(engine.state()["multisig"], "");
    assert!(engine.cbor_frames(2, 0).is_err());
    engine.lock();
    assert!(engine.multisig_load(descriptor.as_bytes()).is_err());
}

#[test]
fn a_review_the_checker_does_not_reach_is_refused() {
    let mut engine = loaded_engine();
    let psbt = include_bytes!("anti_exfil.psbt");
    let input = engine.parser.call("parser_input", &[]).unwrap() as usize;
    engine.parser.write(input, psbt).unwrap();
    assert_eq!(
        engine
            .parser
            .call("parser_parse", &[psbt.len() as i64, 0x73c5da0a])
            .unwrap(),
        0
    );
    let at = engine.parser.call("parser_plan", &[]).unwrap() as usize;
    let plan = engine.parser.read(at, PLAN_SIZE).unwrap();
    let prev_txs = engine.load_plan_into_signer(&plan).unwrap();
    engine.read_review().unwrap();
    assert!(
        engine.checker_agrees(&plan, &prev_txs).unwrap(),
        "both decide the same"
    );

    // signer.wasm's screen naming another address, one character off
    let signer = engine.signer.as_mut().unwrap();
    let text = signer.call("signer_display_output", &[]).unwrap() as usize
        + DISPLAY_OUTPUTS
        + DISPLAY_OUT_TEXT
        + 10;
    let c = signer.read(text, 1).unwrap()[0];
    signer
        .write(text, &[if c == b'q' { b'p' } else { b'q' }])
        .unwrap();
    assert!(!engine.checker_agrees(&plan, &prev_txs).unwrap());
    engine.signer.as_mut().unwrap().write(text, &[c]).unwrap();
    assert!(engine.checker_agrees(&plan, &prev_txs).unwrap());

    // signer.wasm reporting one satoshi more fee than the model finds
    let signer = engine.signer.as_mut().unwrap();
    let at = signer.call("signer_review_output", &[]).unwrap() as usize + REVIEW_FEE;
    let fee = read_u64(&signer.read(at, 8).unwrap(), 0).unwrap();
    signer.write(at, &(fee + 1).to_le_bytes()).unwrap();
    assert!(!engine.checker_agrees(&plan, &prev_txs).unwrap());
}

#[test]
fn anti_exfil_n_goes_in_and_q_comes_out() {
    let mut engine = loaded_engine();
    let psbt = include_bytes!("anti_exfil.psbt");
    let out = engine.parser.call("parser_output", &[]).unwrap() as usize;
    engine.parser.write(out, psbt).unwrap();
    assert_eq!(
        engine
            .parser
            .call("parser_ur_encode_start", &[psbt.len() as i64, 1000])
            .unwrap(),
        1
    );
    let len = engine.parser.call("parser_ur_encode_next", &[]).unwrap() as usize;
    let input = engine.parser.call("parser_input", &[]).unwrap() as usize;
    let frame = String::from_utf8(engine.parser.read(input, len).unwrap()).unwrap();
    engine.parser.call("parser_ur_reset", &[]).unwrap();
    assert_eq!(engine.receive_ur(&frame).unwrap()["complete"], true);

    let signed = engine.sign().unwrap();
    engine.parser.call("parser_ur_reset", &[]).unwrap();
    let mut psbt = Vec::new();
    for frame in signed["frames"].as_array().unwrap() {
        let bytes = frame.as_str().unwrap().as_bytes();
        engine.parser.write(input, bytes).unwrap();
        let n = engine
            .parser
            .call("parser_ur_receive", &[bytes.len() as i64])
            .unwrap();
        if n > 0 {
            psbt = engine.parser.read(input, n as usize).unwrap();
            break;
        }
    }
    let key = [&[43u8, 0xfc, 7][..], b"bitwasm", &[2]].concat();
    assert!(
        psbt.windows(key.len()).any(|w| w == key),
        "the signed PSBT carries Q"
    );
}

#[test]
fn word_entry_comes_from_the_module() {
    let letters = |prefix: &str, filter: &[u16]| {
        let filter: Vec<u8> = filter
            .iter()
            .flat_map(|index| index.to_le_bytes())
            .collect();
        let reply = take_reply(unsafe {
            bitwasm_ios_engine_word_letters(
                prefix.as_ptr(),
                prefix.len() as i32,
                filter.as_ptr(),
                filter.len() as i32,
            )
        });
        data(&reply)["letters"].as_u64().unwrap()
    };
    let mask = |s: &str| s.bytes().fold(0u64, |m, c| m | 1 << (c - b'a'));
    assert_eq!(letters("wa", &[]), mask("gilnrstvy"));

    let reply = take_reply(unsafe {
        bitwasm_ios_engine_word_matches(b"act".as_ptr(), 3, std::ptr::null(), 0)
    });
    assert_eq!(data(&reply)["matches"].as_array().unwrap().len(), 5);
    assert_eq!(data(&reply)["exact"], true);

    // legal winner thank year wave sausage worth useful legal winner thank yellow
    let first: [u16; 11] = [
        1019, 2015, 1790, 2039, 1983, 1533, 2031, 1919, 1019, 2015, 1790,
    ];
    let bytes: Vec<u8> = first.iter().flat_map(|index| index.to_le_bytes()).collect();
    let reply =
        take_reply(unsafe { bitwasm_ios_engine_final_words(bytes.as_ptr(), bytes.len() as i32) });
    let finals: Vec<u16> = data(&reply)["words"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_u64().unwrap() as u16)
        .collect();
    assert_eq!(finals.len(), 128);
    assert!(finals.contains(&2040));
    assert_eq!(letters("ye", &finals), mask("l"));

    assert_eq!(
        data(&take_reply(bitwasm_ios_engine_word_entry_end()))["ended"],
        true
    );
}
