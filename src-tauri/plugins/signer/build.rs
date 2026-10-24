const COMMANDS: &[&str] = &[
    "state",
    "set_network",
    "scan_seed_qr",
    "import_mnemonic",
    "set_storage",
    "set_restriction",
    "set_theme",
    "unlock_saved",
    "erase_saved",
    "scan_psbt",
    "export_account",
    "register_multisig",
    "export_multisig",
    "forget_multisig",
    "create_mnemonic",
    "bip85_mnemonic",
    "find_address",
    "sign_message",
    "lock",
    "parser_info",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
