import "server-only";
import { runQuery, isNeonConfigured } from "./db";
import { computeEventHash } from "../audit/hash-chain";
import { createHash, randomUUID } from "crypto";

// Memory storage for zero-config local dev and test environments
const memoryStore: {
  profiles: any[];
  agreements: any[];
  agreement_versions: any[];
  agreement_confirmations: any[];
  spending_policies: any[];
  registered_agents: any[];
  payment_requests: any[];
  payment_approvals: any[];
  transactions: any[];
  audit_logs: any[];
  active_sessions: any[];
} = {
  profiles: [
    { id: "11111111-1111-1111-1111-111111111111", email: "buyer@payshark.ai", full_name: "Alex Mercer (Buyer)", role: "buyer" as const, created_at: new Date().toISOString() },
    { id: "22222222-2222-2222-2222-222222222222", email: "seller@example.com", full_name: "Elena Rostova (Seller)", role: "seller" as const, created_at: new Date().toISOString() }
  ],
  agreements: [
    {
      id: "33333333-3333-3333-3333-333333333333",
      buyer_id: "11111111-1111-1111-1111-111111111111",
      seller_id: "22222222-2222-2222-2222-222222222222",
      counterparty_email: "seller@example.com",
      title: "Enterprise Web Platform Engineering — Phase 1",
      original_text: "Buyer agrees to pay Seller 500.00 USD for cloud architecture and frontend design deliverables.",
      extracted_terms: { amount: "500.00", currency: "USD", deliverables: ["Cloud architecture", "Frontend design"], transaction_purpose: "Software engineering deliverables" },
      amount: "500.00",
      currency: "USD",
      deadline: "2026-12-31",
      status: "ACTIVE",
      current_version: 1,
      invitation_token_hash: null as string | null,
      invitation_expires_at: null as string | null,
      created_at: new Date().toISOString()
    }
  ],
  agreement_versions: [
    {
      id: "44444444-4444-4444-4444-444444444444",
      agreement_id: "33333333-3333-3333-3333-333333333333",
      version_number: 1,
      structured_terms: { amount: "500.00", currency: "USD", deliverables: ["Cloud architecture", "Frontend design"], transaction_purpose: "Software engineering deliverables" },
      content_hash: "hash_seed_v1",
      created_by: "11111111-1111-1111-1111-111111111111",
      created_at: new Date().toISOString()
    }
  ],
  agreement_confirmations: [
    { id: randomUUID(), agreement_id: "33333333-3333-3333-3333-333333333333", version_id: "44444444-4444-4444-4444-444444444444", user_id: "11111111-1111-1111-1111-111111111111", confirmation_status: "CONFIRMED", confirmed_at: new Date().toISOString() },
    { id: randomUUID(), agreement_id: "33333333-3333-3333-3333-333333333333", version_id: "44444444-4444-4444-4444-444444444444", user_id: "22222222-2222-2222-2222-222222222222", confirmation_status: "CONFIRMED", confirmed_at: new Date().toISOString() }
  ],
  spending_policies: [
    {
      id: "55555555-5555-5555-5555-555555555555",
      owner_id: "11111111-1111-1111-1111-111111111111",
      agreement_id: "33333333-3333-3333-3333-333333333333",
      policy_name: "Engineering Discretionary Budget",
      maximum_amount: "250.00",
      currency: "USD",
      allowed_merchants: ["Elena Rostova", "seller@example.com", "Acme Cloud"],
      allowed_categories: ["software", "engineering", "cloud services", "deliverables"],
      maximum_transactions: 10,
      used_transactions: 0,
      require_human_approval: true,
      expires_at: null as string | null,
      status: "ACTIVE",
      version: 1,
      created_at: new Date().toISOString()
    }
  ],
  registered_agents: [
    {
      id: "66666666-6666-6666-6666-666666666666",
      owner_id: "11111111-1111-1111-1111-111111111111",
      agent_name: "Autonomous Procurement Agent 01",
      credential_hash: createHash("sha256").update("ps_live_demo_agent_key_12345").digest("hex"),
      permissions: ["payment:request"],
      status: "ACTIVE",
      created_at: new Date().toISOString()
    }
  ],
  payment_requests: [] as any[],
  payment_approvals: [] as any[],
  transactions: [] as any[],
  audit_logs: [] as any[],
  active_sessions: [] as any[]
};

export const repository = {
  // Profiles
  async getProfileByEmail(email: string) {
    const norm = email.trim().toLowerCase();
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM profiles WHERE lower(email) = lower($1) LIMIT 1", [norm]);
      return rows[0] || null;
    }
    return memoryStore.profiles.find(p => p.email.toLowerCase() === norm) || null;
  },

  async getProfileById(id: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM profiles WHERE id = $1 LIMIT 1", [id]);
      return rows[0] || null;
    }
    return memoryStore.profiles.find(p => p.id === id) || null;
  },

  async getProfile(id: string) {
    return this.getProfileById(id);
  },

  async lockProfile(profileId: string, reason: string) {
    if (isNeonConfigured()) {
      await runQuery(
        "UPDATE profiles SET locked = true, lock_reason = $1, locked_at = NOW() WHERE id = $2",
        [reason, profileId]
      );
      const revokedRes = await runQuery("UPDATE active_sessions SET revoked_at = NOW() WHERE profile_id = $1 RETURNING id", [profileId]);
      const blockedRes = await runQuery(
        "UPDATE payment_requests SET status = 'BLOCKED' WHERE buyer_id = $1 AND status = 'PENDING' RETURNING id",
        [profileId]
      );
      return {
        profileId,
        locked: true,
        revokedSessionsCount: revokedRes.length,
        blockedRequestsCount: blockedRes.length
      };
    }

    const p = memoryStore.profiles.find(x => x.id === profileId);
    if (p) {
      p.locked = true;
      p.lock_reason = reason;
      p.locked_at = new Date().toISOString();
    }
    let revokedSessionsCount = 0;
    for (const s of memoryStore.active_sessions) {
      if (s.profile_id === profileId && !s.revoked_at) {
        s.revoked_at = new Date().toISOString();
        revokedSessionsCount++;
      }
    }

    let blockedRequestsCount = 0;
    for (const pr of memoryStore.payment_requests) {
      if (pr.buyer_id === profileId && pr.status === 'PENDING') {
        pr.status = 'BLOCKED';
        blockedRequestsCount++;
      }
    }

    return {
      profileId,
      locked: true,
      revokedSessionsCount,
      blockedRequestsCount
    };
  },

  async recordSession(sessionId: string, profileId: string, deviceFp?: string, maxAgeHours = 168) {
    const expiresAt = new Date(Date.now() + maxAgeHours * 3600 * 1000).toISOString();
    if (isNeonConfigured()) {
      await runQuery(
        "INSERT INTO active_sessions (id, profile_id, device_fingerprint, expires_at) VALUES ($1, $2, $3, $4)",
        [sessionId, profileId, deviceFp || null, expiresAt]
      );
      return;
    }
    memoryStore.active_sessions.push({
      id: sessionId,
      profile_id: profileId,
      device_fingerprint: deviceFp || null,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      revoked_at: null
    });
  },

  async isSessionRevokedOrExpired(sessionId: string): Promise<boolean> {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        "SELECT id, expires_at, revoked_at FROM active_sessions WHERE id = $1 LIMIT 1",
        [sessionId]
      );
      if (!rows[0]) return false; // If not tracked in active_sessions table, treat as legacy/valid
      if (rows[0].revoked_at) return true;
      if (new Date(rows[0].expires_at).getTime() < Date.now()) return true;
      return false;
    }
    const session = memoryStore.active_sessions.find(s => s.id === sessionId);
    if (!session) return false;
    if (session.revoked_at) return true;
    if (new Date(session.expires_at).getTime() < Date.now()) return true;
    return false;
  },

  async revokeSession(sessionId: string) {
    if (isNeonConfigured()) {
      await runQuery("UPDATE active_sessions SET revoked_at = NOW() WHERE id = $1", [sessionId]);
      return;
    }
    const s = memoryStore.active_sessions.find(x => x.id === sessionId);
    if (s) {
      s.revoked_at = new Date().toISOString();
    }
  },

  async createProfile(data: { email: string; full_name: string; role: "buyer" | "seller" }) {
    const norm = data.email.trim().toLowerCase();
    if (isNeonConfigured()) {
      const rows = await runQuery(
        "INSERT INTO profiles (email, full_name, role) VALUES ($1, $2, $3) RETURNING *",
        [norm, data.full_name, data.role]
      );
      return rows[0];
    }
    const profile = { id: randomUUID(), email: norm, full_name: data.full_name, role: data.role, created_at: new Date().toISOString() };
    memoryStore.profiles.push(profile);
    return profile;
  },

  // Agreements & Global Seller Identification
  async createAgreement(data: {
    buyer_id: string;
    title: string;
    original_text: string;
    counterparty_email: string;
    invitation_token_hash: string;
    invitation_expires_at: string;
  }) {
    const normEmail = data.counterparty_email.trim().toLowerCase();
    // Check if seller already exists with this email
    const existingSeller = await this.getProfileByEmail(normEmail);
    const sellerId = existingSeller ? existingSeller.id : null;

    if (isNeonConfigured()) {
      const rows = await runQuery(
        `INSERT INTO agreements (
          buyer_id, seller_id, counterparty_email, title, original_text,
          status, current_version, invitation_token_hash, invitation_expires_at
        ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', 1, $6, $7) RETURNING *`,
        [data.buyer_id, sellerId, normEmail, data.title, data.original_text, data.invitation_token_hash, data.invitation_expires_at]
      );
      return rows[0];
    }

    const agreement = {
      id: randomUUID(),
      buyer_id: data.buyer_id,
      seller_id: sellerId,
      counterparty_email: normEmail,
      title: data.title,
      original_text: data.original_text,
      extracted_terms: {},
      amount: null,
      currency: null,
      deadline: null,
      status: "DRAFT",
      current_version: 1,
      invitation_token_hash: data.invitation_token_hash,
      invitation_expires_at: data.invitation_expires_at,
      created_at: new Date().toISOString()
    };
    memoryStore.agreements.push(agreement);
    return agreement;
  },

  async getAgreement(id: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM agreements WHERE id = $1 LIMIT 1", [id]);
      return rows[0] || null;
    }
    return memoryStore.agreements.find(a => a.id === id) || null;
  },

  async listAgreementsForUser(userId: string, email: string) {
    const normEmail = email.trim().toLowerCase();
    if (isNeonConfigured()) {
      return await runQuery(
        "SELECT * FROM agreements WHERE buyer_id = $1 OR seller_id = $1 OR lower(counterparty_email) = lower($2) ORDER BY created_at DESC",
        [userId, normEmail]
      );
    }
    return memoryStore.agreements.filter(
      a => a.buyer_id === userId || a.seller_id === userId || a.counterparty_email.toLowerCase() === normEmail
    );
  },

  async updateAgreement(id: string, updates: Partial<any>) {
    if (isNeonConfigured()) {
      const keys = Object.keys(updates);
      const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
      const values = keys.map(k => updates[k]);
      const rows = await runQuery(`UPDATE agreements SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`, [id, ...values]);
      return rows[0] || null;
    }
    const idx = memoryStore.agreements.findIndex(a => a.id === id);
    if (idx === -1) return null;
    memoryStore.agreements[idx] = { ...memoryStore.agreements[idx], ...updates };
    return memoryStore.agreements[idx];
  },

  async bindSellerToAgreement(agreementId: string, sellerId: string, email: string) {
    const agreement = await this.getAgreement(agreementId);
    if (!agreement) throw new Error("AGREEMENT_NOT_FOUND");
    if (agreement.counterparty_email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error("EMAIL_MISMATCH: Authenticated seller email does not match invitation");
    }
    return await this.updateAgreement(agreementId, {
      seller_id: sellerId,
      invitation_token_hash: null // Token consumed
    });
  },

  // Versions & Mutual Confirmations
  async createAgreementVersion(data: {
    agreement_id: string;
    version_number: number;
    structured_terms: any;
    content_hash: string;
    created_by: string;
  }) {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        `INSERT INTO agreement_versions (agreement_id, version_number, structured_terms, content_hash, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.agreement_id, data.version_number, JSON.stringify(data.structured_terms), data.content_hash, data.created_by]
      );
      return rows[0];
    }
    const version = {
      id: randomUUID(),
      ...data,
      created_at: new Date().toISOString()
    };
    memoryStore.agreement_versions.push(version);
    return version;
  },

  async getVersions(agreementId: string) {
    if (isNeonConfigured()) {
      return await runQuery("SELECT * FROM agreement_versions WHERE agreement_id = $1 ORDER BY version_number ASC", [agreementId]);
    }
    return memoryStore.agreement_versions.filter(v => v.agreement_id === agreementId);
  },

  async confirmAgreementVersion(agreementId: string, versionId: string, userId: string, status: "CONFIRMED" | "REJECTED") {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        `INSERT INTO agreement_confirmations (agreement_id, version_id, user_id, confirmation_status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (version_id, user_id) DO UPDATE SET confirmation_status = $4, confirmed_at = now()
         RETURNING *`,
        [agreementId, versionId, userId, status]
      );
      return rows[0];
    }
    const existingIdx = memoryStore.agreement_confirmations.findIndex(c => c.version_id === versionId && c.user_id === userId);
    if (existingIdx !== -1) {
      memoryStore.agreement_confirmations[existingIdx].confirmation_status = status;
      memoryStore.agreement_confirmations[existingIdx].confirmed_at = new Date().toISOString();
      return memoryStore.agreement_confirmations[existingIdx];
    }
    const conf = { id: randomUUID(), agreement_id: agreementId, version_id: versionId, user_id: userId, confirmation_status: status, confirmed_at: new Date().toISOString() };
    memoryStore.agreement_confirmations.push(conf);
    return conf;
  },

  async getConfirmationsForVersion(versionId: string) {
    if (isNeonConfigured()) {
      return await runQuery("SELECT * FROM agreement_confirmations WHERE version_id = $1", [versionId]);
    }
    return memoryStore.agreement_confirmations.filter(c => c.version_id === versionId);
  },

  // Spending Policies
  async createSpendingPolicy(data: {
    owner_id: string;
    agreement_id: string;
    policy_name: string;
    maximum_amount: string;
    currency: string;
    allowed_merchants: string[];
    allowed_categories: string[];
    maximum_transactions: number;
    require_human_approval: boolean;
    expires_at?: string | null;
    status: "DRAFT" | "ACTIVE";
  }) {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        `INSERT INTO spending_policies (
          owner_id, agreement_id, policy_name, maximum_amount, currency,
          allowed_merchants, allowed_categories, maximum_transactions, require_human_approval, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          data.owner_id, data.agreement_id, data.policy_name, data.maximum_amount, data.currency,
          JSON.stringify(data.allowed_merchants), JSON.stringify(data.allowed_categories),
          data.maximum_transactions, data.require_human_approval, data.expires_at || null, data.status
        ]
      );
      return rows[0];
    }
    const policy = {
      id: randomUUID(),
      owner_id: data.owner_id,
      agreement_id: data.agreement_id,
      policy_name: data.policy_name,
      maximum_amount: data.maximum_amount,
      currency: data.currency,
      allowed_merchants: data.allowed_merchants,
      allowed_categories: data.allowed_categories,
      maximum_transactions: data.maximum_transactions,
      used_transactions: 0,
      require_human_approval: data.require_human_approval,
      expires_at: data.expires_at || null,
      status: data.status,
      version: 1,
      created_at: new Date().toISOString()
    };
    memoryStore.spending_policies.push(policy);
    return policy;
  },

  async getSpendingPolicy(id: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM spending_policies WHERE id = $1 LIMIT 1", [id]);
      return rows[0] || null;
    }
    return memoryStore.spending_policies.find(p => p.id === id) || null;
  },

  async listPoliciesForOwner(ownerId: string) {
    if (isNeonConfigured()) {
      return await runQuery("SELECT * FROM spending_policies WHERE owner_id = $1 ORDER BY created_at DESC", [ownerId]);
    }
    return memoryStore.spending_policies.filter(p => p.owner_id === ownerId);
  },

  async updatePolicyStatus(id: string, status: "DRAFT" | "ACTIVE" | "REVOKED") {
    if (isNeonConfigured()) {
      const rows = await runQuery("UPDATE spending_policies SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
      return rows[0] || null;
    }
    const policy = memoryStore.spending_policies.find(p => p.id === id);
    if (policy) policy.status = status;
    return policy || null;
  },

  async reservePolicyUse(policyId: string): Promise<boolean> {
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM reserve_policy_use($1)", [policyId]);
      return rows.length > 0;
    }
    const policy = memoryStore.spending_policies.find(p => p.id === policyId);
    if (!policy) return false;
    if (policy.status !== "ACTIVE") return false;
    if (policy.used_transactions >= policy.maximum_transactions) return false;
    if (policy.expires_at && new Date(policy.expires_at) <= new Date()) return false;
    policy.used_transactions += 1;
    return true;
  },

  // Registered Agents
  async registerAgent(data: { owner_id: string; agent_name: string; credential_hash: string; permissions: string[] }) {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        "INSERT INTO registered_agents (owner_id, agent_name, credential_hash, permissions) VALUES ($1, $2, $3, $4) RETURNING id, agent_name, status, created_at",
        [data.owner_id, data.agent_name, data.credential_hash, JSON.stringify(data.permissions)]
      );
      return rows[0];
    }
    const agent = {
      id: randomUUID(),
      owner_id: data.owner_id,
      agent_name: data.agent_name,
      credential_hash: data.credential_hash,
      permissions: data.permissions,
      status: "ACTIVE",
      created_at: new Date().toISOString()
    };
    memoryStore.registered_agents.push(agent);
    return { id: agent.id, agent_name: agent.agent_name, status: agent.status, created_at: agent.created_at };
  },

  async getAgentByHash(hash: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM registered_agents WHERE credential_hash = $1 AND status = 'ACTIVE' LIMIT 1", [hash]);
      return rows[0] || null;
    }
    return memoryStore.registered_agents.find(a => a.credential_hash === hash && a.status === "ACTIVE") || null;
  },

  async listAgentsForOwner(ownerId: string) {
    if (isNeonConfigured()) {
      return await runQuery("SELECT id, agent_name, permissions, status, created_at FROM registered_agents WHERE owner_id = $1", [ownerId]);
    }
    return memoryStore.registered_agents
      .filter(a => a.owner_id === ownerId)
      .map(({ id, agent_name, permissions, status, created_at }) => ({ id, agent_name, permissions, status, created_at }));
  },

  // Payment Requests
  async createPaymentRequest(data: {
    owner_id: string;
    agreement_id: string;
    policy_id: string;
    agent_id: string | null;
    merchant: string;
    merchant_id: string;
    purpose: string;
    requested_amount: string;
    currency: string;
    risk_score: number;
    risk_reasons: string[];
    policy_result: any;
    decision: "BLOCKED" | "REQUIRES_REVIEW" | "APPROVED_FOR_REVIEW";
    idempotency_key: string;
    agreement_version: number;
    policy_version: number;
  }) {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        `INSERT INTO payment_requests (
          owner_id, agreement_id, policy_id, agent_id, merchant, merchant_id,
          purpose, requested_amount, currency, risk_score, risk_reasons, policy_result,
          decision, status, idempotency_key, agreement_version, policy_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'RECEIVED', $14, $15, $16)
        RETURNING *`,
        [
          data.owner_id, data.agreement_id, data.policy_id, data.agent_id, data.merchant, data.merchant_id,
          data.purpose, data.requested_amount, data.currency, data.risk_score, JSON.stringify(data.risk_reasons),
          JSON.stringify(data.policy_result), data.decision, data.idempotency_key, data.agreement_version, data.policy_version
        ]
      );
      return rows[0];
    }
    const request = {
      id: randomUUID(),
      ...data,
      status: "RECEIVED",
      created_at: new Date().toISOString()
    };
    memoryStore.payment_requests.push(request);
    return request;
  },

  async getPaymentRequestByIdempotency(agentId: string | null, idempotencyKey: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        "SELECT * FROM payment_requests WHERE agent_id IS NOT DISTINCT FROM $1 AND idempotency_key = $2 LIMIT 1",
        [agentId, idempotencyKey]
      );
      return rows[0] || null;
    }
    return memoryStore.payment_requests.find(r => r.agent_id === agentId && r.idempotency_key === idempotencyKey) || null;
  },

  async getPaymentRequest(id: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM payment_requests WHERE id = $1 LIMIT 1", [id]);
      return rows[0] || null;
    }
    return memoryStore.payment_requests.find(r => r.id === id) || null;
  },

  async listPaymentRequestsForOwner(ownerId: string) {
    if (isNeonConfigured()) {
      return await runQuery("SELECT * FROM payment_requests WHERE owner_id = $1 ORDER BY created_at DESC", [ownerId]);
    }
    return memoryStore.payment_requests.filter(r => r.owner_id === ownerId);
  },

  async updatePaymentRequestStatus(id: string, status: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("UPDATE payment_requests SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
      return rows[0] || null;
    }
    const req = memoryStore.payment_requests.find(r => r.id === id);
    if (req) req.status = status;
    return req || null;
  },

  // Payment Approvals (Single-use Cryptographic Binding)
  async createPaymentApproval(data: {
    payment_request_id: string;
    user_id: string;
    approved_amount: string;
    currency: string;
    merchant_id: string;
    agreement_version: number;
    policy_version: number;
  }) {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        `INSERT INTO payment_approvals (
          payment_request_id, user_id, approved_amount, currency, merchant_id,
          agreement_version, policy_version, status, approved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'APPROVED', now()) RETURNING *`,
        [data.payment_request_id, data.user_id, data.approved_amount, data.currency, data.merchant_id, data.agreement_version, data.policy_version]
      );
      return rows[0];
    }
    const approval = {
      id: randomUUID(),
      ...data,
      status: "APPROVED",
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    memoryStore.payment_approvals.push(approval);
    return approval;
  },

  async getActiveApprovalForRequest(paymentRequestId: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM payment_approvals WHERE payment_request_id = $1 AND status = 'APPROVED' LIMIT 1", [paymentRequestId]);
      return rows[0] || null;
    }
    return memoryStore.payment_approvals.find(a => a.payment_request_id === paymentRequestId && a.status === "APPROVED") || null;
  },

  async consumeApproval(id: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("UPDATE payment_approvals SET status = 'CONSUMED' WHERE id = $1 RETURNING *", [id]);
      return rows[0] || null;
    }
    const approval = memoryStore.payment_approvals.find(a => a.id === id);
    if (approval) approval.status = "CONSUMED";
    return approval || null;
  },

  // Transactions
  async createTransaction(data: { payment_request_id: string; paypal_order_id: string; amount: string; currency: string; status: string }) {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        "INSERT INTO transactions (payment_request_id, paypal_order_id, amount, currency, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [data.payment_request_id, data.paypal_order_id, data.amount, data.currency, data.status]
      );
      return rows[0];
    }
    const tx = { id: randomUUID(), ...data, captured_at: null, created_at: new Date().toISOString() };
    memoryStore.transactions.push(tx);
    return tx;
  },

  async captureTransaction(paypalOrderId: string, captureId: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery(
        "UPDATE transactions SET paypal_capture_id = $1, status = 'CAPTURED', captured_at = now() WHERE paypal_order_id = $2 RETURNING *",
        [captureId, paypalOrderId]
      );
      return rows[0] || null;
    }
    const tx = memoryStore.transactions.find(t => t.paypal_order_id === paypalOrderId);
    if (tx) {
      tx.paypal_capture_id = captureId;
      tx.status = "CAPTURED";
      tx.captured_at = new Date().toISOString();
    }
    return tx || null;
  },

  async getTransactionByRequestId(requestId: string) {
    if (isNeonConfigured()) {
      const rows = await runQuery("SELECT * FROM transactions WHERE payment_request_id = $1 LIMIT 1", [requestId]);
      return rows[0] || null;
    }
    return memoryStore.transactions.find(t => t.payment_request_id === requestId) || null;
  },

  // Audit Logs with Hash Chain
  async appendAuditLog(data: {
    actor_id: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    event_data: Record<string, any>;
    simulated?: boolean;
  }) {
    let prevHash: string | null = null;
    if (isNeonConfigured()) {
      const lastRow = await runQuery("SELECT event_hash FROM audit_logs ORDER BY created_at DESC LIMIT 1");
      if (lastRow.length > 0) prevHash = lastRow[0].event_hash;
    } else {
      if (memoryStore.audit_logs.length > 0) {
        prevHash = memoryStore.audit_logs[memoryStore.audit_logs.length - 1].event_hash;
      }
    }

    const eventHash = computeEventHash(prevHash, data.event_data);

    if (isNeonConfigured()) {
      const rows = await runQuery(
        `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, event_data, simulated, event_hash, previous_event_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [data.actor_id, data.entity_type, data.entity_id, data.action, JSON.stringify(data.event_data), Boolean(data.simulated), eventHash, prevHash]
      );
      return rows[0];
    }

    const log = {
      id: randomUUID(),
      actor_id: data.actor_id,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      action: data.action,
      event_data: data.event_data,
      simulated: Boolean(data.simulated),
      event_hash: eventHash,
      previous_event_hash: prevHash,
      created_at: new Date().toISOString()
    };
    memoryStore.audit_logs.push(log);
    return log;
  },

  async listAuditLogs(limit = 100) {
    if (isNeonConfigured()) {
      return await runQuery("SELECT * FROM audit_logs ORDER BY created_at ASC LIMIT $1", [limit]);
    }
    return memoryStore.audit_logs.slice(0, limit);
  }
};

export const repo = repository;
