import Decimal from "decimal.js";

export type Decision = "BLOCKED" | "REQUIRES_REVIEW" | "APPROVED_FOR_REVIEW";

export type PolicyInput = {
  policy: {
    status: string;
    expiresAt?: string | null;
    maximumAmount: string;
    currency: string;
    allowedMerchants: string[];
    allowedCategories: string[];
    maximumTransactions: number;
    usedTransactions: number;
    requireHumanApproval: boolean;
  };
  agreement: {
    status: string;
    confirmed: boolean;
    version: number;
    purpose: string;
    amount: string;
    currency: string;
  };
  request: {
    amount: string;
    currency: string;
    merchant: string;
    merchantId: string;
    purpose: string;
    category?: string;
    agreementVersion: number;
    policyVersion: number;
  };
  policyVersion: number;
  now?: Date;
};

export type PolicyCheckResult = {
  code: string;
  passed: boolean;
  detail: string;
};

export type PolicyResult = {
  decision: Decision;
  reviewRequired: boolean;
  reasonCodes: string[];
  checks: PolicyCheckResult[];
  explanation: string;
};

const norm = (s: string) =>
  s ? s.normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ") : "";

const containsTerm = (text: string, terms: string[]) => {
  if (!text || !terms || terms.length === 0) return false;
  const nText = norm(text);
  return terms.some(t => {
    const nTerm = norm(t);
    return nTerm.length > 0 && nText.includes(nTerm);
  });
};

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const { policy, agreement, request } = input;
  const now = input.now ?? new Date();
  const checks: PolicyCheckResult[] = [];

  const check = (code: string, passed: boolean, detail: string) =>
    checks.push({ code, passed, detail });

  // 1. Policy status
  check("POLICY_INACTIVE", policy.status === "ACTIVE", "Policy must be ACTIVE.");

  // 2. Policy expiration
  check(
    "POLICY_EXPIRED",
    !policy.expiresAt || new Date(policy.expiresAt) > now,
    "Policy must not be expired."
  );

  // 3. Agreement status
  check("AGREEMENT_NOT_ACTIVE", agreement.status === "ACTIVE", "Agreement must be ACTIVE.");

  // 4. Agreement mutual confirmation
  check(
    "AGREEMENT_NOT_CONFIRMED",
    Boolean(agreement.confirmed),
    "Both parties must confirm the current agreement version."
  );

  // 5. Amount check (Decimal precision)
  let amountValid = false;
  try {
    const reqAmount = new Decimal(request.amount);
    amountValid =
      reqAmount.gt(0) &&
      reqAmount.lte(policy.maximumAmount) &&
      reqAmount.lte(agreement.amount);
  } catch {
    amountValid = false;
  }
  check(
    "AMOUNT_EXCEEDED",
    amountValid,
    `Request amount (${request.amount} ${request.currency}) must fit within policy maximum (${policy.maximumAmount}) and agreement amount (${agreement.amount}).`
  );

  // 6. Currency matching
  check(
    "CURRENCY_MISMATCH",
    request.currency === policy.currency && request.currency === agreement.currency,
    `Request currency (${request.currency}) must match policy (${policy.currency}) and agreement (${agreement.currency}).`
  );

  // 7. Merchant allowlist check
  const merchantAllowed =
    policy.allowedMerchants.length === 0 ||
    policy.allowedMerchants.some(
      m => norm(m) === norm(request.merchant) || norm(m) === norm(request.merchantId)
    );
  check(
    "MERCHANT_NOT_ALLOWED",
    merchantAllowed,
    `Merchant '${request.merchant}' (${request.merchantId}) is not in the allowed merchants list.`
  );

  // 8. Purpose matching (Scenario D)
  // Scenario D specification: Purpose mismatch is strictly BLOCKED and escalated to human review.
  const purposeMatchesCategory =
    policy.allowedCategories.length === 0 ||
    containsTerm(request.purpose, policy.allowedCategories);
  const purposeMatchesAgreement =
    !agreement.purpose || containsTerm(request.purpose, [agreement.purpose]);
  const purposeAllowed = purposeMatchesCategory && purposeMatchesAgreement;

  check(
    "PURPOSE_NOT_ALLOWED",
    purposeAllowed,
    purposeAllowed
      ? "Purpose matches policy allowed categories and agreement intent."
      : "Purpose does not match policy allowed categories or agreement terms. (Scenario D: BLOCKED and flagged for human review)"
  );

  // 9. Transaction limit
  check(
    "LIMIT_EXHAUSTED",
    policy.usedTransactions < policy.maximumTransactions,
    `Transaction limit reached (${policy.usedTransactions}/${policy.maximumTransactions}).`
  );

  // 10. Agreement version binding
  check(
    "AGREEMENT_VERSION_MISMATCH",
    request.agreementVersion === agreement.version,
    `Request bound to agreement version ${request.agreementVersion}, but active version is ${agreement.version}.`
  );

  // 11. Policy version binding
  check(
    "POLICY_VERSION_MISMATCH",
    request.policyVersion === input.policyVersion,
    `Request bound to policy version ${request.policyVersion}, but active version is ${input.policyVersion}.`
  );

  const failed = checks.filter(c => !c.passed);
  const purposeMismatch = failed.some(c => c.code === "PURPOSE_NOT_ALLOWED");

  let decision: Decision;
  let reviewRequired = false;
  let explanation = "";

  if (failed.length > 0) {
    decision = "BLOCKED";
    // If purpose mismatch is present, both review and block are required (Scenario D)
    if (purposeMismatch) {
      reviewRequired = true;
      explanation =
        "Payment is BLOCKED and ESCALATED TO HUMAN REVIEW: The requested purpose does not align with authorized policy categories or agreement scope. Human review is required; no automatic bypass permitted.";
    } else {
      reviewRequired = false;
      explanation = `Payment is BLOCKED: ${failed.map(f => f.detail).join(" ")}`;
    }
  } else {
    // All deterministic checks passed
    if (policy.requireHumanApproval) {
      decision = "APPROVED_FOR_REVIEW";
      reviewRequired = true;
      explanation =
        "All automated policy checks passed. In accordance with policy settings, single-use human authorization is required before PayPal execution.";
    } else {
      decision = "REQUIRES_REVIEW";
      reviewRequired = false;
      explanation = "All automated checks passed. Pre-authorized for execution.";
    }
  }

  return {
    decision,
    reviewRequired,
    reasonCodes: failed.map(f => f.code),
    checks,
    explanation
  };
}
