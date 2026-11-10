import { NextRequest } from "next/server";
import { getCurrentUser, authenticateAgentHeader } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { paymentRequestSchema } from "@/lib/validation/schemas";
import { evaluatePolicy } from "@/lib/security/policy-engine";
import { evaluateRisk } from "@/lib/security/risk-engine";
import { ok, fail } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const requests = await repository.listPaymentRequestsForOwner(user.id);
    return ok(requests);
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to load payment requests", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller (Agent API Key or UI Session)
    const authHeader = req.headers.get("authorization");
    let ownerId: string;
    let agentId: string | null = null;

    if (authHeader) {
      const agentAuth = await authenticateAgentHeader(authHeader);
      if (!agentAuth) {
        return fail("UNAUTHENTICATED", "Invalid or revoked agent API key", 401);
      }
      ownerId = agentAuth.owner.id;
      agentId = agentAuth.agent.id;
    } else {
      const sessionUser = await getCurrentUser();
      if (!sessionUser) return fail("UNAUTHENTICATED", "Sign in required", 401);
      ownerId = sessionUser.id;
    }

    // 2. Validate payload
    const body = await req.json().catch(() => null);
    const parsed = paymentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "Invalid payment request payload", 422, parsed.error.flatten());
    }

    // 3. Idempotency check (Replay prevention)
    const existing = await repository.getPaymentRequestByIdempotency(agentId, parsed.data.idempotency_key);
    if (existing) {
      return ok({
        id: existing.id,
        decision: existing.decision,
        status: existing.status,
        reason_codes: existing.policy_result?.reasonCodes || [],
        checks: existing.policy_result?.checks || [],
        risk_score: existing.risk_score,
        idempotent_replayed: true
      });
    }

    // 4. Load ownership-scoped policy and agreement
    const policy = await repository.getSpendingPolicy(parsed.data.policy_id);
    if (!policy || policy.owner_id !== ownerId) {
      return fail("NOT_FOUND", "Policy not found or not owned by user", 404);
    }

    const agreement = await repository.getAgreement(parsed.data.agreement_id);
    if (!agreement) {
      return fail("NOT_FOUND", "Agreement not found", 404);
    }

    // 5. Verify mutual confirmations for active version
    const versions = await repository.getVersions(agreement.id);
    const activeVersion = versions.find(v => v.version_number === agreement.current_version);
    let confirmed = false;
    if (activeVersion && agreement.status === "ACTIVE") {
      const confirmations = await repository.getConfirmationsForVersion(activeVersion.id);
      const buyerConf = confirmations.some(c => c.user_id === agreement.buyer_id && c.confirmation_status === "CONFIRMED");
      const sellerConf = agreement.seller_id ? confirmations.some(c => c.user_id === agreement.seller_id && c.confirmation_status === "CONFIRMED") : false;
      confirmed = buyerConf && sellerConf;
    }

    // 6. Run pure deterministic policy engine
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

    // 7. Calculate risk score
    const riskResult = evaluateRisk({
      requestedAmount: parsed.data.amount,
      policyMaximumAmount: policy.maximum_amount,
      merchant: parsed.data.merchant,
      purpose: parsed.data.purpose,
      allowedMerchants: policy.allowed_merchants || [],
      allowedCategories: policy.allowed_categories || []
    });

    // 8. Persist payment request
    const requestRow = await repository.createPaymentRequest({
      owner_id: ownerId,
      agreement_id: agreement.id,
      policy_id: policy.id,
      agent_id: agentId,
      merchant: parsed.data.merchant,
      merchant_id: parsed.data.merchant_id,
      purpose: parsed.data.purpose,
      requested_amount: parsed.data.amount,
      currency: parsed.data.currency,
      risk_score: riskResult.score,
      risk_reasons: riskResult.reasons,
      policy_result: policyResult,
      decision: policyResult.decision,
      idempotency_key: parsed.data.idempotency_key,
      agreement_version: agreement.current_version,
      policy_version: policy.version
    });

    // 9. Append audit log in cryptographic hash chain
    await repository.appendAuditLog({
      actor_id: ownerId,
      entity_type: "payment_request",
      entity_id: requestRow.id,
      action: "PAYMENT_REQUEST_EVALUATED",
      event_data: {
        request_id: requestRow.id,
        decision: policyResult.decision,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        merchant: parsed.data.merchant,
        reasonCodes: policyResult.reasonCodes,
        reviewRequired: policyResult.reviewRequired
      }
    });

    return ok(
      {
        id: requestRow.id,
        decision: policyResult.decision,
        reviewRequired: policyResult.reviewRequired,
        explanation: policyResult.explanation,
        reason_codes: policyResult.reasonCodes,
        checks: policyResult.checks,
        risk_score: riskResult.score,
        risk_reasons: riskResult.reasons
      },
      201
    );
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Payment request processing failed", 500);
  }
}
