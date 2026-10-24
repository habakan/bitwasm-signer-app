import engineUrl from "../../web/engine/target/wasm32-unknown-unknown/release/bitwasm_web_engine.wasm?url";

// The iOS engine built for wasm32: each call returns a C string {"ok", "data" | "error"} that the page frees
type Exports = Record<string, (...args: number[]) => number> & { memory: WebAssembly.Memory };

let exports: Exports | null = null;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function startEngine() {
  const { instance } = await WebAssembly.instantiateStreaming(fetch(engineUrl));
  exports = instance.exports as unknown as Exports;
  call("init");
}

function put(bytes: Uint8Array, terminate = false) {
  const length = bytes.length + (terminate ? 1 : 0);
  const pointer = exports!.web_alloc(length);
  const memory = new Uint8Array(exports!.memory.buffer, pointer, length);
  memory.set(bytes);
  if (terminate) memory[bytes.length] = 0;
  return [pointer, length] as const;
}

// Strings are passed as UTF-8 with a trailing NUL; byte arrays as pointer and length
export function call<T = Record<string, unknown>>(name: string, ...args: (number | string | Uint8Array)[]): T {
  const raw: number[] = [];
  const buffers: (readonly [number, number])[] = [];
  for (const arg of args) {
    if (typeof arg === "number") { raw.push(arg); continue; }
    const buffer = typeof arg === "string" ? put(encoder.encode(arg), true) : put(arg);
    buffers.push(buffer);
    raw.push(buffer[0]);
    if (typeof arg !== "string") raw.push(buffer[1]);
  }
  const pointer = exports![`bitwasm_ios_engine_${name}`](...raw);
  for (const [at, length] of buffers) {
    new Uint8Array(exports!.memory.buffer, at, length).fill(0);
    exports!.web_free(at, length);
  }
  const memory = new Uint8Array(exports!.memory.buffer);
  let end = pointer;
  while (memory[end] !== 0) end++;
  const reply = JSON.parse(decoder.decode(memory.slice(pointer, end)));
  exports!.bitwasm_ios_engine_free_string(pointer);
  if (!reply.ok) throw reply.error;
  return reply.data as T;
}
