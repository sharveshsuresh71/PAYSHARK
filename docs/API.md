# API outline

Implemented starter routes:
- `POST /api/agreements/analyze` — Groq extraction with Zod validation.
- `POST /api/agents/register` — authenticated agent registration; raw API key returned once.
- `POST /api/payment-requests/evaluate` — validates request shape, then fails closed until DB-backed records are wired.
- `POST /api/payments/paypal/create-order` — intentionally fails closed until a valid single-use approval is revalidated.

Planned routes from the architecture:
- Agreements: create, list, read, analyze, clarify, confirm, version, cancel.
- Policies: create, list, read, update, revoke.
- Agents: register, list, revoke.
- Payment requests: create, read, evaluate, approve, reject, clarify.
- PayPal: create order, capture order, payment status.
- Webhooks: signature verification, dedupe, monotonic reconciliation.
- Audit: paginated owner timeline and chain verification.
