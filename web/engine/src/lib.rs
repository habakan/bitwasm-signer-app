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
