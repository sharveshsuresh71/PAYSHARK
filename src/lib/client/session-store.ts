"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Shape returned by GET /api/auth/session (see src/lib/auth/session.ts). */
export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: "buyer" | "seller" | "admin";
}

/*
 * Tiny client cache for the current session so the sidebar, top bar and pages
 * share one request. Data always comes from the existing /api/auth/session API.
 */
let user: SessionUser | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function refreshSession() {
  if (!inflight) {
    inflight = fetch("/api/auth/session")
      .then(r => r.json())
      .then(json => { if (json.ok) { user = json.data; emit(); } })
      .catch(() => {})
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function useSessionUser() {
  const value = useSyncExternalStore(subscribe, () => user, () => null);
  useEffect(() => { if (!user) refreshSession(); }, []);
  return value;
}

/** Display name without the "(Buyer)" / "(Seller)" suffix used in seed data. */
export function displayName(u: SessionUser | null) {
  return u ? u.full_name.replace(/\s*\(.*?\)\s*/g, "").trim() || u.email : "";
}

export function initials(u: SessionUser | null) {
  const name = displayName(u);
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "PS";
}
