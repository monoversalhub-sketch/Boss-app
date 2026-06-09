-- ═══════════════════════════════════════════════════════════════════
-- BOSS ADMIN — Business Success Intelligence Platform
-- ═══════════════════════════════════════════════════════════════════
-- Run this AFTER supabase-schema.sql in Supabase SQL Editor.

-- ── ADMIN USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email     text UNIQUE NOT NULL,
  name      text NOT NULL,
  role      text NOT NULL DEFAULT 'support'
            CHECK (role IN ('admin', 'support', 'analyst', 'readonly')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin_users (for login)
-- We use a separate auth flow for admins

-- ── EVENT TRACKING ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id  uuid REFERENCES tailors(id) ON DELETE CASCADE,
  feature    text NOT NULL,
  action     text NOT NULL,
  screen     text,
  metadata   jsonb DEFAULT '{}',
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_events_tailor ON feature_events(tailor_id);
CREATE INDEX IF NOT EXISTS idx_feature_events_feature ON feature_events(feature);
CREATE INDEX IF NOT EXISTS idx_feature_events_created ON feature_events(created_at);

ALTER TABLE feature_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_feature_events" ON feature_events
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── JOURNEY ANALYTICS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journey_analytics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id       uuid REFERENCES tailors(id) ON DELETE CASCADE,
  journey         text NOT NULL
                  CHECK (journey IN ('add_order','payment','reminder','customer_creation','onboarding','setup')),
  step            text NOT NULL,
  status          text NOT NULL
                  CHECK (status IN ('started','completed','abandoned')),
  duration_ms     integer,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journey_tailor ON journey_analytics(tailor_id);
CREATE INDEX IF NOT EXISTS idx_journey_type ON journey_analytics(journey);
CREATE INDEX IF NOT EXISTS idx_journey_created ON journey_analytics(created_at);

ALTER TABLE journey_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_journey" ON journey_analytics
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── BUSINESS HEALTH SCORES (computed daily by cron) ──────────────
CREATE TABLE IF NOT EXISTS business_health_scores (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id               uuid REFERENCES tailors(id) ON DELETE CASCADE UNIQUE,
  score                   integer NOT NULL CHECK (score >= 0 AND score <= 100),
  category                text NOT NULL
                          CHECK (category IN ('healthy','growing','at_risk','dormant')),
  order_activity_score    integer DEFAULT 0,
  payment_activity_score  integer DEFAULT 0,
  customer_retention_score integer DEFAULT 0,
  overdue_jobs_penalty    integer DEFAULT 0,
  app_usage_score         integer DEFAULT 0,
  computed_at             timestamptz DEFAULT now()
);

ALTER TABLE business_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_health" ON business_health_scores
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── CHURN RISK ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS churn_risk (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id                 uuid REFERENCES tailors(id) ON DELETE CASCADE UNIQUE,
  risk_score                integer NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level                text NOT NULL
                            CHECK (risk_level IN ('low','medium','high','critical')),
  days_since_last_active    integer,
  orders_declining          boolean DEFAULT false,
  payments_declining        boolean DEFAULT false,
  intervention_recommended  text,
  computed_at               timestamptz DEFAULT now()
);

ALTER TABLE churn_risk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_churn" ON churn_risk
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── TRUST SCORE HISTORY ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trust_score_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id  uuid REFERENCES tailors(id) ON DELETE CASCADE,
  score      integer NOT NULL,
  components jsonb DEFAULT '{}',
  reason     text,
  changed_by text,
  delta      integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tsh_tailor ON trust_score_history(tailor_id);
CREATE INDEX IF NOT EXISTS idx_tsh_created ON trust_score_history(created_at);

ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_tsh" ON trust_score_history
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── SUPPORT TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id   uuid REFERENCES tailors(id) ON DELETE SET NULL,
  subject     text NOT NULL,
  description text,
  priority    text NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('low','medium','high','critical')),
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at   timestamptz
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_tickets" ON support_tickets
  FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── FEATURE REQUESTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id   uuid REFERENCES tailors(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  category    text,
  votes       integer DEFAULT 0,
  status      text NOT NULL DEFAULT 'under_review'
              CHECK (status IN ('under_review','planned','in_progress','shipped','declined')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_feature_requests" ON feature_requests
  FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── BUG REPORTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bug_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id   uuid REFERENCES tailors(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  severity    text NOT NULL DEFAULT 'minor'
              CHECK (severity IN ('cosmetic','minor','major','critical')),
  status      text NOT NULL DEFAULT 'reported'
              CHECK (status IN ('reported','confirmed','in_progress','fixed','closed')),
  created_at  timestamptz DEFAULT now(),
  fixed_at    timestamptz
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_bugs" ON bug_reports
  FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── CREDIT READINESS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_readiness (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id               uuid REFERENCES tailors(id) ON DELETE CASCADE UNIQUE,
  trust_score_history     jsonb DEFAULT '[]',
  payment_consistency     decimal DEFAULT 0,
  delivery_reliability    decimal DEFAULT 0,
  customer_retention_rate decimal DEFAULT 0,
  monthly_revenue_avg     decimal DEFAULT 0,
  revenue_volatility      decimal DEFAULT 0,
  months_of_data          integer DEFAULT 0,
  credit_ready            boolean DEFAULT false,
  estimated_credit_limit  decimal DEFAULT 0,
  computed_at             timestamptz DEFAULT now()
);

ALTER TABLE credit_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_credit" ON credit_readiness
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── PRODUCT METRICS (daily aggregates) ───────────────────────────
CREATE TABLE IF NOT EXISTS product_metrics (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date      date NOT NULL,
  feature          text NOT NULL,
  users_reached    integer DEFAULT 0,
  users_activated  integer DEFAULT 0,
  repeat_usage     integer DEFAULT 0,
  retention_impact decimal DEFAULT 0,
  UNIQUE(metric_date, feature)
);

ALTER TABLE product_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_product_metrics" ON product_metrics
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- ── ADMIN SESSION (for auth) ─────────────────────────────────────
-- Admins authenticate via a separate Supabase auth or SSO.
-- This table links auth.users to admin_users.
CREATE TABLE IF NOT EXISTS admin_auth_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid REFERENCES admin_users(id) ON DELETE CASCADE UNIQUE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE admin_auth_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_own_link" ON admin_auth_links
  FOR SELECT USING (auth.uid() = auth_user_id);
