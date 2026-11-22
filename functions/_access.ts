/**
 * Verifies the Cloudflare Access token on each API request (RS256, signed by
 * the team's Access certs) and returns the person's email. Without a valid
 * token for this application, the API answers 401 — even if Access were
 * ever switched off in front of the site.
 */
export interface AccessEnv {
  ACCESS_TEAM: string;
  ACCESS_AUD: string;
}

interface Jwk extends JsonWebKey { kid: string }

let certs: { keys: Jwk[]; at: number } | null = null;

async function accessKeys(team: string): Promise<Jwk[]> {
  if (certs && Date.now() - certs.at < 60 * 60 * 1000) return certs.keys;
  const res = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('certs');
  const body = (await res.json()) as { keys: Jwk[] };
  certs = { keys: body.keys, at: Date.now() };
  return body.keys;
}

const b64urlToBytes = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

function tokenFrom(request: Request): string | null {
  const h = request.headers.get('Cf-Access-Jwt-Assertion');
  if (h) return h;
  const cookie = request.headers.get('Cookie') ?? '';
  return /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(cookie)?.[1] ?? null;
}

export async function accessEmail(request: Request, env: AccessEnv): Promise<string | null> {
  const token = tokenFrom(request);
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0]))) as { kid?: string; alg?: string };
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1]))) as {
      aud?: string | string[]; exp?: number; iss?: string; email?: string;
    };
    if (header.alg !== 'RS256') return null;
    const jwk = (await accessKeys(env.ACCESS_TEAM)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!ok) return null;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    if (payload.iss !== `https://${env.ACCESS_TEAM}.cloudflareaccess.com`) return null;
    return payload.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}
