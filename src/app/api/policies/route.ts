import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { policySchema } from "@/lib/validation/schemas";
import { ok, fail } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const policies = await repository.listPoliciesForOwner(user.id);
    return ok(policies);
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to load policies", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => null);
    const parsed = policySchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "Invalid policy data", 422, parsed.error.flatten());
    }

    const agreement = await repository.getAgreement(parsed.data.agreement_id);
    if (!agreement) {
      return fail("NOT_FOUND", "Linked agreement not found", 404);
    }
    if (agreement.buyer_id !== user.id) {
      return fail("FORBIDDEN", "You can only attach policies to agreements you own", 403);
    }

    // Policy can only be ACTIVE if the linked agreement is ACTIVE
    const initialStatus = agreement.status === "ACTIVE" ? "ACTIVE" : "DRAFT";

    const policy = await repository.createSpendingPolicy({
      owner_id: user.id,
      agreement_id: parsed.data.agreement_id,
      policy_name: parsed.data.policy_name,
      maximum_amount: parsed.data.maximum_amount,
      currency: parsed.data.currency,
      allowed_merchants: parsed.data.allowed_merchants,
      allowed_categories: parsed.data.allowed_categories,
      maximum_transactions: parsed.data.maximum_transactions,
      require_human_approval: parsed.data.require_human_approval,
      expires_at: parsed.data.expires_at || null,
      status: initialStatus
    });

    await repository.appendAuditLog({
      actor_id: user.id,
      entity_type: "policy",
      entity_id: policy.id,
      action: "POLICY_CREATED",
      event_data: {
        policy_id: policy.id,
        policy_name: policy.policy_name,
        maximum_amount: policy.maximum_amount,
        status: policy.status,
        linked_agreement_id: agreement.id
      }
    });

    return ok(policy, 201);
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to create policy", 500);
  }
}
