import Decimal from "decimal.js";

export type RiskInput = {
  requestedAmount: string;
  policyMaximumAmount: string;
  merchant: string;
  purpose: string;
  allowedMerchants: string[];
  allowedCategories: string[];
};

export type RiskResult = {
  score: number;
  reasons: string[];
};

export function evaluateRisk(input: RiskInput): RiskResult {
  let score = 5; // Base baseline risk
  const reasons: string[] = [];

  try {
    const req = new Decimal(input.requestedAmount);
    const max = new Decimal(input.policyMaximumAmount);

    // High proportion of allowance
    if (max.gt(0) && req.div(max).gte(0.8)) {
      score += 25;
      reasons.push("Requested amount consumes more than 80% of total policy transaction limit.");
    }
  } catch {
    score += 40;
    reasons.push("Unparseable decimal amount in risk calculation.");
  }

  // Merchant trust check
  const isExactMerchant = input.allowedMerchants.some(
    m => m.toLowerCase() === input.merchant.toLowerCase()
  );
  if (!isExactMerchant && input.allowedMerchants.length > 0) {
    score += 20;
    reasons.push("Merchant name does not exactly match primary allowlist strings.");
  }

  // Purpose keyword density
  const hasCategoryMatch = input.allowedCategories.some(c =>
    input.purpose.toLowerCase().includes(c.toLowerCase())
  );
  if (!hasCategoryMatch && input.allowedCategories.length > 0) {
    score += 30;
    reasons.push("Payment purpose text has low semantic overlap with allowed policy categories.");
  }

  // Bound between 0 and 100
  score = Math.min(100, Math.max(0, score));

  return {
    score,
    reasons: reasons.length > 0 ? reasons : ["Parameters conform to standard transaction baselines."]
  };
}
