//! The iOS engine, built for the browser demo. The page calls the same C functions and frees replies the same way.

#[path = "../../../src-tauri/plugins/signer/src/wasmi_host.rs"]
pub mod wasmi_host;

#[unsafe(no_mangle)]
pub extern "C" fn web_alloc(length: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(length.max(1));
    let pointer = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    pointer
}

/// # Safety
/// `pointer` and `length` must come from one `web_alloc` call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn web_free(pointer: *mut u8, length: usize) {
    drop(unsafe { Vec::from_raw_parts(pointer, 0, length.max(1)) });
}

use bitwasm_signer_qr as qr;
use serde_json::{Value, json};
use std::ffi::{CString, c_char};
use std::sync::Mutex;
use zeroize::{Zeroize, Zeroizing};

/// The QR reader's state between frames, and a SeedQR read but not yet loaded
struct Reader {
    state: Box<qr::State>,
    out: Vec<u8>,
    seed: Zeroizing<Vec<u8>>,
}

static READER: Mutex<Option<Reader>> = Mutex::new(None);

fn with_reader<T>(operation: impl FnOnce(&mut Reader) -> T) -> T {
    let mut guard = READER.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let reader = guard.get_or_insert_with(|| Reader {
        state: Box::new(qr::State::ZERO),
        out: vec![0; qr::OUTPUT_CAP],
        seed: Zeroizing::new(Vec::new()),
    });
    operation(reader)
}

/// Replies as the engine's own functions do, so the page frees them with bitwasm_ios_engine_free_string
fn reply(result: Result<Value, String>) -> *mut c_char {
    let value = match result {
        Ok(data) => json!({"ok": true, "data": data}),
        Err(error) => json!({"ok": false, "error": error}),
    };
    CString::new(value.to_string()).map(CString::into_raw).unwrap_or(std::ptr::null_mut())
}

/// Reads one greyscale frame. `kind` 1 reads a SeedQR: it is kept here for qr_seed_preview and
/// qr_seed_load, and only whether one was found goes back. `kind` 2 reads a frame of an animated UR,
/// which goes back as text. `code` is the reader's own: 0 nothing found, -1 found but unreadable,
/// -3 a code of another kind
///
/// # Safety
/// `pixels` must point to `length` readable bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_qr_frame(pixels: *const u8, length: i32, width: i32, height: i32, kind: i32) -> *mut c_char {
    let (Ok(length), Ok(w), Ok(h)) = (usize::try_from(length), usize::try_from(width), usize::try_from(height)) else {
        return reply(Err("Invalid frame".to_owned()));
    };
    if pixels.is_null() || w.saturating_mul(h) > length {
        return reply(Err("Invalid frame".to_owned()));
    }
    let kind = match kind {
        1 => qr::Kind::SeedQr,
        2 => qr::Kind::Animated,
        _ => return reply(Err("Unknown QR kind".to_owned())),
    };
    let frame = unsafe { std::slice::from_raw_parts(pixels, length) };
    reply(Ok(with_reader(|reader| {
        let code = qr::read(frame, w, h, kind, &mut reader.out, &mut reader.state);
        let found = code > 0;
        if kind == qr::Kind::Animated {
            let text = found.then(|| String::from_utf8_lossy(&reader.out[..code as usize]).into_owned());
            return json!({"found": found, "code": code, "text": text});
        }
        // A SeedQR's frame and every buffer that saw it are cleared, whether or not it read
        if found {
            reader.seed = Zeroizing::new(reader.out[..code as usize].to_vec());
        }
        reader.out.as_mut_slice().zeroize();
        reader.state.wipe();
        json!({"found": found, "code": code})
    })))
}

/// The fingerprint of the SeedQR held by qr_frame, with this passphrase
///
/// # Safety
/// `passphrase` must point to `length` readable bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_qr_seed_preview(passphrase: *const u8, length: i32) -> *mut c_char {
    with_reader(|reader| {
        if reader.seed.is_empty() {
            return reply(Err("No SeedQR has been read".to_owned()));
        }
        unsafe { wasmi_host::bitwasm_ios_engine_preview_fingerprint(reader.seed.as_ptr(), reader.seed.len() as i32, passphrase, length, 0) }
    })
}

/// Loads the SeedQR held by qr_frame as the signing key, with this passphrase, and lets it go
///
/// # Safety
/// `passphrase` must point to `length` readable bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_qr_seed_load(passphrase: *const u8, length: i32) -> *mut c_char {
    with_reader(|reader| {
        if reader.seed.is_empty() {
            return reply(Err("No SeedQR has been read".to_owned()));
        }
        let result = unsafe { wasmi_host::bitwasm_ios_engine_load_seed_qr(reader.seed.as_ptr(), reader.seed.len() as i32, passphrase, length) };
        reader.seed = Zeroizing::new(Vec::new());
        result
    })
}

/// Lets go of a SeedQR that was read but not loaded, and of the reader's state
#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_qr_wipe() -> *mut c_char {
    with_reader(|reader| {
        reader.seed = Zeroizing::new(Vec::new());
        reader.out.as_mut_slice().zeroize();
        reader.state.wipe();
    });
    reply(Ok(json!({"wiped": true})))
}
