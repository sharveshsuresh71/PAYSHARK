import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "../src/lib/security/policy-engine";

describe("PAYSHARK AI — Policy Engine (13 Deterministic Rules)", () => {
  const basePolicy = {
    status: "ACTIVE",
    expiresAt: null,
    maximumAmount: "250.00",
    currency: "USD",
    allowedMerchants: ["Elena Rostova", "seller@example.com", "Acme Cloud"],
    allowedCategories: ["software", "engineering", "deliverables"],
    maximumTransactions: 10,
    usedTransactions: 1,
    requireHumanApproval: true
  };

  const baseAgreement = {
    status: "ACTIVE",
    confirmed: true,
    version: 1,
    purpose: "Software engineering deliverables",
    amount: "500.00",
    currency: "USD"
  };

  const baseRequest = {
    amount: "150.00",
    currency: "USD",
    merchant: "Elena Rostova",
    merchantId: "seller@example.com",
    purpose: "Software engineering deliverables milestone 1",
    agreementVersion: 1,
    policyVersion: 1
  };

  it("approves for review when all deterministic rules pass and human approval is required", () => {
    const result = evaluatePolicy({
      policy: basePolicy,
      agreement: baseAgreement,
      request: baseRequest,
      policyVersion: 1
    });

    expect(result.decision).toBe("APPROVED_FOR_REVIEW");
    expect(result.reviewRequired).toBe(true);
    expect(result.reasonCodes).toHaveLength(0);
    expect(result.checks.every(c => c.passed)).toBe(true);
  });

  it("blocks payment when amount exceeds policy limit (Rule 5: AMOUNT_EXCEEDED)", () => {
    const result = evaluatePolicy({
      policy: basePolicy,
      agreement: baseAgreement,
      request: { ...baseRequest, amount: "300.00" },
      policyVersion: 1
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("AMOUNT_EXCEEDED");
  });

  it("blocks payment when currency does not match (Rule 6: CURRENCY_MISMATCH)", () => {
    const result = evaluatePolicy({
      policy: basePolicy,
      agreement: baseAgreement,
      request: { ...baseRequest, currency: "EUR" },
      policyVersion: 1
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("CURRENCY_MISMATCH");
  });

  it("blocks payment when merchant is not in allowlist (Rule 7: MERCHANT_NOT_ALLOWED)", () => {
    const result = evaluatePolicy({
      policy: basePolicy,
      agreement: baseAgreement,
      request: { ...baseRequest, merchant: "Untrusted Vendor Ltd", merchantId: "untrusted_01" },
      policyVersion: 1
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("MERCHANT_NOT_ALLOWED");
  });

  it("SCENARIO D: strictly BLOCKS and flags for HUMAN REVIEW on purpose mismatch", () => {
    const result = evaluatePolicy({
      policy: basePolicy,
      agreement: baseAgreement,
      request: {
        ...baseRequest,
        purpose: "Luxury casino resort travel accommodations and gift cards"
      },
      policyVersion: 1
    });

    // User's specific answer: BOTH NEED FIRST REVIEWED AND BLOCKED
    expect(result.decision).toBe("BLOCKED");
    expect(result.reviewRequired).toBe(true);
    expect(result.reasonCodes).toContain("PURPOSE_NOT_ALLOWED");
    expect(result.explanation).toContain("BLOCKED");
    expect(result.explanation).toContain("HUMAN REVIEW");
  });

  it("blocks payment when transaction limit is exhausted (Rule 9: LIMIT_EXHAUSTED)", () => {
    const result = evaluatePolicy({
      policy: { ...basePolicy, usedTransactions: 10, maximumTransactions: 10 },
      agreement: baseAgreement,
      request: baseRequest,
      policyVersion: 1
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("LIMIT_EXHAUSTED");
  });

  it("blocks payment when policy is expired (Rule 2: POLICY_EXPIRED)", () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const result = evaluatePolicy({
      policy: { ...basePolicy, expiresAt: pastDate },
      agreement: baseAgreement,
      request: baseRequest,
      policyVersion: 1
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("POLICY_EXPIRED");
  });

  it("blocks payment when agreement is not confirmed by both parties (Rule 4: AGREEMENT_NOT_CONFIRMED)", () => {
    const result = evaluatePolicy({
      policy: basePolicy,
      agreement: { ...baseAgreement, confirmed: false },
      request: baseRequest,
      policyVersion: 1
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("AGREEMENT_NOT_CONFIRMED");
  });

  it("blocks payment when request binds to outdated agreement version (Rule 10: AGREEMENT_VERSION_MISMATCH)", () => {
    const result = evaluatePolicy({
      policy: basePolicy,
      agreement: { ...baseAgreement, version: 2 },
      request: { ...baseRequest, agreementVersion: 1 },
      policyVersion: 1
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("AGREEMENT_VERSION_MISMATCH");
  });

  it("uses decimal precision and avoids floating point errors", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in standard JavaScript IEEE 754 float
    const result = evaluatePolicy({
      policy: { ...basePolicy, maximumAmount: "0.30" },
      agreement: { ...baseAgreement, amount: "0.30" },
      request: { ...baseRequest, amount: "0.30" },
      policyVersion: 1
    });

    expect(result.decision).toBe("APPROVED_FOR_REVIEW");
    expect(result.reasonCodes).toHaveLength(0);
  });
});
