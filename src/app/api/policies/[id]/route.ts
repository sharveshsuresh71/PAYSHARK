import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { ok, fail } from "@/lib/http";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const policy = await repository.getSpendingPolicy(id);

    if (!policy) return fail("NOT_FOUND", "Policy not found", 404);
    if (policy.owner_id !== user.id) return fail("FORBIDDEN", "Access denied", 403);

    const agreement = await repository.getAgreement(policy.agreement_id);
    return ok({ policy, agreement });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to load policy", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const policy = await repository.getSpendingPolicy(id);

    if (!policy) return fail("NOT_FOUND", "Policy not found", 404);
    if (policy.owner_id !== user.id) return fail("FORBIDDEN", "Access denied", 403);

    const updated = await repository.updatePolicyStatus(id, "REVOKED");

    await repository.appendAuditLog({
      actor_id: user.id,
      entity_type: "policy",
      entity_id: id,
      action: "POLICY_REVOKED",
      event_data: { policy_id: id, previous_status: policy.status, status: "REVOKED" }
    });

    return ok({ message: "Policy revoked", policy: updated });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to revoke policy", 500);
  }
}
