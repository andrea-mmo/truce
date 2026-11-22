/**
 * End-to-end encryption for sync. The passphrase never leaves the device:
 * PBKDF2 (SHA-256, 310 000 rounds) turns it into an AES-GCM 256 key, kept
 * as a non-extractable CryptoKey. The server only stores ciphertext.
 */
const ITERATIONS = 310_000;
const VERIFIER_TEXT = 'piel-sync-v1';

export const toB64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export function randomSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations: ITERATIONS },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export interface Sealed { iv: string; data: string }

/** `context` (e.g. "products/12") is bound to the ciphertext, so records can't be swapped. */
export async function seal(key: CryptoKey, text: string, context: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) }, key, new TextEncoder().encode(text),
  );
  return { iv: toB64(iv), data: toB64(new Uint8Array(ct)) };
}

export async function open(key: CryptoKey, sealed: Sealed, context: string): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(sealed.iv), additionalData: new TextEncoder().encode(context) }, key, fromB64(sealed.data),
  );
  return new TextDecoder().decode(pt);
}

export const makeVerifier = (key: CryptoKey) => seal(key, VERIFIER_TEXT, 'verifier');

export async function checkVerifier(key: CryptoKey, v: Sealed): Promise<boolean> {
  try { return (await open(key, v, 'verifier')) === VERIFIER_TEXT; } catch { return false; }
}
