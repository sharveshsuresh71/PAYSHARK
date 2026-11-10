import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { ok, fail } from "@/lib/http";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const agreement = await repository.getAgreement(id);

    if (!agreement) {
      return fail("NOT_FOUND", "Agreement not found", 404);
    }

    const versions = await repository.getVersions(id);
    const latestVersion = versions[versions.length - 1] || null;
    let confirmations: any[] = [];
    if (latestVersion) {
      confirmations = await repository.getConfirmationsForVersion(latestVersion.id);
    }

    const isBuyer = agreement.buyer_id === user.id;
    const isSeller = agreement.seller_id === user.id || agreement.counterparty_email.toLowerCase() === user.email.toLowerCase();

    return ok({
      agreement,
      versions,
      latestVersion,
      confirmations,
      permissions: {
        isBuyer,
        isSeller,
        canConfirm: (isBuyer || isSeller) && agreement.status === "PENDING_CONFIRMATION"
      }
    });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Failed to load agreement", 500);
  }
}
