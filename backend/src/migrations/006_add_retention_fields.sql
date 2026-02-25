-- Migration: Add retention tracking fields to conversions table
-- Date: 2026-02-25
-- Description: Track user activity and retention for quality scoring

ALTER TABLE conversions
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS days_since_signup INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS churn_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS retention_7d BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS retention_30d BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS retention_60d BOOLEAN DEFAULT true;

-- Backfill: assume all existing conversions are active from their signup date
UPDATE conversions
SET
  last_activity_at = converted_at,
  is_active = true,
  days_since_signup = EXTRACT(DAY FROM NOW() - converted_at)::INTEGER,
  retention_7d = (converted_at >= NOW() - INTERVAL '7 days' OR true),
  retention_30d = (converted_at >= NOW() - INTERVAL '60 days'),
  retention_60d = (converted_at >= NOW() - INTERVAL '120 days')
WHERE last_activity_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversions_activity ON conversions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_conversions_active   ON conversions(is_active);
CREATE INDEX IF NOT EXISTS idx_conversions_ret      ON conversions(influencer_id, retention_30d, retention_60d);
