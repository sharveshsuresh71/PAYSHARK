# PAYSHARK AI
**Trust Every Agreement. Control Every Payment.**

PAYSHARK AI is an agreement-aware payment authorization layer for AI agents.

> **AI interprets. Rules enforce. Humans authorize. PayPal processes.**

---

## 🚀 Architectural Decisions & Updates

### 1. Counterparty (Seller) Identification
- **Global Best-Practice Email-Bound Token Architecture**:
  - The buyer defines the counterparty by their normalized email address (`counterparty_email`).
  - The server generates a single-use, 24-byte cryptographically secure invitation token (`rawToken`).
  - Only the SHA-256 hash (`invitation_token_hash`) and expiration timestamp (7 days) are persisted.
  - The counterparty accesses the secure invitation link (`/agreements/{id}?invite={token}`) and authenticates.
  - Upon identity and token verification, the server atomically binds `seller_id = profile.id` and consumes the token.
  - **Mutual Confirmation**: The agreement remains in `PENDING_CONFIRMATION` until **both** the buyer and the verified seller confirm the exact terms and version (`version_number`). Only then does the agreement transition to `ACTIVE`.

### 2. Purpose Mismatch Decision (Scenario D)
- **Policy Enforcement**: **BOTH REVIEWED AND BLOCKED**
  - When an autonomous agent requests a payment whose purpose does not align with authorized categories or agreement scope:
    - The deterministic policy engine returns `decision: "BLOCKED"`.
    - It sets `reviewRequired: true` and flags reason code `PURPOSE_NOT_ALLOWED`.
    - The payment is strictly blocked from auto-approval and PayPal execution.
    - Escalates into the Human Review Center for audit, clarification, and renegotiation. No silent auto-upgrades.

### 3. Database Layer: Neon PostgreSQL
- **Supabase Completely Removed**: Removed `@supabase/supabase-js` and `@supabase/ssr`.
- **Neon Serverless PostgreSQL**: Powered by `@neondatabase/serverless` connection pooling.
- **Ready-to-Deploy Schema**: Full SQL schema provided in `neon/schema.sql` with tables, indexes, constraints, and atomic SQL functions.
- **Seed Data**: Pre-seeded demo records in `neon/seed.sql` for instant testing.
- **Zero-Config Dev Fallback**: Built-in memory fallback repository allows local development, Vitest tests, and demo flows to execute immediately even before `DATABASE_URL` is configured!

---

## 🛠️ Must-Have Core Architecture (Fully Implemented)

1. **Scaffold & Dark Product UI**: Next.js 15 App Router, Tailwind CSS, Lucide icons, responsive layout.
2. **Neon Database Layer**: Complete schema for profiles, agreements, versions, confirmations, policies, registered agents, payment requests, single-use approvals, transactions, and audit logs.
3. **Agreement Lifecycle & AI Extraction**:
   - Create agreement with counterparty email and invitation token.
   - Groq AI extraction (`llama-3.3-70b-versatile`) with deterministic fallback parser.
   - Versioning and mutual dual-party confirmation.
4. **Deterministic Spending Policies**:
   - Per-transaction limits using `decimal.js` (avoids floating-point errors).
   - Category allowlists and merchant allowlists.
   - Atomic SQL allowance reservation (`reserve_policy_use`).
5. **AI Agent Registry**:
   - Issue high-entropy API keys (`ps_live_...`).
   - Store SHA-256 hashes only.
   - Agent authentication via `Authorization: Bearer <key>`.
6. **Deterministic Policy Engine (13 Rules)**:
   - Full 13-rule deterministic verification pipeline.
   - Scenario D (purpose mismatch) strictly returns BLOCKED + REVIEW REQUIRED.
7. **Single-Use Human Approval Binding**:
   - Approval cryptographically binds exact amount, currency, merchant ID, agreement version, and policy version.
   - Single-use consumption flag (`CONSUMED`).
8. **PayPal Sandbox REST API Integration**:
   - Server-side order creation with pre-flight approval validation.
   - Server-side order capture with atomic approval consumption and transaction recording.
9. **Tamper-Evident Hash Chained Audit Trail**:
   - Append-only audit log where `event_hash = SHA-256(previous_hash + canonical_json(data))`.
   - Live cryptographic chain verification endpoint (`/api/audit`).
10. **Red-Team Attack Simulator (Demo)**:
    - Interactive execution of threat scenarios A–E directly against the live policy engine.

---

## 🧪 Vitest Test Suite

All 17 tests across 3 suites pass with 100% success:
- `tests/policy-engine.test.ts` (10 tests): Validates all 13 rules, amount ceilings, currency matches, allowlists, version mismatch, and Scenario D purpose mismatch enforcement.
- `tests/hash-chain.test.ts` (4 tests): Validates SHA-256 hashing, sequential chain verification, and tamper detection.
- `tests/seller-identity.test.ts` (3 tests): Validates email normalization, token hashing, and expiration.

To run tests:
```bash
npx vitest run
```

---

## 📦 Quick Start

1. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
   Add your Neon connection string (`DATABASE_URL=postgresql://...`). If left blank, the app runs in zero-config dev mode using the built-in memory repository.

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open https://payshark-ktwm-53juwqh6n-shark20.vercel.app/ in your browser.

4. (Optional) Run database migration on Neon:
   Execute `neon/schema.sql` followed by `neon/seed.sql` in your Neon Console SQL Editor.
