// Shared credential helper for edge functions.
// - Reads a credential preferring Deno.env (Supabase Edge Function Secret),
//   falling back to an encrypted value in `site_settings` under `cred_<NAME>`.
// - Encryption: AES-GCM using APP_ENC_KEY (hex, 32 bytes). Stored as
//   { v:1, iv:<b64>, ct:<b64> } inside site_settings.value (jsonb).

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-f]/gi, "");
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("APP_ENC_KEY") || "";
  if (!raw) throw new Error("APP_ENC_KEY not configured");
  let keyBytes: Uint8Array;
  if (/^[0-9a-f]+$/i.test(raw) && raw.length >= 64) {
    keyBytes = hexToBytes(raw).slice(0, 32);
  } else {
    // Derive 32 bytes from arbitrary secret via SHA-256.
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    keyBytes = new Uint8Array(buf);
  }
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptValue(plain: string): Promise<{ v: number; iv: string; ct: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return { v: 1, iv: b64encode(iv), ct: b64encode(new Uint8Array(ctBuf)) };
}

export async function decryptValue(payload: unknown): Promise<string | null> {
  try {
    const p = payload as { v?: number; iv?: string; ct?: string };
    if (!p || !p.iv || !p.ct) return null;
    const key = await getKey();
    const buf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(p.iv) },
      key,
      b64decode(p.ct),
    );
    return new TextDecoder().decode(buf);
  } catch (_e) {
    return null;
  }
}

/**
 * Resolve a credential by name.
 * Order: Deno.env (Supabase Edge Function Secret) → encrypted site_settings.cred_<NAME>.
 * Returns empty string if not found.
 */
export async function getCredential(admin: any, name: string): Promise<string> {
  const fromEnv = Deno.env.get(name);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  try {
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", `cred_${name}`)
      .maybeSingle();
    if (!data?.value) return "";
    const dec = await decryptValue(data.value);
    return dec || "";
  } catch {
    return "";
  }
}

/** Load many credentials in one shot (single query for the site_settings side). */
export async function getCredentials(
  admin: any,
  names: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const need: string[] = [];
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v && v.length > 0) out[n] = v;
    else need.push(n);
  }
  if (need.length === 0) return out;
  try {
    const { data } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", need.map((n) => `cred_${n}`));
    for (const row of data || []) {
      const name = String(row.key).replace(/^cred_/, "");
      const dec = await decryptValue(row.value);
      out[name] = dec || "";
    }
  } catch {
    // leave missing
  }
  for (const n of names) if (!(n in out)) out[n] = "";
  return out;
}