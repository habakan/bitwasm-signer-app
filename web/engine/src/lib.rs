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

use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use bitwasm_signer_qr as qr;
use serde_json::{Value, json};
use std::ffi::{CString, c_char};
use std::sync::Mutex;
use zeroize::{Zeroize, Zeroizing};

/// A seed on its way in: read from a SeedQR, typed, or opened from storage. It stays here for the
/// passphrase step, loading and saving, so the page never holds a SeedQR or a stored seed in the clear
struct Pending {
    bytes: Zeroizing<Vec<u8>>,
    mnemonic: bool,
}

/// The QR reader's state between frames, and the pending seed
struct Reader {
    state: Box<qr::State>,
    out: Vec<u8>,
    pending: Pending,
}

static READER: Mutex<Option<Reader>> = Mutex::new(None);

fn with_reader<T>(operation: impl FnOnce(&mut Reader) -> T) -> T {
    let mut guard = READER.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let reader = guard.get_or_insert_with(|| Reader {
        state: Box::new(qr::State::ZERO),
        out: vec![0; qr::OUTPUT_CAP],
        pending: Pending { bytes: Zeroizing::new(Vec::new()), mnemonic: false },
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

/// # Safety
/// `pointer` must point to `length` readable bytes, or be null with a length of 0.
unsafe fn bytes<'a>(pointer: *const u8, length: i32) -> Result<&'a [u8], String> {
    let length = usize::try_from(length).map_err(|error| error.to_string())?;
    if length == 0 {
        return Ok(&[]);
    }
    if pointer.is_null() {
        return Err("Received a null byte buffer".to_owned());
    }
    Ok(unsafe { std::slice::from_raw_parts(pointer, length) })
}

/// Reads one greyscale frame. `kind` 1 reads a SeedQR, which becomes the pending seed; only whether
/// one was found goes back. `kind` 2 reads a frame of an animated UR, and 0 any code, such as an
/// address or a multisig setup; both go back as text.
/// `code` is the reader's own: 0 nothing found, -1 found but unreadable, -3 a code of another kind
///
/// # Safety
/// `pixels` must point to `length` readable bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_qr_frame(pixels: *const u8, length: i32, width: i32, height: i32, kind: i32) -> *mut c_char {
    let (Ok(w), Ok(h)) = (usize::try_from(width), usize::try_from(height)) else {
        return reply(Err("Invalid frame".to_owned()));
    };
    let frame = match unsafe { bytes(pixels, length) } {
        Ok(frame) if w.saturating_mul(h) <= frame.len() => frame,
        _ => return reply(Err("Invalid frame".to_owned())),
    };
    let kind = match kind {
        1 => qr::Kind::SeedQr,
        0 => qr::Kind::Any,
        2 => qr::Kind::Animated,
        _ => return reply(Err("Unknown QR kind".to_owned())),
    };
    reply(Ok(with_reader(|reader| {
        let code = qr::read(frame, w, h, kind, &mut reader.out, &mut reader.state);
        let found = code > 0;
        if kind != qr::Kind::SeedQr {
            let text = found.then(|| String::from_utf8_lossy(&reader.out[..code as usize]).into_owned());
            return json!({"found": found, "code": code, "text": text});
        }
        // A SeedQR's frame and every buffer that saw it are cleared, whether or not it read
        if found {
            reader.pending = Pending { bytes: Zeroizing::new(reader.out[..code as usize].to_vec()), mnemonic: false };
        }
        reader.out.as_mut_slice().zeroize();
        reader.state.wipe();
        json!({"found": found, "code": code})
    })))
}

/// Typed recovery words, as the pending seed
///
/// # Safety
/// `words` must point to `length` readable bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_seed_words(words: *const u8, length: i32) -> *mut c_char {
    reply(unsafe { bytes(words, length) }.map(|words| {
        with_reader(|reader| reader.pending = Pending { bytes: Zeroizing::new(words.to_vec()), mnemonic: true });
        json!({"pending": true})
    }))
}

/// The pending seed's fingerprint with this passphrase
///
/// # Safety
/// `passphrase` must point to `length` readable bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_seed_preview(passphrase: *const u8, length: i32) -> *mut c_char {
    with_reader(|reader| {
        let p = &reader.pending;
        if p.bytes.is_empty() {
            return reply(Err("No seed is pending".to_owned()));
        }
        unsafe { wasmi_host::bitwasm_ios_engine_preview_fingerprint(p.bytes.as_ptr(), p.bytes.len() as i32, passphrase, length, i32::from(p.mnemonic)) }
    })
}

/// Loads the pending seed as the signing key with this passphrase. It stays pending, so it can be
/// saved next; seed_wipe lets it go
///
/// # Safety
/// `passphrase` must point to `length` readable bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_seed_load(passphrase: *const u8, length: i32) -> *mut c_char {
    with_reader(|reader| {
        let p = &reader.pending;
        if p.bytes.is_empty() {
            return reply(Err("No seed is pending".to_owned()));
        }
        let (pointer, size) = (p.bytes.as_ptr(), p.bytes.len() as i32);
        if p.mnemonic {
            unsafe { wasmi_host::bitwasm_ios_engine_load_mnemonic(pointer, size, passphrase, length) }
        } else {
            unsafe { wasmi_host::bitwasm_ios_engine_load_seed_qr(pointer, size, passphrase, length) }
        }
    })
}

/// How many words the pending seed has: a SeedQR is 12 or 24, typed words are counted
#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_seed_length() -> *mut c_char {
    let words = with_reader(|reader| {
        let p = &reader.pending;
        match (p.mnemonic, p.bytes.len()) {
            (true, _) => p.bytes.split(|b| *b == b' ').filter(|w| !w.is_empty()).count(),
            (false, 16 | 48) => 12,
            (false, 32 | 96) => 24,
            _ => 0,
        }
    });
    reply(Ok(json!({"words": words})))
}

/// The pending seed as a Standard (digits) or Compact (entropy) SeedQR, for the passphrase step: the
/// words are still here then, and leave with the pending seed
#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_seed_qr(compact: i32) -> *mut c_char {
    with_reader(|reader| {
        let p = &reader.pending;
        if p.mnemonic {
            return unsafe { wasmi_host::bitwasm_ios_engine_seedqr_from_mnemonic(p.bytes.as_ptr(), p.bytes.len() as i32, compact) };
        }
        let payload = match (p.bytes.len(), compact != 0) {
            (16 | 32, true) | (48 | 96, false) => Zeroizing::new(p.bytes.to_vec()),
            (16 | 32, false) => Zeroizing::new(entropy_digits(&p.bytes)),
            (48 | 96, true) => Zeroizing::new(digits_entropy(&p.bytes)),
            _ => return reply(Err("Only 12 and 24 word seeds have a SeedQR".to_owned())),
        };
        reply(Ok(json!({"payload": payload.as_slice(), "compact": compact != 0})))
    })
}

/// Standard SeedQR digits from entropy: its bits and the SHA-256 checksum, as 11-bit word indices
fn entropy_digits(entropy: &[u8]) -> Vec<u8> {
    use sha2::Digest;
    let hash = sha2::Sha256::digest(entropy);
    let bit = |i: usize| {
        let byte = if i < entropy.len() * 8 { entropy[i / 8] } else { hash[i / 8 - entropy.len()] };
        u16::from(byte >> (7 - i % 8) & 1)
    };
    let words = entropy.len() * 8 * 33 / 32 / 11;
    (0..words).flat_map(|w| format!("{:04}", (0..11).fold(0, |n, b| n << 1 | bit(w * 11 + b))).into_bytes()).collect()
}

/// Entropy from Standard SeedQR digits: the word indices' bits without the checksum
fn digits_entropy(digits: &[u8]) -> Vec<u8> {
    let indices: Vec<u16> = digits.chunks(4).map(|d| d.iter().fold(0, |n, c| n * 10 + u16::from(c - b'0'))).collect();
    let mut entropy = vec![0u8; indices.len() * 11 * 32 / 33 / 8];
    for i in 0..entropy.len() * 8 {
        if indices[i / 11] >> (10 - i % 11) & 1 == 1 {
            entropy[i / 8] |= 0x80 >> (i % 8);
        }
    }
    entropy
}

/// The key that wraps stored seeds, derived from a passkey's PRF output. The kind of seed is bound
/// in as associated data, so stored words cannot be opened as a SeedQR or the other way round
fn wrapping_key(prf: &[u8]) -> Result<Aes256Gcm, String> {
    if prf.len() < 32 {
        return Err("The passkey gave too short a secret".to_owned());
    }
    let mut key = Zeroizing::new([0u8; 32]);
    hkdf::Hkdf::<sha2::Sha256>::new(None, prf)
        .expand(b"bitwasm-signer stored seed v1", key.as_mut_slice())
        .map_err(|error| error.to_string())?;
    Aes256Gcm::new_from_slice(key.as_slice()).map_err(|error| error.to_string())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Encrypts the pending seed for storage with the passkey's PRF output and a fresh 12-byte nonce
/// from the page. Only the ciphertext comes back
///
/// # Safety
/// `prf` and `nonce` must point to readable bytes of their lengths.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_seed_seal(prf: *const u8, prf_length: i32, nonce: *const u8, nonce_length: i32) -> *mut c_char {
    reply((|| {
        let (prf, nonce) = unsafe { (bytes(prf, prf_length)?, bytes(nonce, nonce_length)?) };
        if nonce.len() != 12 {
            return Err("The nonce must be 12 bytes".to_owned());
        }
        let cipher = wrapping_key(prf)?;
        with_reader(|reader| {
            let p = &reader.pending;
            if p.bytes.is_empty() {
                return Err("No seed is pending".to_owned());
            }
            let aad = [u8::from(p.mnemonic)];
            let sealed = cipher
                .encrypt(Nonce::from_slice(nonce), Payload { msg: &p.bytes, aad: &aad })
                .map_err(|_| "Encryption failed".to_owned())?;
            Ok(json!({"data": hex(&sealed), "mnemonic": p.mnemonic}))
        })
    })())
}

/// Opens a stored seed with the passkey's PRF output and makes it the pending seed. Nothing of it
/// comes back to the page
///
/// # Safety
/// `data`, `prf` and `nonce` must point to readable bytes of their lengths.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn bitwasm_ios_engine_seed_open(
    data: *const u8,
    data_length: i32,
    prf: *const u8,
    prf_length: i32,
    nonce: *const u8,
    nonce_length: i32,
    mnemonic: i32,
) -> *mut c_char {
    reply((|| {
        let (data, prf, nonce) = unsafe { (bytes(data, data_length)?, bytes(prf, prf_length)?, bytes(nonce, nonce_length)?) };
        if nonce.len() != 12 {
            return Err("The nonce must be 12 bytes".to_owned());
        }
        let aad = [u8::from(mnemonic != 0)];
        let opened = wrapping_key(prf)?
            .decrypt(Nonce::from_slice(nonce), Payload { msg: data, aad: &aad })
            .map_err(|_| "The saved key did not open with this passkey".to_owned())?;
        with_reader(|reader| reader.pending = Pending { bytes: Zeroizing::new(opened), mnemonic: mnemonic != 0 });
        Ok(json!({"pending": true}))
    })())
}

/// Lets go of the pending seed and of the reader's state
#[unsafe(no_mangle)]
pub extern "C" fn bitwasm_ios_engine_seed_wipe() -> *mut c_char {
    with_reader(|reader| {
        reader.pending = Pending { bytes: Zeroizing::new(Vec::new()), mnemonic: false };
        reader.out.as_mut_slice().zeroize();
        reader.state.wipe();
    });
    reply(Ok(json!({"wiped": true})))
}
