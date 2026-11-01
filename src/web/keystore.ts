import { tr } from "../views";

// Keys saved by the installed app are sealed in the engine with a secret this app's passkey derives
// (WebAuthn PRF), which takes Face ID, a fingerprint or the device passcode each time
const SALT = new TextEncoder().encode("bitwasm-signer stored seed v1");
const PASSKEY = "bithanko.passkey";
const STORAGE = "bithanko.storage";
const SAVED = "bithanko.saved";

export type Saved = { name?: string; mnemonic: boolean; fingerprint: string; nonce: string; data: string; created: string };
type Prf = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
};

export const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
export const unhex = (text: string) => Uint8Array.from(text.match(/../g) ?? [], (b) => parseInt(b, 16));
const b64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export const storageOn = () => read(STORAGE) === "on" && read(PASSKEY) !== null;
// Safari has PRF from iOS 18; before it a passkey is made but cannot seal anything, so it is not offered
const oldIos = Number(/OS (\d+)_\d+(?:_\d+)? like Mac OS X/.exec(navigator.userAgent)?.[1] ?? 99) < 18;
export const canStore = () => "PublicKeyCredential" in window && !oldIos;
export const savedKeys = (): Saved[] => JSON.parse(read(SAVED) ?? "[]");
export const setSavedKeys = (keys: Saved[]) => write(SAVED, keys.length ? JSON.stringify(keys) : null);

// Turns storage on, creating this app's passkey the first time. A passkey without PRF cannot seal
// anything, so storage stays off
export async function enableStorage() {
  if (read(PASSKEY) === null) {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { id: location.hostname, name: "BitHanko" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "BitHanko", displayName: "BitHanko" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" },
        extensions: { prf: { eval: { first: SALT } } } as AuthenticationExtensionsClientInputs,
      },
    }).catch((error) => {
      // iOS turns the request down without a sheet when no Apple Account with iCloud Keychain is signed in
      throw error instanceof DOMException && error.name === "NotAllowedError"
        ? tr("パスキーを作れませんでした。iPhoneでは、AppleアカウントにサインインしてiCloudキーチェーンをオンにする必要があります。鍵を保存しなくても、メモリのみで使えます。", "The passkey could not be created. On iPhone this needs an Apple Account with iCloud Keychain on. Without saving, keys stay in memory only.")
        : error;
    })) as PublicKeyCredential;
    if (!(credential.getClientExtensionResults() as Prf).prf?.enabled) {
      throw tr("この端末のパスキーでは鍵を保護できないため、保存できません。", "This device's passkeys cannot protect saved keys, so keys cannot be saved.");
    }
    write(PASSKEY, b64(credential.rawId));
  }
  write(STORAGE, "on");
}

// Erases every saved key and forgets the passkey. The passkey itself stays in the device's
// passwords until the user deletes it there; a later switch to saving makes a new one
export function disableStorage() {
  setSavedKeys([]);
  write(PASSKEY, null);
  write(STORAGE, null);
}

// The passkey's secret, after Face ID, a fingerprint or the passcode. The caller zeroes it
export async function passkeySecret(): Promise<Uint8Array> {
  const id = read(PASSKEY);
  if (!id) throw tr("鍵の保存がオフです。", "Key storage is off.");
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: unb64(id) }],
      userVerification: "required",
      extensions: { prf: { eval: { first: SALT } } } as AuthenticationExtensionsClientInputs,
    },
  }).catch((error) => {
    // As when creating it, and also after the device signs out, even with the keychain kept
    throw error instanceof DOMException && error.name === "NotAllowedError"
      ? tr("パスキーを使えませんでした。iPhoneでは、AppleアカウントにサインインしてiCloudキーチェーンをオンにしておく必要があります。", "The passkey could not be used. On iPhone this needs an Apple Account with iCloud Keychain on.")
      : error;
  })) as PublicKeyCredential;
  const secret = (credential.getClientExtensionResults() as Prf).prf?.results?.first;
  if (!secret) throw tr("パスキーから鍵を開くための値を得られませんでした。", "The passkey did not give the secret that opens saved keys.");
  return new Uint8Array(secret);
}
