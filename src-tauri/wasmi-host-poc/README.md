# Rust Wasmi host PoC

This standalone example runs the Android asset `signer.wasm` through Wasmi, checks a public BIP39
test vector, and unloads the key. It prints timings without printing the mnemonic or seed.

From the repository root:

```sh
cargo run --release --manifest-path src-tauri/wasmi-host-poc/Cargo.toml
cargo check --manifest-path src-tauri/wasmi-host-poc/Cargo.toml --target armv7-linux-androideabi
cargo check --manifest-path src-tauri/wasmi-host-poc/Cargo.toml --target aarch64-linux-android
cargo check --manifest-path src-tauri/wasmi-host-poc/Cargo.toml --target aarch64-apple-ios
cargo check --manifest-path src-tauri/wasmi-host-poc/Cargo.toml --target aarch64-apple-ios-sim
```

This checks the Rust runtime path and target compilation. It does not integrate the host into the Tauri plugin.
