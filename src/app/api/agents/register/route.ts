import { NextRequest } from "next/server";
import { agentRegisterSchema } from "@/lib/validation/schemas";
import { createHash, randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { ok, fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const input = agentRegisterSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) {
      return fail("VALIDATION_FAILED", "Invalid agent data", 422, input.error.flatten());
    }

    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Sign in required", 401);

    // High entropy secret token: shown once to the caller
    const rawKey = "ps_live_" + randomBytes(32).toString("base64url");
    const credential_hash = createHash("sha256").update(rawKey).digest("hex");

    const data = await repository.registerAgent({
      owner_id: user.id,
      agent_name: input.data.agent_name,
      credential_hash,
      permissions: input.data.permissions
    });

    await repository.appendAuditLog({
      actor_id: user.id,
      entity_type: "agent",
      entity_id: data.id,
      action: "AGENT_REGISTERED",
      event_data: { agent_id: data.id, agent_name: data.agent_name, owner_id: user.id }
    });

    return ok({ ...data, api_key: rawKey }, 201);
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Agent registration failed", 500);
  }
}
