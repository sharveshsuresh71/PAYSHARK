import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a Base32 string into a Buffer.
 */
function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${clean[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Encodes a Buffer into a Base32 string.
 */
function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Generate a cryptographically secure 20-byte Base32 secret for TOTP.
 */
export function generateTOTPSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Calculate the 6-digit TOTP token for a given counter and secret.
 */
function generateTokenForCounter(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1_000_000;

  return code.toString().padStart(6, '0');
}

/**
 * Generate current TOTP code for a base32 secret.
 */
export function generateTOTP(secretBase32: string, timestampMs = Date.now()): string {
  const secretBuffer = base32Decode(secretBase32);
  const counter = Math.floor(timestampMs / 1000 / 30);
  return generateTokenForCounter(secretBuffer, counter);
}

/**
 * Verify a 6-digit TOTP token against a secret with clock drift window (-1, 0, +1 step).
 */
export function verifyTOTP(token: string, secretBase32: string, timestampMs = Date.now()): boolean {
  if (!/^\d{6}$/.test(token.trim())) {
    return false;
  }
  const secretBuffer = base32Decode(secretBase32);
  const currentCounter = Math.floor(timestampMs / 1000 / 30);

  // Check window of -1, 0, +1 steps (±30s drift)
  for (let offset = -1; offset <= 1; offset++) {
    const expected = generateTokenForCounter(secretBuffer, currentCounter + offset);
    if (crypto.timingSafeEqual(Buffer.from(token.trim()), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}
