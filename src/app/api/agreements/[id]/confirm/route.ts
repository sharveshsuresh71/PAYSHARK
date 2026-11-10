import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { agreementConfirmSchema } from "@/lib/validation/schemas";
import { ok, fail } from "@/lib/http";
import { createHash } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await req.json().catch(() => null);
    const parsed = agreementConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "Invalid confirmation payload", 422, parsed.error.flatten());
    }

    let agreement = await repository.getAgreement(id);
    if (!agreement) return fail("NOT_FOUND", "Agreement not found", 404);

    const versions = await repository.getVersions(id);
    const targetVersion = versions.find(v => v.version_number === parsed.data.version_number);
    if (!targetVersion) {
      return fail("VERSION_NOT_FOUND", `Agreement version ${parsed.data.version_number} does not exist`, 404);
    }

    // Seller Identity Binding Check
    let isSeller = agreement.seller_id === user.id;
    const isBuyer = agreement.buyer_id === user.id;

    // Check invitation token binding if presented or if user email matches counterparty email
    if (!isSeller && !isBuyer) {
      const emailMatches = user.email.toLowerCase() === agreement.counterparty_email.toLowerCase();
      let tokenValid = false;

      if (parsed.data.invitation_token && agreement.invitation_token_hash) {
        const presentedHash = createHash("sha256").update(parsed.data.invitation_token).digest("hex");
        if (presentedHash === agreement.invitation_token_hash) {
          const notExpired = !agreement.invitation_expires_at || new Date(agreement.invitation_expires_at) > new Date();
          tokenValid = notExpired;
        }
      }

      if (emailMatches || tokenValid) {
        agreement = await repository.bindSellerToAgreement(id, user.id, user.email);
        isSeller = true;
      } else {
        return fail("FORBIDDEN", "You are not an authorized party or invited counterparty for this agreement", 403);
      }
    }

    if (parsed.data.action === "reject") {
      await repository.confirmAgreementVersion(id, targetVersion.id, user.id, "REJECTED");
      await repository.updateAgreement(id, { status: "CANCELLED" });
      await repository.appendAuditLog({
        actor_id: user.id,
        entity_type: "agreement",
        entity_id: id,
        action: "AGREEMENT_REJECTED",
        event_data: { agreement_id: id, version_number: targetVersion.version_number, user_id: user.id }
      });
      return ok({ message: "Agreement rejected", status: "CANCELLED" });
    }

    // Record confirmation
    await repository.confirmAgreementVersion(id, targetVersion.id, user.id, "CONFIRMED");

    // Check if both parties have confirmed
    const confirmations = await repository.getConfirmationsForVersion(targetVersion.id);
    const buyerConfirmed = confirmations.some(c => c.user_id === agreement.buyer_id && c.confirmation_status === "CONFIRMED");
    const sellerConfirmed = agreement.seller_id
      ? confirmations.some(c => c.user_id === agreement.seller_id && c.confirmation_status === "CONFIRMED")
      : false;

    let updatedAgreement = agreement;
    const bothConfirmed = buyerConfirmed && sellerConfirmed;

    if (bothConfirmed) {
      updatedAgreement = await repository.updateAgreement(id, { status: "ACTIVE" });
      await repository.appendAuditLog({
        actor_id: user.id,
        entity_type: "agreement",
        entity_id: id,
        action: "AGREEMENT_ACTIVATED",
        event_data: {
          agreement_id: id,
          version_number: targetVersion.version_number,
          buyer_id: agreement.buyer_id,
          seller_id: agreement.seller_id,
          status: "ACTIVE"
        }
      });
    } else {
      await repository.appendAuditLog({
        actor_id: user.id,
        entity_type: "agreement",
        entity_id: id,
        action: "AGREEMENT_CONFIRMED_PARTY",
        event_data: {
          agreement_id: id,
          version_number: targetVersion.version_number,
          user_id: user.id,
          role: isBuyer ? "buyer" : "seller"
        }
      });
    }

    return ok({
      confirmed: true,
      role: isBuyer ? "buyer" : "seller",
      bothConfirmed,
      agreement: updatedAgreement
    });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Confirmation failed", 500);
  }
}
