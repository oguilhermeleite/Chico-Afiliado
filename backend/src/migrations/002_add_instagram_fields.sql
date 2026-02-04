-- Migração: Adicionar campos do Instagram
-- Data: 2026-02-01

-- Adicionar colunas do Instagram na tabela influencers
ALTER TABLE influencers
ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS instagram_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS instagram_profile_picture TEXT,
ADD COLUMN IF NOT EXISTS instagram_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS facebook_page_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS instagram_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS instagram_access_token TEXT;

-- Índice para busca por instagram_id
CREATE INDEX IF NOT EXISTS idx_instagram_id ON influencers(instagram_id);

-- Índice para busca por instagram_username
CREATE INDEX IF NOT EXISTS idx_instagram_username ON influencers(instagram_username);
