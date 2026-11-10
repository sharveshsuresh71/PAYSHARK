import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { agreementCreateSchema } from "@/lib/validation/schemas";
import { ok, fail } from "@/lib/http";
import { randomBytes, createHash } from "crypto";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const agreements = await repository.listAgreementsForUser(user.id, user.email);
    return ok(agreements);
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to load agreements", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => null);
    const parsed = agreementCreateSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "Invalid agreement payload", 422, parsed.error.flatten());
    }

    // Global Seller Identity: Cryptographically random, single-use, expiring invitation token
    const rawInvitationToken = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(rawInvitationToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const agreement = await repository.createAgreement({
      buyer_id: user.id,
      title: parsed.data.title,
      original_text: parsed.data.original_text,
      counterparty_email: parsed.data.counterparty_email,
      invitation_token_hash: tokenHash,
      invitation_expires_at: expiresAt
    });

    await repository.appendAuditLog({
      actor_id: user.id,
      entity_type: "agreement",
      entity_id: agreement.id,
      action: "AGREEMENT_CREATED",
      event_data: {
        agreement_id: agreement.id,
        title: agreement.title,
        buyer_id: user.id,
        counterparty_email: agreement.counterparty_email,
        status: agreement.status
      }
    });

    return ok(
      {
        agreement,
        invitation_token: rawInvitationToken,
        invitation_url: `/agreements/${agreement.id}?invite=${rawInvitationToken}`
      },
      201
    );
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to create agreement", 500);
  }
}
