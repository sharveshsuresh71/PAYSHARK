import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { captureSandboxOrder } from "@/lib/payments/paypal";
import { fail, ok } from "@/lib/http";

const schema = z.object({
  paypal_order_id: z.string().min(3)
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "paypal_order_id is required", 422);
    }

    const { paypal_order_id } = parsed.data;

    // Call PayPal capture server-side
    const captureResult = await captureSandboxOrder(paypal_order_id);

    // Update transaction record
    const updatedTx = await repository.captureTransaction(paypal_order_id, captureResult.id);

    if (updatedTx) {
      // Consume the single-use approval
      const approval = await repository.getActiveApprovalForRequest(updatedTx.payment_request_id);
      if (approval) {
        await repository.consumeApproval(approval.id);
      }
      await repository.updatePaymentRequestStatus(updatedTx.payment_request_id, "COMPLETED");

      await repository.appendAuditLog({
        actor_id: user.id,
        entity_type: "transaction",
        entity_id: updatedTx.id,
        action: "PAYPAL_ORDER_CAPTURED",
        event_data: {
          transaction_id: updatedTx.id,
          paypal_order_id,
          capture_id: captureResult.id,
          status: "CAPTURED",
          approval_consumed: approval ? approval.id : null
        }
      });
    }

    return ok({
      captured: true,
      capture_id: captureResult.id,
      status: captureResult.status,
      simulated: captureResult.simulated || false
    });
  } catch (err) {
    return fail("PAYPAL_ERROR", err instanceof Error ? err.message : "PayPal capture failed", 502);
  }
}
