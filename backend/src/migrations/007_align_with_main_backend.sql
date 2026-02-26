-- Migration 007: Align affiliate database with main ChicoIA backend standards
-- Date: 2026-02-26
-- Changes:
--   1. user_id UUID → VARCHAR(255) in conversions and chc_movements
--   2. plan_type constraint: 'starter' → 'start', add 'goat'
--   3. Rename existing 'starter' data to 'start'
--   4. Fix Pro plan values: R$ 49.90 → R$ 29.90, commission R$ 9.98 → R$ 5.98
--   5. Create plan_catalog table as single source of truth for plan prices

-- ─── 1. user_id: UUID → VARCHAR(255) ─────────────────────────────────────────
-- Preserves existing UUID values as strings; accepts future integer IDs from
-- main backend without another migration.

ALTER TABLE conversions
  ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::TEXT;

ALTER TABLE chc_movements
  ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::TEXT;

-- ─── 2. Fix plan constraints on conversions ───────────────────────────────────

-- Drop old constraints
ALTER TABLE conversions DROP CONSTRAINT IF EXISTS check_plan_type;
ALTER TABLE conversions DROP CONSTRAINT IF EXISTS check_previous_plan;

-- Rename 'starter' → 'start' in all existing rows
UPDATE conversions SET plan_type     = 'start' WHERE plan_type     = 'starter';
UPDATE conversions SET previous_plan = 'start' WHERE previous_plan = 'starter';

-- Add updated constraints matching main backend plan names
ALTER TABLE conversions
  ADD CONSTRAINT check_plan_type
  CHECK (plan_type IN ('free', 'start', 'pro', 'goat'));

ALTER TABLE conversions
  ADD CONSTRAINT check_previous_plan
  CHECK (previous_plan IS NULL OR previous_plan IN ('free', 'start', 'pro', 'goat'));

-- ─── 3. Fix Pro plan values ───────────────────────────────────────────────────
-- Main backend: pro = R$ 29.90/month (not R$ 49.90)
-- Commission:   20% of 29.90 = R$ 5.98 (not R$ 9.98)

UPDATE conversions
SET
  plan_monthly_value = 29.90,
  commission_rate    = 20.00,
  commission_amount  = CASE
    WHEN status = 'paid' THEN 5.98
    ELSE 0.00
  END
WHERE plan_type = 'pro';

-- Fix start plan monthly_value as well (seed used 97.00 for demo — set to real value)
UPDATE conversions
SET
  plan_monthly_value = 19.90,
  commission_rate    = 20.00,
  commission_amount  = CASE
    WHEN status = 'paid' THEN 3.98
    ELSE 0.00
  END
WHERE plan_type = 'start';

-- ─── 4. Create plan_catalog — single source of truth for plan prices ──────────

CREATE TABLE IF NOT EXISTS plan_catalog (
  plan_type         VARCHAR(20)    PRIMARY KEY,
  display_name      VARCHAR(50)    NOT NULL,
  monthly_price     DECIMAL(10,2)  NOT NULL,
  commission_rate   DECIMAL(5,2)   NOT NULL DEFAULT 20.00,
  commission_amount DECIMAL(10,2)  NOT NULL,
  uploads_limit     INTEGER        NOT NULL DEFAULT 0,
  created_at        TIMESTAMP      DEFAULT NOW()
);

INSERT INTO plan_catalog (plan_type, display_name, monthly_price, commission_rate, commission_amount, uploads_limit)
VALUES
  ('free',  'Free',  0.00,  0.00, 0.00,  1000),
  ('start', 'Start', 19.90, 20.00, 3.98,  40),
  ('pro',   'Pro',   29.90, 20.00, 5.98,  80),
  ('goat',  'Goat',  49.90, 20.00, 9.98,  200)
ON CONFLICT (plan_type) DO UPDATE SET
  monthly_price     = EXCLUDED.monthly_price,
  commission_rate   = EXCLUDED.commission_rate,
  commission_amount = EXCLUDED.commission_amount,
  uploads_limit     = EXCLUDED.uploads_limit;

-- ─── 5. Index naming: add ix_ aliases for new conventions ────────────────────
-- (Old idx_ indexes are kept for backwards compat — both work identically)

CREATE INDEX IF NOT EXISTS ix_conversions_influencer_id  ON conversions(influencer_id);
CREATE INDEX IF NOT EXISTS ix_conversions_status         ON conversions(status);
CREATE INDEX IF NOT EXISTS ix_conversions_converted_at   ON conversions(converted_at);
CREATE INDEX IF NOT EXISTS ix_conversions_plan_type      ON conversions(plan_type);
CREATE INDEX IF NOT EXISTS ix_chc_movements_influencer_id ON chc_movements(influencer_id);
CREATE INDEX IF NOT EXISTS ix_chc_movements_created_at   ON chc_movements(created_at);
CREATE INDEX IF NOT EXISTS ix_influencers_email          ON influencers(email);
CREATE INDEX IF NOT EXISTS ix_influencers_referral_code  ON influencers(referral_code);
