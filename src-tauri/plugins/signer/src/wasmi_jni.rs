use std::{
    collections::HashMap,
    panic::{AssertUnwindSafe, catch_unwind},
    sync::{
        Arc, Mutex, OnceLock,
        atomic::{AtomicU32, Ordering},
    },
};

use jni::{
    JNIEnv,
    objects::{JByteArray, JLongArray, JObject, JString},
    sys::{JNI_FALSE, JNI_TRUE, jboolean, jbyteArray, jint, jlong},
};
use wasmi::{Engine, Instance, Linker, Memory, Module, Store, Val, ValType};
use zeroize::Zeroize;

type RuntimeRegistry = Mutex<HashMap<jlong, Arc<Mutex<WasmRuntime>>>>;

static RUNTIMES: OnceLock<RuntimeRegistry> = OnceLock::new();
static NEXT_HANDLE: AtomicU32 = AtomicU32::new(1);

struct WasmRuntime {
    store: Store<()>,
    instance: Instance,
    memory: Memory,
}

impl WasmRuntime {
    fn new(wasm: &[u8]) -> Result<Self, String> {
        let engine = Engine::default();
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

    fn call(&mut self, name: &str, args: &[jlong]) -> Result<jlong, String> {
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
            Some(Val::I32(value)) => Ok(*value as jlong),
            Some(Val::I64(value)) => Ok(*value),
            _ => Err(format!("WASM export {name} has an unsupported return type")),
        }
    }

    fn has_export(&self, name: &str) -> bool {
        self.instance.get_func(&self.store, name).is_some()
    }

    fn read(&self, offset: usize, length: usize) -> Result<Vec<u8>, String> {
        let mut bytes = vec![0; length];
        self.memory
            .read(&self.store, offset, &mut bytes)
            .map_err(|error| error.to_string())?;
        Ok(bytes)
    }

    fn write(&mut self, offset: usize, bytes: &[u8]) -> Result<(), String> {
        self.memory
            .write(&mut self.store, offset, bytes)
            .map_err(|error| error.to_string())
    }

    fn memory_size(&self) -> usize {
        self.memory.data_size(&self.store)
    }
}

impl Drop for WasmRuntime {
    fn drop(&mut self) {
        self.memory.data_mut(&mut self.store).zeroize();
    }
}

fn registry() -> &'static RuntimeRegistry {
    RUNTIMES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn register(runtime: WasmRuntime) -> Result<jlong, String> {
    let mut runtimes = registry().lock().map_err(|error| error.to_string())?;
    let handle = loop {
        let candidate = NEXT_HANDLE.fetch_add(1, Ordering::Relaxed);
        if candidate != 0 && !runtimes.contains_key(&(candidate as jlong)) {
            break candidate as jlong;
        }
    };
    runtimes.insert(handle, Arc::new(Mutex::new(runtime)));
    Ok(handle)
}

fn with_runtime<T>(
    handle: jlong,
    operation: impl FnOnce(&mut WasmRuntime) -> Result<T, String>,
) -> Result<T, String> {
    let runtime = registry()
        .lock()
        .map_err(|error| error.to_string())?
        .get(&handle)
        .cloned()
        .ok_or_else(|| "WASM runtime is closed".to_owned())?;
    let mut runtime = runtime.lock().map_err(|error| error.to_string())?;
    operation(&mut runtime)
}

fn guarded<T>(operation: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    catch_unwind(AssertUnwindSafe(operation)).map_err(|_| "Wasmi runtime panicked".to_owned())?
}

fn throw(env: &mut JNIEnv, message: impl AsRef<str>) {
    let _ = env.throw_new("java/lang/IllegalStateException", message.as_ref());
}

#[allow(non_snake_case)]
#[unsafe(no_mangle)]
pub extern "system" fn Java_app_bithanko_signer_WasmiNative_create(
    mut env: JNIEnv,
    _this: JObject,
    wasm: JByteArray,
) -> jlong {
    let result = guarded(|| {
        let mut bytes = env
            .convert_byte_array(&wasm)
            .map_err(|error| error.to_string())?;
        let runtime = WasmRuntime::new(&bytes)?;
        bytes.zeroize();
        register(runtime)
    });
    match result {
        Ok(handle) => handle,
        Err(error) => {
            throw(&mut env, error);
            0
        }
    }
}

#[allow(non_snake_case)]
#[unsafe(no_mangle)]
pub extern "system" fn Java_app_bithanko_signer_WasmiNative_close(
    mut env: JNIEnv,
    _this: JObject,
    handle: jlong,
) {
    match guarded(|| {
        registry()
            .lock()
            .map_err(|error| error.to_string())?
            .remove(&handle);
        Ok(())
    }) {
        Ok(()) => {}
        Err(error) => throw(&mut env, error),
    }
}

#[allow(non_snake_case)]
#[unsafe(no_mangle)]
pub extern "system" fn Java_app_bithanko_signer_WasmiNative_memorySize(
    mut env: JNIEnv,
    _this: JObject,
    handle: jlong,
) -> jint {
    match guarded(|| {
        with_runtime(handle, |runtime| {
            jint::try_from(runtime.memory_size()).map_err(|error| error.to_string())
        })
    }) {
        Ok(size) => size,
        Err(error) => {
            throw(&mut env, error);
            0
        }
    }
}

#[allow(non_snake_case)]
#[unsafe(no_mangle)]
pub extern "system" fn Java_app_bithanko_signer_WasmiNative_hasExport(
    mut env: JNIEnv,
    _this: JObject,
    handle: jlong,
    name: JString,
) -> jboolean {
    let result = guarded(|| {
        let name = env
            .get_string(&name)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        with_runtime(handle, |runtime| Ok(runtime.has_export(&name)))
    });
    match result {
        Ok(true) => JNI_TRUE,
        Ok(false) => JNI_FALSE,
        Err(error) => {
            throw(&mut env, error);
            JNI_FALSE
        }
    }
}

#[allow(non_snake_case)]
#[unsafe(no_mangle)]
pub extern "system" fn Java_app_bithanko_signer_WasmiNative_call(
    mut env: JNIEnv,
    _this: JObject,
    handle: jlong,
    name: JString,
    args_array: JLongArray,
) -> jlong {
    let result = guarded(|| {
        let name = env
            .get_string(&name)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let length = env
            .get_array_length(&args_array)
            .map_err(|error| error.to_string())?;
        let mut args = vec![0; length as usize];
        env.get_long_array_region(&args_array, 0, &mut args)
            .map_err(|error| error.to_string())?;
        with_runtime(handle, |runtime| runtime.call(&name, &args))
    });
    match result {
        Ok(value) => value,
        Err(error) => {
            throw(&mut env, error);
            0
        }
    }
}

#[allow(non_snake_case)]
#[unsafe(no_mangle)]
pub extern "system" fn Java_app_bithanko_signer_WasmiNative_read(
    mut env: JNIEnv,
    _this: JObject,
    handle: jlong,
    offset: jint,
    length: jint,
) -> jbyteArray {
    let result = guarded(|| {
        let offset = usize::try_from(offset).map_err(|error| error.to_string())?;
        let length = usize::try_from(length).map_err(|error| error.to_string())?;
        with_runtime(handle, |runtime| {
            if offset > runtime.memory_size() || length > runtime.memory_size() - offset {
                return Err("WASM memory range is out of bounds".to_owned());
            }
            runtime.read(offset, length)
        })
    });
    match result {
        Ok(bytes) => match env.byte_array_from_slice(&bytes) {
            Ok(array) => array.into_raw(),
            Err(error) => {
                throw(&mut env, error.to_string());
                std::ptr::null_mut()
            }
        },
        Err(error) => {
            throw(&mut env, error);
            std::ptr::null_mut()
        }
    }
}

#[allow(non_snake_case)]
#[unsafe(no_mangle)]
pub extern "system" fn Java_app_bithanko_signer_WasmiNative_write(
    mut env: JNIEnv,
    _this: JObject,
    handle: jlong,
    offset: jint,
    data: JByteArray,
) {
    let mut bytes = match env.convert_byte_array(&data) {
        Ok(bytes) => bytes,
        Err(error) => {
            throw(&mut env, error.to_string());
            return;
        }
    };
    let result = guarded(|| {
        let offset = usize::try_from(offset).map_err(|error| error.to_string())?;
        with_runtime(handle, |runtime| runtime.write(offset, &bytes))
    });
    bytes.zeroize();
    if let Err(error) = result {
        throw(&mut env, error);
    }
}

pub fn keep_exports_linked() {
    std::hint::black_box([
        Java_app_bithanko_signer_WasmiNative_create as *const (),
        Java_app_bithanko_signer_WasmiNative_close as *const (),
        Java_app_bithanko_signer_WasmiNative_memorySize as *const (),
        Java_app_bithanko_signer_WasmiNative_hasExport as *const (),
        Java_app_bithanko_signer_WasmiNative_call as *const (),
        Java_app_bithanko_signer_WasmiNative_read as *const (),
        Java_app_bithanko_signer_WasmiNative_write as *const (),
    ]);
}
