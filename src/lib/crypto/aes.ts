import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

function getSecretKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && /^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }
  // Fallback deterministic derivation for development/test environments
  return crypto.createHash('sha256').update(envKey || 'payshark-ai-default-encryption-key-2026').digest();
}

/**
 * Encrypt plaintext using AES-256-GCM with authenticated context.
 * Returns base64 string: [12-byte IV][16-byte Auth Tag][Ciphertext]
 */
export function encryptData(plaintext: string, context: string = 'payshark'): string {
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt base64 ciphertext using AES-256-GCM.
 * Rejects tampered data or wrong context with an error.
 */
export function decryptData(ciphertextBase64: string, context: string = 'payshark'): string {
  const key = getSecretKey();
  const raw = Buffer.from(ciphertextBase64, 'base64');

  if (raw.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('INVALID_CIPHERTEXT: Buffer too short');
  }

  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  decipher.setAAD(Buffer.from(context, 'utf8'));

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
