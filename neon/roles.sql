-- Neon Role Separation for PAYSHARK AI
-- Feature #61: Least privilege database role architecture

-- 1. Application Role (Used by Next.js serverless functions during normal operations)
-- Only granted access to runtime operational tables. Cannot drop tables, alter schemas, or truncate logs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'payshark_app') THEN
    CREATE ROLE payshark_app LOGIN PASSWORD 'replace_with_secure_production_password' NOINHERIT;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE current_database() TO payshark_app;
GRANT USAGE ON SCHEMA public TO payshark_app;

GRANT SELECT, INSERT, UPDATE ON
  profiles,
  agreements,
  agreement_versions,
  agreement_confirmations,
  spending_policies,
  registered_agents,
  payment_requests,
  payment_approvals,
  transactions,
  audit_logs,
  webhook_events,
  active_sessions,
  agreement_signatures,
  security_alerts
TO payshark_app;

GRANT DELETE ON
  active_sessions,
  webhook_events
TO payshark_app;

-- Revoke dangerous operations from application role
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM payshark_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM payshark_app;

-- 2. Read-Only Analytics Role (For dashboards, SIEM telemetry, and read replicas)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'payshark_readonly') THEN
    CREATE ROLE payshark_readonly LOGIN PASSWORD 'replace_with_secure_readonly_password' NOINHERIT;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE current_database() TO payshark_readonly;
GRANT USAGE ON SCHEMA public TO payshark_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO payshark_readonly;

-- 3. Migration / DDL Role (Only executed during CI/CD deployments)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'payshark_migrate') THEN
    CREATE ROLE payshark_migrate LOGIN PASSWORD 'replace_with_secure_migration_password' NOINHERIT;
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE current_database() TO payshark_migrate;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO payshark_migrate;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO payshark_migrate;
