import { NextRequest } from "next/server";
import { getCurrentUser, setSessionUser, clearSessionUser } from "@/lib/auth/session";
import { repository } from "@/lib/database/repository";
import { ok, fail } from "@/lib/http";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  return ok(user);
}

const switchSchema = z.object({
  role: z.enum(["buyer", "seller"]).optional(),
  email: z.string().email().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = switchSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "Invalid switch payload", 422, parsed.error.flatten());
    }

    let targetEmail = parsed.data.email;
    if (!targetEmail) {
      targetEmail = parsed.data.role === "seller" ? "seller@example.com" : "buyer@payshark.ai";
    }

    let profile = await repository.getProfileByEmail(targetEmail);
    if (!profile) {
      profile = await repository.createProfile({
        email: targetEmail,
        full_name: parsed.data.role === "seller" ? "Elena Rostova (Seller)" : "Alex Mercer (Buyer)",
        role: parsed.data.role || "buyer"
      });
    }

    await setSessionUser(profile.id);
    return ok({ user: profile, message: `Switched session to ${profile.role} (${profile.email})` });
  } catch (err) {
    return fail("INTERNAL", err instanceof Error ? err.message : "Session switch failed", 500);
  }
}

export async function DELETE() {
  await clearSessionUser();
  return ok({ message: "Session cleared" });
}
