import { repository } from "@/lib/database/repository";
import { verifyHashChain } from "@/lib/audit/hash-chain";
import { ok, fail } from "@/lib/http";

export async function GET() {
  try {
    const logs = await repository.listAuditLogs(100);
    const verification = verifyHashChain(logs);
    return ok({
      logs,
      count: logs.length,
      chainIntegrityValid: verification.valid,
      brokenAtIndex: verification.brokenAtIndex ?? null
    });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to load audit logs", 500);
  }
}
