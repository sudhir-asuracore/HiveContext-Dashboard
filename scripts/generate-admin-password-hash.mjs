import { pbkdf2Sync, randomBytes } from 'node:crypto';

const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const HASH_ALGORITHM = 'sha256';

const password = process.argv[2];

if (!password || process.argv.length !== 3) {
  console.error('Usage: npm run generate:admin-password-hash -- <password>');
  process.exit(1);
}

const salt = randomBytes(16).toString('base64url');
const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, HASH_ALGORITHM).toString('base64url');
const verifier = `pbkdf2-sha256$${ITERATIONS}$${salt}$${hash}`;

// Next.js expands unescaped `$` references in `.env*` files. Escape them so
// the emitted assignment can be pasted into `.env.local` without corruption.
console.log(`ADMIN_PASSWORD_HASH=${verifier.replaceAll('$', '\\$')}`);