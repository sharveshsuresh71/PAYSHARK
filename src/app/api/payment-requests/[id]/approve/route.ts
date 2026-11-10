import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { ok, fail } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const paymentRequest = await repository.getPaymentRequest(id);

    if (!paymentRequest) {
      return fail("NOT_FOUND", "Payment request not found", 404);
    }

    if (paymentRequest.owner_id !== user.id) {
      return fail("FORBIDDEN", "Only the policy owner can authorize this payment request", 403);
    }

    // Safety rule: A BLOCKED payment request cannot be approved
    if (paymentRequest.decision === "BLOCKED") {
      return fail(
        "INVALID_STATE",
        "A BLOCKED payment request cannot be approved. Clarification and a new request evaluation are required.",
        409
      );
    }

    // Check existing live approval
    const existingApproval = await repository.getActiveApprovalForRequest(id);
    if (existingApproval) {
      return ok({ message: "Request already approved", approval: existingApproval });
    }

    // Atomic transaction allowance reservation
    const reserved = await repository.reservePolicyUse(paymentRequest.policy_id);
    if (!reserved) {
      return fail("LIMIT_EXHAUSTED", "Policy transaction limit has been exhausted or expired", 409);
    }

    // Create single-use cryptographic authorization binding
    const approval = await repository.createPaymentApproval({
      payment_request_id: paymentRequest.id,
      user_id: user.id,
      approved_amount: paymentRequest.requested_amount,
      currency: paymentRequest.currency,
      merchant_id: paymentRequest.merchant_id,
      agreement_version: paymentRequest.agreement_version,
      policy_version: paymentRequest.policy_version
    });

    await repository.updatePaymentRequestStatus(id, "HUMAN_APPROVED");

    await repository.appendAuditLog({
      actor_id: user.id,
      entity_type: "approval",
      entity_id: approval.id,
      action: "PAYMENT_HUMAN_APPROVED",
      event_data: {
        approval_id: approval.id,
        payment_request_id: paymentRequest.id,
        approved_amount: approval.approved_amount,
        currency: approval.currency,
        merchant_id: approval.merchant_id,
        agreement_version: approval.agreement_version,
        policy_version: approval.policy_version
      }
    });

    return ok({ approved: true, approval });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Approval processing failed", 500);
  }
}
