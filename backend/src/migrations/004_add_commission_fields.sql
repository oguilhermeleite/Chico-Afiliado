-- Migration: Add commission tracking fields to conversions table
-- Date: 2026-02-25
-- Description: Add commission_rate, commission_amount, and plan_monthly_value columns
--              to track affiliate commissions per conversion

-- Add commission tracking columns
ALTER TABLE conversions
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS plan_monthly_value DECIMAL(10,2);

-- Add constraint: commission_rate must be between 0-100%
ALTER TABLE conversions
ADD CONSTRAINT check_commission_rate
CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- Create index for fast commission queries
CREATE INDEX IF NOT EXISTS idx_conversions_commission
ON conversions(influencer_id, status, commission_amount);

-- Backfill existing conversions with commission data
-- Commission structure:
-- - Starter Plan: R$ 19.90/month → 20% = R$ 3.98 per conversion
-- - Pro Plan: R$ 49.90/month → 20% = R$ 9.98 per conversion
-- - Free Plan: R$ 0.00 commission
-- - Only PAID conversions generate commission (pending = 0)

-- Update Starter plan conversions
UPDATE conversions
SET
  commission_rate = 20.00,
  commission_amount = CASE
    WHEN status = 'paid' THEN 3.98
    ELSE 0.00
  END,
  plan_monthly_value = 19.90
WHERE plan_type = 'starter';

-- Update Pro plan conversions
UPDATE conversions
SET
  commission_rate = 20.00,
  commission_amount = CASE
    WHEN status = 'paid' THEN 9.98
    ELSE 0.00
  END,
  plan_monthly_value = 49.90
WHERE plan_type = 'pro';

-- Update Free plan conversions
UPDATE conversions
SET
  commission_rate = 0.00,
  commission_amount = 0.00,
  plan_monthly_value = 0.00
WHERE plan_type = 'free' OR plan_type IS NULL;
