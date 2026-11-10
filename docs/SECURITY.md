# Security notes and release gates

- All secrets remain server-side.
- Never expose Supabase service-role, Groq, or PayPal client secret.
- AI output is data, not authority; validate every field.
- The policy engine is pure and deterministic.
- A failed mandatory check blocks payment.
- Purpose mismatch is blocked and sent to a separate review/clarification workflow.
- A BLOCKED request is terminal. Clarification results in a new version/request, never an in-place approval.
- Human approval binds exact amount, currency, merchant ID, agreement version, and policy version; it is single-use.
- PayPal create/capture must independently re-read and validate the binding.
- PayPal client order IDs/status are untrusted until fetched server-side.
- Verify webhook signatures and deduplicate event IDs.
- Use atomic SQL reservation for transaction limits.
- Audit events should be append-only and hash chained; do not grant browser UPDATE/DELETE.
- Add CSRF protections, distributed rate limiting, security headers, monitoring, and external review before production.
