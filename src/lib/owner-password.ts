import { pbkdf2 as pbkdf2Callback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2 = promisify(pbkdf2Callback);
const HASH_ALGORITHM = 'sha256';
const KEY_LENGTH = 32;

export async function verifyOwnerPassword(password: string): Promise<boolean> {
  let verifier = process.env.ADMIN_PASSWORD_HASH;
  if (!verifier) {
    throw new Error('ADMIN_PASSWORD_HASH must be configured.');
  }

  // Normalize verifier in case environment systems (like AWS Amplify or .env loaders)
  // injected literal escaping backslashes (e.g. \$210000)
  verifier = verifier.replace(/\\/g, '');

  const [scheme, iterationsValue, salt, expectedHash, ...remainder] = verifier.split('$');
  const iterations = Number(iterationsValue);
  if (scheme !== 'pbkdf2-sha256' || remainder.length > 0 || !Number.isInteger(iterations) || iterations < 100_000 || !salt || !expectedHash) {
    throw new Error('ADMIN_PASSWORD_HASH must use pbkdf2-sha256$iterations$salt$hash format.');
  }

  const actual = await pbkdf2(password, salt, iterations, KEY_LENGTH, HASH_ALGORITHM);
  const expected = Buffer.from(expectedHash, 'base64url');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}