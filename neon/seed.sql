-- Seed data for Neon Postgres PAYSHARK AI testing

-- Demo Users
insert into profiles (id, full_name, email, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Alex Mercer (Buyer)', 'buyer@payshark.ai', 'buyer'),
  ('22222222-2222-2222-2222-222222222222', 'Elena Rostova (Seller)', 'seller@example.com', 'seller')
on conflict (email) do nothing;

-- Demo Agreement
insert into agreements (
  id, buyer_id, seller_id, counterparty_email, title, original_text,
  amount, currency, status, current_version
)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'seller@example.com',
  'Enterprise Web Platform Engineering — Phase 1',
  'Buyer agrees to pay Seller 500.00 USD for cloud architecture and frontend design deliverables.',
  500.00,
  'USD',
  'ACTIVE',
  1
)
on conflict do nothing;

-- Version 1
insert into agreement_versions (
  id, agreement_id, version_number, structured_terms, content_hash, created_by
)
values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  1,
  '{"amount": "500.00", "currency": "USD", "deliverables": ["Cloud architecture", "Frontend design"], "transaction_purpose": "Software engineering deliverables"}',
  'hash_seed_v1',
  '11111111-1111-1111-1111-111111111111'
)
on conflict do nothing;

-- Confirmations (both confirmed)
insert into agreement_confirmations (agreement_id, version_id, user_id, confirmation_status)
values
  ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'CONFIRMED'),
  ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'CONFIRMED')
on conflict do nothing;

-- Demo Spending Policy
insert into spending_policies (
  id, owner_id, agreement_id, policy_name, maximum_amount, currency,
  allowed_merchants, allowed_categories, maximum_transactions, used_transactions,
  require_human_approval, status, version
)
values (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'Engineering Discretionary Budget',
  250.00,
  'USD',
  '["Elena Rostova", "seller@example.com", "Acme Cloud"]',
  '["software", "engineering", "cloud services", "deliverables"]',
  10,
  0,
  true,
  'ACTIVE',
  1
)
on conflict do nothing;

-- Demo Registered Agent
-- Token: "ps_live_demo_agent_key_12345" -> sha256 hash
insert into registered_agents (
  id, owner_id, agent_name, credential_hash, permissions, status
)
values (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'Autonomous Procurement Agent 01',
  encode(digest('ps_live_demo_agent_key_12345', 'sha256'), 'hex'),
  '["payment:request"]',
  'ACTIVE'
)
on conflict do nothing;
