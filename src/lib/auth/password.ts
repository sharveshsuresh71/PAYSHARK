import crypto from 'crypto';
import { promisify } from 'util';

const SCRYPT_PARAMS = {
  N: 32768, // CPU/memory cost
  r: 8,     // block size
  p: 1,     // parallelization
  maxmem: 64 * 1024 * 1024, // 64MB memory limit
  keylen: 64,
};

function deriveScryptKey(password: string, salt: string, keylen: number, options: crypto.ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey as Buffer);
    });
  });
}

/**
 * Hash password using memory-hard scrypt algorithm with per-password CSPRNG salt.
 * Produces format: $scrypt$N=32768,r=8,p=1$<salt>$<hash>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await deriveScryptKey(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: SCRYPT_PARAMS.maxmem,
  });

  return `$scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verify plaintext password against the stored scrypt hash string in constant time.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$');
    // Expected parts: ["", "scrypt", "N=32768,r=8,p=1", salt, hash]
    if (parts.length !== 5 || parts[1] !== 'scrypt') {
      return false;
    }

    const salt = parts[3];
    const originalDerivedKeyHex = parts[4];
    const originalDerivedKey = Buffer.from(originalDerivedKeyHex, 'hex');

    const derivedKey = await deriveScryptKey(password, salt, originalDerivedKey.length, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
      maxmem: SCRYPT_PARAMS.maxmem,
    });

    if (derivedKey.length !== originalDerivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, originalDerivedKey);
  } catch {
    return false;
  }
}
