import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { ok, fail } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const agents = await repository.listAgentsForOwner(user.id);
    return ok(agents);
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to load agents", 500);
  }
}
