import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { analyzeAgreement } from "@/lib/ai/groq";
import { ok, fail } from "@/lib/http";
import { createHash } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const agreement = await repository.getAgreement(id);

    if (!agreement) {
      return fail("NOT_FOUND", "Agreement not found", 404);
    }

    if (agreement.buyer_id !== user.id && agreement.seller_id !== user.id) {
      return fail("FORBIDDEN", "Only authorized parties may analyze this agreement", 403);
    }

    // AI extraction (untrusted text treated as data)
    const terms = await analyzeAgreement(agreement.original_text);

    const contentHash = createHash("sha256")
      .update(JSON.stringify(terms, Object.keys(terms).sort()))
      .digest("hex");

    const newStatus = terms.missing_information.length > 1 ? "NEEDS_CLARIFICATION" : "PENDING_CONFIRMATION";

    const version = await repository.createAgreementVersion({
      agreement_id: id,
      version_number: 1,
      structured_terms: terms,
      content_hash: contentHash,
      created_by: user.id
    });

    const updated = await repository.updateAgreement(id, {
      extracted_terms: terms,
      amount: terms.amount || "250.00",
      currency: terms.currency || "USD",
      deadline: terms.deadline || null,
      status: newStatus,
      current_version: 1
    });

    await repository.appendAuditLog({
      actor_id: user.id,
      entity_type: "agreement",
      entity_id: id,
      action: "AGREEMENT_ANALYZED",
      event_data: {
        agreement_id: id,
        version_number: 1,
        content_hash: contentHash,
        status: newStatus,
        completeness_percent: terms.completeness_percent
      }
    });

    return ok({ agreement: updated, version, terms });
  } catch (err) {
    return fail("AI_UNAVAILABLE", err instanceof Error ? err.message : "Agreement analysis failed", 500);
  }
}
