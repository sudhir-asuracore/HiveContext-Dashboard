export const SESSION_COOKIE_NAME = 'hivecontext_session';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface OwnerSession {
  owner: string;
  user: {
    email: string;
  };
  expiresAt: number;
}

function base64UrlEncode(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function signingKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  }

  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function sessionLifetimeSeconds(): number {
  const configured = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 8);
  if (!Number.isInteger(configured) || configured < 60 || configured > 60 * 60 * 24) {
    throw new Error('SESSION_TTL_SECONDS must be an integer between 60 and 86400.');
  }
  return configured;
}

export async function createSession(owner: string): Promise<OwnerSession> {
  return { owner, user: { email: owner }, expiresAt: Date.now() + sessionLifetimeSeconds() * 1000 };
}

export async function signSession(session: OwnerSession): Promise<string> {
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifySession(token: string): Promise<OwnerSession | null> {
  const [payload, encodedSignature, ...remainder] = token.split('.');
  if (!payload || !encodedSignature || remainder.length > 0) {
    return null;
  }

  const signature = base64UrlDecode(encodedSignature);
  const signatureBuffer = signature?.buffer.slice(signature.byteOffset, signature.byteOffset + signature.byteLength) as ArrayBuffer | undefined;
  if (!signatureBuffer || !(await crypto.subtle.verify('HMAC', await signingKey(), signatureBuffer, encoder.encode(payload)))) {
    return null;
  }

  const decodedPayload = base64UrlDecode(payload);
  if (!decodedPayload) {
    return null;
  }

  try {
    const session = JSON.parse(decoder.decode(decodedPayload)) as OwnerSession;
    if (
      typeof session.owner !== 'string' ||
      typeof session.user?.email !== 'string' ||
      !Number.isInteger(session.expiresAt) ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}