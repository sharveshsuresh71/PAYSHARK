import "server-only";
import { cookies } from "next/headers";
import { repository } from "../database/repository";
import { createHash } from "crypto";

const SESSION_COOKIE_NAME = "payshark_session";

export interface UserSession {
  id: string;
  email: string;
  full_name: string;
  role: "buyer" | "seller" | "admin";
}

export async function getCurrentUser(): Promise<UserSession> {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionVal) {
    const isRevoked = await repository.isSessionRevokedOrExpired(sessionVal);
    if (!isRevoked) {
      const profile = await repository.getProfileById(sessionVal);
      if (profile && !profile.locked) {
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role
        };
      }
    }
  }

  // Default to Demo Buyer profile for seamless out-of-the-box local testing
  const defaultBuyer = await repository.getProfileByEmail("buyer@payshark.ai");
  if (defaultBuyer) {
    return {
      id: defaultBuyer.id,
      email: defaultBuyer.email,
      full_name: defaultBuyer.full_name,
      role: defaultBuyer.role
    };
  }

  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "buyer@payshark.ai",
    full_name: "Alex Mercer (Buyer)",
    role: "buyer"
  };
}

export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();
  await repository.recordSession(userId, userId);
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export async function clearSessionUser() {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionVal) {
    await repository.revokeSession(sessionVal);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function authenticateAgentHeader(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const rawKey = authHeader.slice(7).trim();
  const hash = createHash("sha256").update(rawKey).digest("hex");
  const agent = await repository.getAgentByHash(hash);
  if (!agent) return null;

  const owner = await repository.getProfileById(agent.owner_id);
  if (!owner) return null;

  return { agent, owner };
}
