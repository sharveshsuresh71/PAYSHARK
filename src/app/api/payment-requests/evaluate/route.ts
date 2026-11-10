import { NextRequest } from "next/server";
import { paymentRequestSchema } from "@/lib/validation/schemas";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { evaluatePolicy } from "@/lib/security/policy-engine";
import { evaluateRisk } from "@/lib/security/risk-engine";
import { ok, fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const parsed = paymentRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "Invalid payment request", 422, parsed.error.flatten());
    }

    const policy = await repository.getSpendingPolicy(parsed.data.policy_id);
    if (!policy) return fail("NOT_FOUND", "Policy not found", 404);

    const agreement = await repository.getAgreement(parsed.data.agreement_id);
    if (!agreement) return fail("NOT_FOUND", "Agreement not found", 404);

    const versions = await repository.getVersions(agreement.id);
    const activeVersion = versions.find(v => v.version_number === agreement.current_version);
    let confirmed = false;
    if (activeVersion && agreement.status === "ACTIVE") {
      const confirmations = await repository.getConfirmationsForVersion(activeVersion.id);
      const buyerConf = confirmations.some(c => c.user_id === agreement.buyer_id && c.confirmation_status === "CONFIRMED");
      const sellerConf = agreement.seller_id ? confirmations.some(c => c.user_id === agreement.seller_id && c.confirmation_status === "CONFIRMED") : false;
      confirmed = buyerConf && sellerConf;
    }

    const agreementPurpose = agreement.extracted_terms?.transaction_purpose || agreement.title;
    const policyResult = evaluatePolicy({
      policy: {
        status: policy.status,
        expiresAt: policy.expires_at,
        maximumAmount: policy.maximum_amount,
        currency: policy.currency,
        allowedMerchants: policy.allowed_merchants || [],
        allowedCategories: policy.allowed_categories || [],
        maximumTransactions: policy.maximum_transactions,
        usedTransactions: policy.used_transactions,
        requireHumanApproval: policy.require_human_approval
      },
      agreement: {
        status: agreement.status,
        confirmed,
        version: agreement.current_version,
        purpose: agreementPurpose,
        amount: agreement.amount || "0.00",
        currency: agreement.currency || policy.currency
      },
      request: {
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        merchant: parsed.data.merchant,
        merchantId: parsed.data.merchant_id,
        purpose: parsed.data.purpose,
        agreementVersion: agreement.current_version,
        policyVersion: policy.version
      },
      policyVersion: policy.version
    });

    const riskResult = evaluateRisk({
      requestedAmount: parsed.data.amount,
      policyMaximumAmount: policy.maximum_amount,
      merchant: parsed.data.merchant,
      purpose: parsed.data.purpose,
      allowedMerchants: policy.allowed_merchants || [],
      allowedCategories: policy.allowed_categories || []
    });

    return ok({
      decision: policyResult.decision,
      reviewRequired: policyResult.reviewRequired,
      explanation: policyResult.explanation,
      reason_codes: policyResult.reasonCodes,
      checks: policyResult.checks,
      risk_score: riskResult.score,
      risk_reasons: riskResult.reasons
    });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Evaluation failed", 500);
  }
}
