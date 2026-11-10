import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { createSandboxOrder } from "@/lib/payments/paypal";
import { fail, ok } from "@/lib/http";

const schema = z.object({
  payment_request_id: z.string().uuid()
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "payment_request_id is required", 422);
    }

    const { payment_request_id } = parsed.data;

    // 1. Load payment request
    const paymentRequest = await repository.getPaymentRequest(payment_request_id);
    if (!paymentRequest) {
      return fail("NOT_FOUND", "Payment request not found", 404);
    }
    if (paymentRequest.owner_id !== user.id) {
      return fail("FORBIDDEN", "Unauthorized access to payment request", 403);
    }

    // 2. Load and verify active, unconsumed single-use approval binding
    const approval = await repository.getActiveApprovalForRequest(payment_request_id);
    if (!approval || approval.status !== "APPROVED") {
      return fail(
        "UNAUTHORIZED",
        "PayPal order creation rejected: No valid, active human approval found for this request.",
        409
      );
    }

    // 3. Strict verification of approval binding
    const bindingMatches =
      approval.approved_amount === paymentRequest.requested_amount &&
      approval.currency === paymentRequest.currency &&
      approval.merchant_id === paymentRequest.merchant_id &&
      approval.agreement_version === paymentRequest.agreement_version &&
      approval.policy_version === paymentRequest.policy_version;

    if (!bindingMatches) {
      await repository.appendAuditLog({
        actor_id: user.id,
        entity_type: "approval",
        entity_id: approval.id,
        action: "APPROVAL_BINDING_MISMATCH_DETECTED",
        event_data: { payment_request_id, approval_id: approval.id }
      });
      return fail("SECURITY_VIOLATION", "Approval binding mismatch. Parameters have been altered.", 409);
    }

    // 4. Call PayPal Sandbox REST API server-side
    const order = await createSandboxOrder({
      amount: paymentRequest.requested_amount,
      currency: paymentRequest.currency,
      paymentRequestId: paymentRequest.id,
      description: paymentRequest.purpose
    });

    // 5. Record transaction in database
    const transaction = await repository.createTransaction({
      payment_request_id: paymentRequest.id,
      paypal_order_id: order.id,
      amount: paymentRequest.requested_amount,
      currency: paymentRequest.currency,
      status: "ORDER_CREATED"
    });

    await repository.updatePaymentRequestStatus(payment_request_id, "PAYMENT_PENDING");

    await repository.appendAuditLog({
      actor_id: user.id,
      entity_type: "transaction",
      entity_id: transaction.id,
      action: "PAYPAL_ORDER_CREATED",
      event_data: {
        transaction_id: transaction.id,
        paypal_order_id: order.id,
        amount: paymentRequest.requested_amount,
        currency: paymentRequest.currency
      }
    });

    return ok({
      paypal_order_id: order.id,
      status: order.status,
      simulated: order.simulated || false
    });
  } catch (err) {
    return fail("PAYPAL_ERROR", err instanceof Error ? err.message : "PayPal order creation failed", 502);
  }
}
