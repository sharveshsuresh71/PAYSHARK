import { z } from "zod";

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code");

export const moneySchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/, "Invalid money format. Expected e.g. '100.00'")
  .refine(v => Number(v) > 0, "Amount must be greater than zero");

export const agreementCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  original_text: z.string().trim().min(20).max(20000),
  counterparty_email: z.string().trim().toLowerCase().email().max(254)
});

export const agreementConfirmSchema = z.object({
  version_number: z.number().int().min(1),
  action: z.enum(["confirm", "reject"]),
  invitation_token: z.string().optional()
});

export const paymentRequestSchema = z.object({
  policy_id: z.string().uuid(),
  agreement_id: z.string().uuid(),
  merchant: z.string().trim().min(1).max(160),
  merchant_id: z.string().trim().min(1).max(160),
  purpose: z.string().trim().min(3).max(500),
  amount: moneySchema,
  currency: currencySchema,
  idempotency_key: z.string().min(8).max(128),
  instruction_text: z.string().max(4000).optional()
});

export const policySchema = z.object({
  policy_name: z.string().trim().min(2).max(120),
  agreement_id: z.string().uuid(),
  maximum_amount: moneySchema,
  currency: currencySchema,
  allowed_merchants: z.array(z.string().min(1)).max(100),
  allowed_categories: z.array(z.string().min(1)).max(100),
  maximum_transactions: z.number().int().min(1).max(10000),
  expires_at: z.string().datetime().nullable().optional(),
  require_human_approval: z.boolean().default(true)
});

export const agentRegisterSchema = z.object({
  agent_name: z.string().trim().min(2).max(100),
  permissions: z.array(z.string()).max(30).default(["payment:request"])
});

export const paymentApprovalSchema = z.object({
  payment_request_id: z.string().uuid(),
  confirm: z.boolean().default(true)
});
