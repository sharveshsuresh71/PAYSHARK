import { NextRequest } from "next/server";
import { evaluatePolicy } from "@/lib/security/policy-engine";
import { ok, fail } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  scenario: z.enum(["A", "B", "C", "D", "E"])
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "Invalid scenario identifier. Expected A, B, C, D, or E", 422);
    }

    const basePolicy = {
      status: "ACTIVE",
      expiresAt: null,
      maximumAmount: "250.00",
      currency: "USD",
      allowedMerchants: ["Elena Rostova", "seller@example.com", "Acme Cloud"],
      allowedCategories: ["software", "engineering", "cloud services", "deliverables"],
      maximumTransactions: 10,
      usedTransactions: 2,
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

    let result;

    switch (parsed.data.scenario) {
      case "A": {
        // Amount exceeds policy maximum (requested $600.00 > $250.00 limit)
        result = evaluatePolicy({
          policy: basePolicy,
          agreement: baseAgreement,
          request: {
            amount: "600.00",
            currency: "USD",
            merchant: "Elena Rostova",
            merchantId: "seller@example.com",
            purpose: "Software engineering deliverables",
            agreementVersion: 1,
            policyVersion: 1
          },
          policyVersion: 1
        });
        break;
      }
      case "B": {
        // Merchant not allowed
        result = evaluatePolicy({
          policy: basePolicy,
          agreement: baseAgreement,
          request: {
            amount: "150.00",
            currency: "USD",
            merchant: "Shadow Crypto Exchange Ltd",
            merchantId: "shadow_crypto_009",
            purpose: "Software engineering deliverables",
            agreementVersion: 1,
            policyVersion: 1
          },
          policyVersion: 1
        });
        break;
      }
      case "C": {
        // Replay / duplicate request
        result = {
          decision: "BLOCKED" as const,
          reviewRequired: false,
          reasonCodes: ["DUPLICATE_REQUEST"],
          checks: [
            {
              code: "DUPLICATE_REQUEST",
              passed: false,
              detail: "Idempotency key 'idemp_key_seed_replay_001' was previously executed. Replay attempt rejected."
            }
          ],
          explanation: "Replay attack rejected by agent idempotency lock."
        };
        break;
      }
      case "D": {
        // Scenario D: Purpose mismatch (User decision: BOTH NEED FIRST REVIEWED AND BLOCKED)
        result = evaluatePolicy({
          policy: basePolicy,
          agreement: baseAgreement,
          request: {
            amount: "200.00",
            currency: "USD",
            merchant: "Elena Rostova",
            merchantId: "seller@example.com",
            purpose: "Luxury casino resort travel accommodations and gift cards",
            agreementVersion: 1,
            policyVersion: 1
          },
          policyVersion: 1
        });
        break;
      }
      case "E": {
        // Approval binding mismatch: agent attempted to execute with altered amount
        result = {
          decision: "BLOCKED" as const,
          reviewRequired: true,
          reasonCodes: ["APPROVAL_BINDING_MISMATCH"],
          checks: [
            {
              code: "APPROVAL_BINDING_MISMATCH",
              passed: false,
              detail: "Approval was bound to $150.00 USD, but payment execution requested $450.00 USD."
            }
          ],
          explanation: "Tampering detected. Single-use human approval binding violated. Payment blocked immediately."
        };
        break;
      }
    }

    return ok({
      scenario: parsed.data.scenario,
      decision: result.decision,
      reviewRequired: result.reviewRequired,
      reasonCodes: result.reasonCodes,
      checks: result.checks,
      explanation: result.explanation
    });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Scenario execution failed", 500);
  }
}
