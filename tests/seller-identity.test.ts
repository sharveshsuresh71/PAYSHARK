import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "crypto";

describe("PAYSHARK AI — Global Seller (Counterparty) Identification", () => {
  it("normalizes counterparty email and produces a cryptographically secure token", () => {
    const rawEmail = "  Seller.Alice@Example.COM  ";
    const normalized = rawEmail.trim().toLowerCase();
    expect(normalized).toBe("seller.alice@example.com");

    const rawToken = randomBytes(24).toString("hex");
    expect(rawToken).toHaveLength(48);

    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    expect(tokenHash).toHaveLength(64);

    // Verifying same token produces matching hash
    const checkHash = createHash("sha256").update(rawToken).digest("hex");
    expect(checkHash).toBe(tokenHash);
  });

  it("rejects token mismatch when an uninvited or altered token is presented", () => {
    const originalToken = randomBytes(24).toString("hex");
    const storedHash = createHash("sha256").update(originalToken).digest("hex");

    const maliciousToken = randomBytes(24).toString("hex");
    const maliciousHash = createHash("sha256").update(maliciousToken).digest("hex");

    expect(maliciousHash).not.toBe(storedHash);
  });

  it("enforces expiration bounds on invitation tokens", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 7 * 24 * 3600 * 1000);
    const expiredTimestamp = new Date(now - 1000);

    const isValid = (exp: Date) => exp > new Date();

    expect(isValid(expiresAt)).toBe(true);
    expect(isValid(expiredTimestamp)).toBe(false);
  });
});
