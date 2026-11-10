/**
 * Client-side analytics derived ONLY from real records returned by
 * GET /api/payment-requests. Nothing here invents values.
 */

export interface PaymentRequest {
  id: string;
  merchant: string;
  merchant_id: string;
  purpose: string;
  requested_amount: string | number;
  currency: string;
  risk_score: number | null;
  risk_reasons?: string[] | null;
  decision: "BLOCKED" | "REQUIRES_REVIEW" | "APPROVED_FOR_REVIEW";
  status: string;
  policy_result?: {
    reasonCodes?: string[];
    reviewRequired?: boolean;
    explanation?: string;
    checks?: { code: string; passed: boolean; detail?: string; message?: string }[];
  } | null;
  agreement_id: string;
  policy_id: string;
  agent_id: string | null;
  agreement_version?: number;
  policy_version?: number;
  created_at: string;
}

export type PaymentCategory = "captured" | "pending" | "blocked";

/** `status` stays RECEIVED after evaluation, so the policy `decision` determines blocking. */
export function categorize(r: PaymentRequest): PaymentCategory {
  if (r.status === "COMPLETED") return "captured";
  if (r.status === "REJECTED_BY_USER" || r.status === "BLOCKED" || r.decision === "BLOCKED") return "blocked";
  return "pending";
}

export const categoryMeta: Record<PaymentCategory, { label: string; color: string; text: string }> = {
  captured: { label: "Captured", color: "rgb(39 217 149)", text: "text-success" },
  pending: { label: "Pending", color: "rgb(255 181 71)", text: "text-warning" },
  blocked: { label: "Blocked", color: "rgb(255 84 112)", text: "text-danger" }
};

export function statusLabel(r: PaymentRequest) {
  const map: Record<string, string> = {
    COMPLETED: "Captured",
    PAYMENT_PENDING: "Payment pending",
    HUMAN_APPROVED: "Human approved",
    REJECTED_BY_USER: "Rejected",
    REQUIRES_REVIEW: "Needs review",
    APPROVED_FOR_REVIEW: "Awaiting approval"
  };
  if (map[r.status]) return map[r.status];
  if (r.decision === "BLOCKED") return "Blocked";
  if (r.decision === "APPROVED_FOR_REVIEW") return "Awaiting approval";
  if (r.decision === "REQUIRES_REVIEW") return "Needs review";
  return r.status.replace(/_/g, " ").toLowerCase();
}

export const amountOf = (r: PaymentRequest) => {
  const n = typeof r.requested_amount === "number" ? r.requested_amount : parseFloat(r.requested_amount);
  return Number.isFinite(n) ? n : 0;
};

export function formatMoney(value: number, currency: string, compact = false) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: compact && value >= 10000 ? "compact" : "standard",
      maximumFractionDigits: compact && value >= 10000 ? 1 : 2
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export interface PaymentAnalytics {
  total: number;
  currency: string;
  otherCurrencies: string[];
  counts: Record<PaymentCategory, number>;
  capturedVolume: number;
  requestedVolume: number;
  successRate: number | null;
  /** Requested volume per day for the last `days` days (primary currency). */
  daily: { date: string; volume: number; count: number; captured: number }[];
  topBlockReasons: { code: string; count: number }[];
  needsAttention: PaymentRequest[];
  averageRisk: number | null;
  largest: PaymentRequest | null;
}

export function analyze(requests: PaymentRequest[], days = 14): PaymentAnalytics {
  const currencyCounts = new Map<string, number>();
  requests.forEach(r => currencyCounts.set(r.currency, (currencyCounts.get(r.currency) ?? 0) + 1));
  const currency = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
  const otherCurrencies = [...currencyCounts.keys()].filter(c => c !== currency);
  const inCurrency = requests.filter(r => r.currency === currency);

  const counts: Record<PaymentCategory, number> = { captured: 0, pending: 0, blocked: 0 };
  requests.forEach(r => counts[categorize(r)]++);

  const capturedVolume = inCurrency.filter(r => categorize(r) === "captured").reduce((s, r) => s + amountOf(r), 0);
  const requestedVolume = inCurrency.reduce((s, r) => s + amountOf(r), 0);
  const resolved = counts.captured + counts.blocked;
  const successRate = resolved ? counts.captured / resolved : null;

  // Daily buckets (local dates)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { date: d.toISOString(), key: d.toDateString(), volume: 0, count: 0, captured: 0 };
  });
  const byKey = new Map(daily.map(d => [d.key, d]));
  inCurrency.forEach(r => {
    const bucket = byKey.get(new Date(r.created_at).toDateString());
    if (!bucket) return;
    bucket.volume += amountOf(r);
    bucket.count += 1;
    if (categorize(r) === "captured") bucket.captured += amountOf(r);
  });

  const reasonCounts = new Map<string, number>();
  requests.filter(r => categorize(r) === "blocked").forEach(r =>
    (r.policy_result?.reasonCodes ?? []).forEach(code => reasonCounts.set(code, (reasonCounts.get(code) ?? 0) + 1))
  );
  const topBlockReasons = [...reasonCounts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  const needsAttention = requests.filter(r => categorize(r) === "pending");
  const risks = requests.map(r => r.risk_score).filter((n): n is number => typeof n === "number");
  const averageRisk = risks.length ? risks.reduce((a, b) => a + b, 0) / risks.length : null;
  const largest = inCurrency.reduce<PaymentRequest | null>((m, r) => (!m || amountOf(r) > amountOf(m) ? r : m), null);

  return {
    total: requests.length,
    currency,
    otherCurrencies,
    counts,
    capturedVolume,
    requestedVolume,
    successRate,
    daily: daily.map(({ date, volume, count, captured }) => ({ date, volume, count, captured })),
    topBlockReasons,
    needsAttention,
    averageRisk,
    largest
  };
}

export function humanizeCode(code: string) {
  return code.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
}
