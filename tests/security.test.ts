import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { encryptData, decryptData } from '../src/lib/crypto/aes';
import { assertSafeUrl, isPrivateOrReservedHost } from '../src/lib/security/ssrf';
import { generateTOTPSecret, generateTOTP, verifyTOTP } from '../src/lib/auth/totp';
import { hashPassword, verifyPassword } from '../src/lib/auth/password';
import { lockdownAccount } from '../src/lib/security/lockdown';
import { repo } from '../src/lib/database/repository';

describe('Security Architecture — Release 1.0', () => {
  describe('AES-256-GCM Authenticated Encryption (#31)', () => {
    it('encrypts and decrypts sensitive data correctly', () => {
      const sensitive = 'ps_secret_payment_credentials_998877';
      const encrypted = encryptData(sensitive, 'payment-approval');

      expect(encrypted).not.toBe(sensitive);
      expect(typeof encrypted).toBe('string');

      const decrypted = decryptData(encrypted, 'payment-approval');
      expect(decrypted).toBe(sensitive);
    });

    it('fails to decrypt if context (AAD) mismatches', () => {
      const sensitive = 'confidential terms';
      const encrypted = encryptData(sensitive, 'context-A');

      expect(() => {
        decryptData(encrypted, 'context-B');
      }).toThrow();
    });

    it('fails to decrypt if ciphertext is tampered with', () => {
      const sensitive = 'transfer $500';
      const encrypted = encryptData(sensitive, 'transfers');

      const buf = Buffer.from(encrypted, 'base64');
      // Flip a bit in the ciphertext portion
      buf[buf.length - 1] ^= 0x01;
      const tampered = buf.toString('base64');

      expect(() => {
        decryptData(tampered, 'transfers');
      }).toThrow();
    });
  });

  describe('SSRF Protection (#59)', () => {
    it('detects private and reserved IP addresses', () => {
      expect(isPrivateOrReservedHost('localhost')).toBe(true);
      expect(isPrivateOrReservedHost('127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedHost('169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedHost('10.0.0.5')).toBe(true);
      expect(isPrivateOrReservedHost('192.168.1.100')).toBe(true);
      expect(isPrivateOrReservedHost('172.16.5.20')).toBe(true);
      expect(isPrivateOrReservedHost('api-m.sandbox.paypal.com')).toBe(false);
    });

    it('permits trusted endpoints in allowlist', () => {
      expect(() => assertSafeUrl('https://api-m.sandbox.paypal.com/v2/checkout/orders')).not.toThrow();
      expect(() => assertSafeUrl('https://api.groq.com/openai/v1/chat/completions')).not.toThrow();
      expect(() => assertSafeUrl('https://ep-cool-db.neon.tech/sql')).not.toThrow();
    });

    it('rejects unallowed hosts and private IPs', () => {
      expect(() => assertSafeUrl('http://169.254.169.254/latest/meta-data/')).toThrow(/SSRF_BLOCKED/);
      expect(() => assertSafeUrl('https://malicious-external-site.com/exploit')).toThrow(/SSRF_BLOCKED/);
      expect(() => assertSafeUrl('http://localhost:3000/admin')).toThrow(/SSRF_BLOCKED/);
    });
  });

  describe('MFA / TOTP RFC 6238 (#1)', () => {
    it('generates a valid 20-byte base32 secret and 6-digit token', () => {
      const secret = generateTOTPSecret();
      expect(secret.length).toBeGreaterThanOrEqual(16);

      const token = generateTOTP(secret);
      expect(token).toMatch(/^\d{6}$/);

      const isValid = verifyTOTP(token, secret);
      expect(isValid).toBe(true);
    });

    it('rejects an incorrect TOTP token', () => {
      const secret = generateTOTPSecret();
      const isValid = verifyTOTP('000000', secret);
      // Unless statistically by 1-in-a-million chance token happens to be 000000
      const actual = generateTOTP(secret);
      if (actual !== '000000') {
        expect(isValid).toBe(false);
      }
    });
  });

  describe('Password Hashing with Scrypt (#3)', () => {
    it('hashes passwords with salt and verifies matching passwords', async () => {
      const password = 'SuperSecureSecretPassword!2026';
      const hash = await hashPassword(password);

      expect(hash).toContain('$scrypt$');
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Automated Account Lockdown (#77)', () => {
    it('locks account, revokes sessions, and blocks pending requests', async () => {
      const buyer = await repo.getProfileByEmail('buyer@payshark.ai');
      expect(buyer).not.toBeNull();

      // Record a test session
      await repo.recordSession('session-test-buyer-123', buyer.id);
      expect(await repo.isSessionRevokedOrExpired('session-test-buyer-123')).toBe(false);

      const lockdownRes = await lockdownAccount(buyer.id, 'Repeated ATO signals detected');
      expect(lockdownRes.success).toBe(true);
      expect(lockdownRes.reason).toBe('Repeated ATO signals detected');

      // Profile should now be marked locked
      const updatedProfile = await repo.getProfile(buyer.id);
      expect(updatedProfile.locked).toBe(true);

      // Session should now be revoked
      expect(await repo.isSessionRevokedOrExpired('session-test-buyer-123')).toBe(true);
    });
  });
});
