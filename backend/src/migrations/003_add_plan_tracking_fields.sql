-- Migração: Adicionar campos de rastreamento de planos
-- Data: 2026-02-24

-- Adicionar colunas de plano na tabela conversions
ALTER TABLE conversions
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS previous_plan VARCHAR(20),
ADD COLUMN IF NOT EXISTS plan_upgraded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS monthly_value DECIMAL(10,2);

-- Adicionar constraint para validar plan_type
ALTER TABLE conversions
ADD CONSTRAINT check_plan_type
CHECK (plan_type IN ('free', 'starter', 'pro'));

-- Adicionar constraint para validar previous_plan
ALTER TABLE conversions
ADD CONSTRAINT check_previous_plan
CHECK (previous_plan IS NULL OR previous_plan IN ('free', 'starter', 'pro'));

-- Índices para performance em queries de analytics
CREATE INDEX IF NOT EXISTS idx_conversions_plan_type ON conversions(plan_type);
CREATE INDEX IF NOT EXISTS idx_conversions_plan_upgraded_at ON conversions(plan_upgraded_at);
CREATE INDEX IF NOT EXISTS idx_conversions_influencer_plan ON conversions(influencer_id, plan_type);

-- Atualizar conversões existentes com valores padrão
-- Conversões pagas antigas assumem 'starter' como padrão
UPDATE conversions
SET monthly_value = amount
WHERE monthly_value IS NULL AND status = 'paid';

UPDATE conversions
SET monthly_value = amount
WHERE monthly_value IS NULL AND status = 'pending';
