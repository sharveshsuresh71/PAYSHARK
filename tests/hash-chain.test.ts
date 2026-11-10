import { describe, it, expect } from "vitest";
import { computeEventHash, verifyHashChain } from "../src/lib/audit/hash-chain";

describe("PAYSHARK AI — Audit Trail Tamper-Evident Hash Chain", () => {
  it("computes deterministic SHA-256 hash irrespective of key insertion order", () => {
    const hash1 = computeEventHash("GENESIS_BLOCK", { b: 2, a: 1, c: 3 });
    const hash2 = computeEventHash("GENESIS_BLOCK", { a: 1, c: 3, b: 2 });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("validates a sequential append-only hash chain", () => {
    const event1 = { action: "AGREEMENT_CREATED", id: "1" };
    const hash1 = computeEventHash(null, event1);

    const event2 = { action: "POLICY_ATTACHED", id: "2" };
    const hash2 = computeEventHash(hash1, event2);

    const event3 = { action: "PAYMENT_HUMAN_APPROVED", id: "3" };
    const hash3 = computeEventHash(hash2, event3);

    const chain = [
      { event_hash: hash1, previous_event_hash: null, event_data: event1 },
      { event_hash: hash2, previous_event_hash: hash1, event_data: event2 },
      { event_hash: hash3, previous_event_hash: hash2, event_data: event3 }
    ];

    const result = verifyHashChain(chain);
    expect(result.valid).toBe(true);
  });

  it("detects tampering when an event payload in the history is altered", () => {
    const event1 = { action: "AGREEMENT_CREATED", id: "1" };
    const hash1 = computeEventHash(null, event1);

    const event2 = { action: "PAYMENT_HUMAN_APPROVED", amount: "100.00" };
    const hash2 = computeEventHash(hash1, event2);

    // Attacker modifies historical amount to $500.00 without recomputing hashes
    const tamperedChain = [
      { event_hash: hash1, previous_event_hash: null, event_data: event1 },
      { event_hash: hash2, previous_event_hash: hash1, event_data: { action: "PAYMENT_HUMAN_APPROVED", amount: "500.00" } }
    ];

    const result = verifyHashChain(tamperedChain);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
  });

  it("detects tampering when a block's previous hash pointer is altered", () => {
    const event1 = { action: "AGREEMENT_CREATED", id: "1" };
    const hash1 = computeEventHash(null, event1);

    const event2 = { action: "POLICY_ATTACHED", id: "2" };
    const hash2 = computeEventHash(hash1, event2);

    const brokenChain = [
      { event_hash: hash1, previous_event_hash: null, event_data: event1 },
      { event_hash: hash2, previous_event_hash: "FORGED_PREVIOUS_HASH", event_data: event2 }
    ];

    const result = verifyHashChain(brokenChain);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
  });
});
