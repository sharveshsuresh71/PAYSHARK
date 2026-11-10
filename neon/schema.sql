-- Neon PostgreSQL Schema for PAYSHARK AI
-- Tagline: Trust Every Agreement. Control Every Payment.

create extension if not exists pgcrypto;

-- 1. User Profiles (replaces Supabase auth.users with standard Postgres auth)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  email text not null unique,
  password_hash text,
  role text not null default 'buyer' check(role in ('buyer','seller','admin')),
  totp_secret_enc text,
  totp_enabled boolean not null default false,
  locked boolean not null default false,
  lock_reason text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Agreements
-- Counterparty is identified by email, and later bound to seller_id upon verified authentication.
create table if not exists agreements (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid references profiles(id) on delete set null,
  counterparty_email text not null,
  title text not null,
  original_text text not null,
  extracted_terms jsonb not null default '{}',
  amount numeric(18,2) check(amount > 0),
  currency text check(currency ~ '^[A-Z]{3}$'),
  deadline date,
  status text not null default 'DRAFT' check(status in ('DRAFT','NEEDS_CLARIFICATION','PENDING_CONFIRMATION','ACTIVE','CANCELLED','SUPERSEDED')),
  current_version int not null default 1,
  invitation_token_hash text,
  invitation_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Agreement Versions
create table if not exists agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id) on delete cascade,
  version_number int not null,
  structured_terms jsonb not null,
  content_hash text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique(agreement_id, version_number)
);

-- 4. Agreement Confirmations (Mutual consent: buyer + seller)
create table if not exists agreement_confirmations (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id) on delete cascade,
  version_id uuid not null references agreement_versions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  confirmation_status text not null check(confirmation_status in ('CONFIRMED','REJECTED')),
  confirmed_at timestamptz not null default now(),
  unique(version_id, user_id)
);

-- 5. Spending Policies
create table if not exists spending_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  agreement_id uuid not null references agreements(id) on delete cascade,
  policy_name text not null,
  maximum_amount numeric(18,2) not null check(maximum_amount > 0),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  allowed_merchants jsonb not null default '[]',
  allowed_categories jsonb not null default '[]',
  maximum_transactions int not null check(maximum_transactions > 0),
  used_transactions int not null default 0 check(used_transactions <= maximum_transactions),
  require_human_approval boolean not null default true,
  expires_at timestamptz,
  status text not null default 'DRAFT' check(status in ('DRAFT','ACTIVE','REVOKED')),
  version int not null default 1,
  created_at timestamptz not null default now()
);

-- 6. Registered AI Agents
create table if not exists registered_agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  agent_name text not null,
  credential_hash text not null unique,
  permissions jsonb not null default '["payment:request"]',
  status text not null default 'ACTIVE' check(status in ('ACTIVE','REVOKED')),
  created_at timestamptz not null default now()
);

-- 7. Payment Requests
create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  agreement_id uuid not null references agreements(id) on delete cascade,
  policy_id uuid not null references spending_policies(id) on delete cascade,
  agent_id uuid references registered_agents(id) on delete set null,
  merchant text not null,
  merchant_id text not null,
  purpose text not null,
  requested_amount numeric(18,2) not null check(requested_amount > 0),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  risk_score int default 0,
  risk_reasons jsonb not null default '[]',
  policy_result jsonb not null default '{}',
  decision text not null check(decision in ('BLOCKED','REQUIRES_REVIEW','APPROVED_FOR_REVIEW')),
  status text not null default 'RECEIVED' check(status in ('RECEIVED','EVALUATING','BLOCKED','REQUIRES_REVIEW','APPROVED_FOR_REVIEW','HUMAN_APPROVED','REJECTED_BY_USER','PAYMENT_PENDING','COMPLETED')),
  idempotency_key text not null,
  agreement_version int not null,
  policy_version int not null,
  created_at timestamptz not null default now(),
  unique(agent_id, idempotency_key)
);

-- 8. Payment Approvals (Single-use cryptographic authorization binding)
create table if not exists payment_approvals (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references payment_requests(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  approved_amount numeric(18,2) not null,
  currency text not null,
  merchant_id text not null,
  agreement_version int not null,
  policy_version int not null,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','CONSUMED','INVALIDATED')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists one_live_approval_per_request on payment_approvals(payment_request_id) where status='APPROVED';

-- 9. Transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null unique references payment_requests(id) on delete cascade,
  paypal_order_id text unique,
  paypal_capture_id text unique,
  amount numeric(18,2) not null,
  currency text not null,
  status text not null check(status in ('ORDER_CREATED','PAYER_APPROVED','CAPTURE_PENDING','CAPTURED','FAILED','CANCELLED','REFUNDED')),
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

-- 10. Audit Logs (Tamper-evident hash chained)
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  event_data jsonb not null default '{}',
  simulated boolean not null default false,
  event_hash text not null,
  previous_event_hash text,
  created_at timestamptz not null default now()
);

-- 11. Webhook Events (Replay protection)
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  paypal_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processing_status text not null default 'RECEIVED',
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- 12. Active Sessions (Server-side session tracking and revocation)
create table if not exists active_sessions (
  id text primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  device_fingerprint text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- 13. Digital Agreement Signatures (Non-repudiation)
create table if not exists agreement_signatures (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id) on delete cascade,
  signer_profile_id uuid not null references profiles(id) on delete cascade,
  signer_role text not null check(signer_role in ('buyer','seller')),
  signature_b64 text not null,
  terms_hash text not null,
  signed_at timestamptz not null default now(),
  unique(agreement_id, signer_role)
);

-- 14. Security Alerts Log
create table if not exists security_alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null check(severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  event_type text not null,
  message text not null,
  profile_id uuid references profiles(id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Indexes for high-throughput lookup
create index if not exists idx_agreements_parties on agreements(buyer_id, seller_id);
create index if not exists idx_policies_agreement on spending_policies(agreement_id);
create index if not exists idx_payment_requests_agreement on payment_requests(agreement_id, policy_id);
create index if not exists idx_audit_entity on audit_logs(entity_id, created_at);

-- Atomic SQL transaction limit reservation
create or replace function reserve_policy_use(policy_uuid uuid)
returns setof spending_policies language sql as $$
  update spending_policies
  set used_transactions = used_transactions + 1
  where id = policy_uuid
    and status = 'ACTIVE'
    and used_transactions < maximum_transactions
    and (expires_at is null or expires_at > now())
  returning *;
$$;
