-- Migration: Create chc_movements table for tracking CHC coin activity
-- Date: 2026-02-25
-- Description: Track CHC (Chico Coin) movements from users referred by each influencer
--              1000 CHC = R$ 1.00
--              movement_type: 'earned', 'spent', 'purchased', 'won', 'lost'

CREATE TABLE IF NOT EXISTS chc_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID REFERENCES influencers(id),
  user_id UUID NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  chc_amount INTEGER NOT NULL,
  real_value DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Constraint: only valid movement types
ALTER TABLE chc_movements
ADD CONSTRAINT check_movement_type
CHECK (movement_type IN ('earned', 'spent', 'purchased', 'won', 'lost'));

-- Index for fast queries by influencer
CREATE INDEX IF NOT EXISTS idx_chc_movements_influencer ON chc_movements(influencer_id);

-- Index for fast queries by date
CREATE INDEX IF NOT EXISTS idx_chc_movements_date ON chc_movements(created_at);

-- Composite index for common queries (influencer + date range)
CREATE INDEX IF NOT EXISTS idx_chc_movements_influencer_date ON chc_movements(influencer_id, created_at DESC);
