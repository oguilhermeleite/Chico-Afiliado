# ChicoIA Affiliate Dashboard — Database Documentation

> **Para:** Felipe e time de desenvolvimento
> **Projeto:** ChicoIA Affiliate Dashboard
> **Banco:** PostgreSQL 17.6 via Supabase
> **Atualizado em:** 2026-02-26

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Conexão](#2-conexão)
3. [Diagrama de Relacionamentos](#3-diagrama-de-relacionamentos)
4. [Tabela: influencers](#4-tabela-influencers)
5. [Tabela: conversions](#5-tabela-conversions)
6. [Tabela: chc_movements](#6-tabela-chc_movements)
7. [Lógica de Negócio](#7-lógica-de-negócio)
8. [Queries de Exemplo](#8-queries-de-exemplo)
9. [Migrações](#9-migrações)
10. [Dados de Teste](#10-dados-de-teste)
11. [Endpoints da API e Tabelas Utilizadas](#11-endpoints-da-api-e-tabelas-utilizadas)
12. [Variáveis de Ambiente](#12-variáveis-de-ambiente)
13. [Backup e Manutenção](#13-backup-e-manutenção)
14. [Guia de Integração](#14-guia-de-integração)
15. [Performance e Índices](#15-performance-e-índices)
16. [Segurança](#16-segurança)

---

## 1. Visão Geral

O banco de dados armazena todos os dados do sistema de afiliados da ChicoIA. O sistema permite que **influenciadores** (afiliados) gerem links de referência, acompanhem **conversões** de usuários que assinaram planos da ChicoIA e monitorem o engajamento via **movimentações de CHC** (Chico Coin, a moeda interna da plataforma).

### Tabelas existentes

| Tabela | Propósito | Linhas esperadas |
|---|---|---|
| `influencers` | Cadastro e autenticação dos afiliados | Centenas |
| `conversions` | Cada usuário convertido por um afiliado | Dezenas de milhares |
| `chc_movements` | Movimentações de CHC dos usuários referidos | Centenas de milhares |

---

## 2. Conexão

### Supabase (produção e desenvolvimento)

```
Host:     aws-0-us-west-2.pooler.supabase.com
Porta:    5432
Banco:    postgres
Usuário:  postgres.bxtjfutcjsaedkkothcs
SSL:      requerido (rejectUnauthorized: false)
```

> **Atenção:** Usar sempre o **Session Pooler** (porta 5432), não o Transaction Pooler (porta 6543). O Session Pooler é compatível com redes IPv4.

### String de conexão completa

```
DATABASE_URL=postgresql://postgres.bxtjfutcjsaedkkothcs:SENHA@aws-0-us-west-2.pooler.supabase.com:5432/postgres
```

### Como testar a conexão

```bash
cd backend
node test-db.js
```

Saída esperada:
```
✅ Conexão bem-sucedida!
   Hora do servidor: 2026-02-26T...
   Versão PostgreSQL: PostgreSQL 17.6

📋 Tabelas encontradas:
   - chc_movements
   - conversions
   - influencers
```

---

## 3. Diagrama de Relacionamentos

```
┌─────────────────────────────────────┐
│              influencers             │
│─────────────────────────────────────│
│ id (PK, UUID)                       │
│ name                                │
│ email (UNIQUE)                      │
│ referral_code (UNIQUE)              │
│ instagram_id (UNIQUE)               │
│ ...                                 │
└──────────────┬──────────────────────┘
               │ 1
               │
       ┌───────┴───────┐
       │               │
       │ many          │ many
       ▼               ▼
┌──────────────┐  ┌──────────────────┐
│ conversions  │  │  chc_movements   │
│──────────────│  │──────────────────│
│ id (PK)      │  │ id (PK)          │
│ influencer_id│  │ influencer_id    │  ← FK → influencers.id
│ user_id      │  │ user_id          │  ← usuário na ChicoIA
│ plan_type    │  │ movement_type    │
│ status       │  │ chc_amount       │
│ amount       │  │ real_value       │
│ commission_* │  │ ...              │
│ retention_*  │  └──────────────────┘
│ ...          │
└──────────────┘
```

**Regras:**
- Um `influencer` tem muitas `conversions` (1:N)
- Um `influencer` tem muitas `chc_movements` (1:N)
- `conversions.influencer_id` → `influencers.id` com `ON DELETE CASCADE`
- `chc_movements.influencer_id` → `influencers.id`
- `user_id` em ambas as tabelas referencia usuários na plataforma ChicoIA principal (sistema externo, sem FK local)

---

## 4. Tabela: influencers

**Propósito:** Armazena o cadastro dos afiliados/influenciadores. É a tabela central do sistema.

### Schema completo

| Coluna | Tipo | Restrições | Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | `uuid_generate_v4()` | Identificador único do afiliado |
| `name` | `VARCHAR(255)` | NOT NULL | — | Nome completo do afiliado |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | — | Email de login |
| `password_hash` | `VARCHAR(255)` | NULL permitido | — | Senha com bcrypt (rounds=12). NULL se login via Google/Instagram |
| `google_id` | `VARCHAR(255)` | NULL permitido | — | ID do Google OAuth |
| `referral_code` | `VARCHAR(50)` | UNIQUE, NOT NULL | — | Código único ex: `CHICO_TESTE001` |
| `instagram_id` | `VARCHAR(255)` | UNIQUE, NULL | — | ID da conta Instagram conectada |
| `instagram_username` | `VARCHAR(255)` | NULL | — | @username do Instagram |
| `instagram_profile_picture` | `TEXT` | NULL | — | URL da foto de perfil |
| `instagram_followers` | `INTEGER` | NULL | `0` | Total de seguidores |
| `facebook_page_id` | `VARCHAR(255)` | NULL | — | ID da página Facebook vinculada |
| `instagram_connected_at` | `TIMESTAMPTZ` | NULL | — | Quando conectou o Instagram |
| `instagram_access_token` | `TEXT` | NULL | — | Token OAuth do Instagram (sensível) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Data de cadastro |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Última atualização |

### Índices

| Índice | Coluna(s) | Tipo |
|---|---|---|
| `idx_influencers_referral_code` | `referral_code` | B-Tree |
| `idx_influencers_email` | `email` | B-Tree |
| `idx_instagram_id` | `instagram_id` | B-Tree |
| `idx_instagram_username` | `instagram_username` | B-Tree |

### Exemplo de registro

```json
{
  "id": "29a8bf8d-a2a5-45d6-bade-7a3e7fd269df",
  "name": "Afiliado Teste",
  "email": "teste@chicoai.com",
  "referral_code": "CHICO_TESTE001",
  "instagram_username": "chicoai_oficial",
  "instagram_followers": 15420,
  "created_at": "2026-02-26T02:51:44.930Z"
}
```

---

## 5. Tabela: conversions

**Propósito:** Registra cada usuário que assinou um plano ChicoIA através do link de um afiliado. É a tabela mais importante para cálculo de comissões e métricas do dashboard.

### Schema completo

| Coluna | Tipo | Restrições | Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | `uuid_generate_v4()` | Identificador único da conversão |
| `influencer_id` | `UUID` | FK → influencers.id | — | Afiliado responsável pela conversão |
| `user_id` | `UUID` | NOT NULL | — | ID do usuário na plataforma ChicoIA |
| `user_name` | `VARCHAR(255)` | NULL | — | Nome do usuário convertido |
| `amount` | `DECIMAL(10,2)` | NOT NULL | `0` | Valor pago pelo usuário (ex: 97.00) |
| `status` | `VARCHAR(50)` | NOT NULL | `'pending'` | `'paid'` ou `'pending'` |
| `plan_type` | `VARCHAR(20)` | CHECK | `'starter'` | `'free'`, `'starter'` ou `'pro'` |
| `previous_plan` | `VARCHAR(20)` | CHECK, NULL | — | Plano anterior (se houve upgrade) |
| `plan_upgraded_at` | `TIMESTAMPTZ` | NULL | — | Data do upgrade de plano |
| `monthly_value` | `DECIMAL(10,2)` | NULL | — | Valor mensal do plano assinado |
| `commission_rate` | `DECIMAL(5,2)` | CHECK 0-100 | `0.00` | Taxa de comissão em % (ex: 20.00) |
| `commission_amount` | `DECIMAL(10,2)` | NULL | `0.00` | Valor da comissão em R$ |
| `plan_monthly_value` | `DECIMAL(10,2)` | NULL | — | Valor oficial do plano no catálogo |
| `last_activity_at` | `TIMESTAMP` | NULL | — | Última atividade do usuário na plataforma |
| `is_active` | `BOOLEAN` | NULL | `true` | Se o usuário ainda está ativo |
| `days_since_signup` | `INTEGER` | NULL | `0` | Dias desde o cadastro |
| `churn_date` | `TIMESTAMP` | NULL | — | Data em que o usuário cancelou |
| `retention_7d` | `BOOLEAN` | NULL | `true` | Usuário reteve por 7 dias? |
| `retention_30d` | `BOOLEAN` | NULL | `true` | Usuário reteve por 30 dias? |
| `retention_60d` | `BOOLEAN` | NULL | `true` | Usuário reteve por 60 dias? |
| `converted_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Data da conversão |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Data de criação do registro |

### Valores de `status`

| Valor | Significado |
|---|---|
| `pending` | Conversão registrada, pagamento ainda não confirmado |
| `paid` | Pagamento confirmado, comissão gerada |

### Valores de `plan_type`

| Valor | Valor mensal | Comissão |
|---|---|---|
| `free` | R$ 0,00 | R$ 0,00 |
| `starter` | R$ 19,90 | R$ 3,98 (20%) |
| `pro` | R$ 49,90 | R$ 9,98 (20%) |

> **Nota:** Os valores R$ 97,00 e R$ 197,00 nos dados de seed são valores de exemplo maiores usados para teste visual do dashboard. Os valores reais dos planos ChicoIA são R$ 19,90 e R$ 49,90.

### Índices

| Índice | Coluna(s) | Propósito |
|---|---|---|
| `idx_conversions_influencer` | `influencer_id` | Listar conversões do afiliado |
| `idx_conversions_status` | `status` | Filtrar por status |
| `idx_conversions_converted_at` | `converted_at` | Filtrar por período |
| `idx_conversions_plan_type` | `plan_type` | Analytics por plano |
| `idx_conversions_plan_upgraded_at` | `plan_upgraded_at` | Histórico de upgrades |
| `idx_conversions_influencer_plan` | `(influencer_id, plan_type)` | Analytics composto |
| `idx_conversions_commission` | `(influencer_id, status, commission_amount)` | Cálculo de comissões |
| `idx_conversions_activity` | `last_activity_at` | Retenção |
| `idx_conversions_active` | `is_active` | Usuários ativos |
| `idx_conversions_ret` | `(influencer_id, retention_30d, retention_60d)` | Métricas de retenção |

---

## 6. Tabela: chc_movements

**Propósito:** Registra cada movimentação de CHC (Chico Coin) realizada pelos usuários referidos pelo afiliado. Permite ao afiliado monitorar o engajamento dos seus indicados na plataforma.

### Taxa de conversão

```
1.000 CHC = R$ 1,00
```

### Schema completo

| Coluna | Tipo | Restrições | Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | PK, NOT NULL | `gen_random_uuid()` | Identificador único do movimento |
| `influencer_id` | `UUID` | FK → influencers.id | — | Afiliado responsável por este usuário |
| `user_id` | `UUID` | NOT NULL | — | Usuário que realizou o movimento |
| `movement_type` | `VARCHAR(50)` | CHECK, NOT NULL | — | Tipo do movimento (ver abaixo) |
| `chc_amount` | `INTEGER` | NOT NULL | — | Quantidade de CHC (sempre inteiro) |
| `real_value` | `DECIMAL(10,2)` | NOT NULL | — | Valor em R$ (`chc_amount / 1000`) |
| `description` | `TEXT` | NULL | — | Descrição do movimento |
| `created_at` | `TIMESTAMP` | NOT NULL | `NOW()` | Data/hora do movimento |

### Tipos de movimento (`movement_type`)

| Tipo | Descrição | Exemplo |
|---|---|---|
| `earned` | Usuário ganhou CHC como recompensa | Completou uma tarefa |
| `spent` | Usuário gastou CHC em produtos/serviços | Comprou um recurso premium |
| `purchased` | Usuário comprou CHC com dinheiro real | Recarga de CHC |
| `won` | Usuário ganhou CHC em sorteio/gamificação | Prêmio de campanha |
| `lost` | CHC expirado ou penalizado | Inatividade, cancelamento |

### Cálculo de real_value

```sql
-- Ao inserir, calcular automaticamente:
real_value = chc_amount::DECIMAL / 1000.0

-- Exemplo: 5000 CHC = R$ 5,00
-- Exemplo: 15000 CHC = R$ 15,00
```

### Índices

| Índice | Coluna(s) | Propósito |
|---|---|---|
| `idx_chc_movements_influencer` | `influencer_id` | Busca por afiliado |
| `idx_chc_movements_date` | `created_at` | Filtro por período |
| `idx_chc_movements_influencer_date` | `(influencer_id, created_at DESC)` | Dashboard do afiliado |

---

## 7. Lógica de Negócio

### 7.1 Cálculo de Comissão

```
Comissão = 20% do valor mensal do plano
```

| Plano | Valor Mensal | Taxa | Comissão por conversão |
|---|---|---|---|
| Free | R$ 0,00 | 0% | R$ 0,00 |
| Starter | R$ 19,90 | 20% | R$ 3,98 |
| Pro | R$ 49,90 | 20% | R$ 9,98 |

**Regra:** Somente conversões com `status = 'paid'` geram `commission_amount > 0`. Conversões `pending` têm `commission_amount = 0.00`.

```sql
-- Lógica aplicada na migration 004:
commission_amount = CASE
  WHEN status = 'paid' AND plan_type = 'starter' THEN 3.98
  WHEN status = 'paid' AND plan_type = 'pro'     THEN 9.98
  ELSE 0.00
END
```

### 7.2 Rastreamento de Planos

- Quando um usuário faz **upgrade** de plano, registra-se:
  - `plan_type` → novo plano (ex: `'pro'`)
  - `previous_plan` → plano anterior (ex: `'starter'`)
  - `plan_upgraded_at` → timestamp do upgrade
- Upgrades geram nova comissão baseada no plano novo

### 7.3 Retenção

Três janelas de retenção são rastreadas:

| Campo | Janela | Interpretação |
|---|---|---|
| `retention_7d` | 7 dias | Usuário ainda ativo após 1 semana |
| `retention_30d` | 30 dias | Usuário ainda ativo após 1 mês |
| `retention_60d` | 60 dias | Usuário ainda ativo após 2 meses |

**Status de atividade** baseado em `last_activity_at`:

| Dias sem atividade | Status | Badge no dashboard |
|---|---|---|
| < 7 dias | Ativo | 🟢 Ativo |
| 7 a 30 dias | Inativo | 🟡 Inativo |
| > 30 dias | Churned | 🔴 Churned |

### 7.4 CHC — Chico Coin

```
1.000 CHC = R$ 1,00
```

O CHC mede o **engajamento** dos usuários indicados. Afiliados com usuários que movimentam muito CHC têm maior **Quality Score** no dashboard.

**Fórmula do Quality Score (0 a 10):**
```
score = (
  retention_30d  × 30% +
  upgrade_rate   × 25% +
  chc_avg        × 20% +
  ticket_avg     × 15% +
  retention_60d  × 10%
)
```

### 7.5 Fluxo de Status

```
Usuário clica no link → conversão criada (status: pending)
                              ↓
             Pagamento confirmado na ChicoIA
                              ↓
                   status atualizado para 'paid'
                   commission_amount calculado
```

---

## 8. Queries de Exemplo

### Buscar afiliado com todas as suas conversões

```sql
SELECT
  i.id,
  i.name,
  i.email,
  i.referral_code,
  COUNT(c.id) AS total_conversions,
  COUNT(c.id) FILTER (WHERE c.status = 'paid') AS paid_conversions,
  SUM(c.commission_amount) AS total_commission
FROM influencers i
LEFT JOIN conversions c ON c.influencer_id = i.id
WHERE i.email = 'afiliado@exemplo.com'
GROUP BY i.id;
```

### Calcular comissão total do período

```sql
SELECT
  SUM(commission_amount) AS commission_paid,
  COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
FROM conversions
WHERE
  influencer_id = $1
  AND converted_at >= NOW() - INTERVAL '30 days';
```

### Taxa de retenção por plano

```sql
SELECT
  plan_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE retention_7d = true) AS retained_7d,
  COUNT(*) FILTER (WHERE retention_30d = true) AS retained_30d,
  COUNT(*) FILTER (WHERE retention_60d = true) AS retained_60d,
  ROUND(AVG(CASE WHEN retention_30d THEN 100.0 ELSE 0 END), 1) AS retention_30d_pct
FROM conversions
WHERE influencer_id = $1
GROUP BY plan_type;
```

### Movimentações de CHC por período

```sql
SELECT
  movement_type,
  COUNT(*) AS total_movements,
  SUM(chc_amount) AS total_chc,
  SUM(real_value) AS total_real,
  AVG(chc_amount) AS avg_chc_per_move
FROM chc_movements
WHERE
  influencer_id = $1
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY movement_type
ORDER BY total_chc DESC;
```

### Usuários ativos (últimos 7 dias)

```sql
SELECT
  user_name,
  plan_type,
  last_activity_at,
  EXTRACT(DAY FROM NOW() - last_activity_at) AS days_inactive
FROM conversions
WHERE
  influencer_id = $1
  AND last_activity_at >= NOW() - INTERVAL '7 days'
  AND is_active = true
ORDER BY last_activity_at DESC;
```

### Distribuição de conversões por plano

```sql
SELECT
  plan_type,
  COUNT(*) AS total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage,
  SUM(amount) AS total_value
FROM conversions
WHERE
  influencer_id = $1
  AND converted_at >= NOW() - INTERVAL '30 days'
GROUP BY plan_type
ORDER BY total DESC;
```

### Top usuários por CHC movimentado

```sql
SELECT
  user_id,
  SUM(chc_amount) AS total_chc,
  SUM(real_value) AS total_real_value,
  COUNT(*) AS total_movements
FROM chc_movements
WHERE
  influencer_id = $1
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_chc DESC
LIMIT 10;
```

### Upgrades de plano realizados

```sql
SELECT
  user_name,
  previous_plan AS from_plan,
  plan_type AS to_plan,
  plan_upgraded_at,
  commission_amount
FROM conversions
WHERE
  influencer_id = $1
  AND previous_plan IS NOT NULL
  AND plan_upgraded_at >= NOW() - INTERVAL '30 days'
ORDER BY plan_upgraded_at DESC;
```

---

## 9. Migrações

As migrações ficam em `backend/src/migrations/` e são executadas em ordem numérica.

### Como executar

```bash
cd backend
npm run migrate
```

### Lista de migrações

#### `001_create_tables.sql`
Cria as tabelas base do sistema.
- Tabela `influencers`: id, name, email, password_hash, google_id, referral_code, created_at, updated_at
- Tabela `conversions`: id, influencer_id, user_id, user_name, amount, status, converted_at, created_at
- Índices iniciais nas colunas mais consultadas

#### `002_add_instagram_fields.sql`
Adiciona suporte a OAuth do Instagram/Facebook na tabela `influencers`.
- Novas colunas: instagram_id, instagram_username, instagram_profile_picture, instagram_followers, facebook_page_id, instagram_connected_at, instagram_access_token
- Índices em instagram_id e instagram_username

#### `003_add_plan_tracking_fields.sql`
Adiciona rastreamento de planos de assinatura na tabela `conversions`.
- Novas colunas: plan_type, previous_plan, plan_upgraded_at, monthly_value
- Constraints: plan_type IN ('free', 'starter', 'pro')
- Índices para analytics por plano

#### `004_add_commission_fields.sql`
Adiciona cálculo de comissões na tabela `conversions`.
- Novas colunas: commission_rate, commission_amount, plan_monthly_value
- Constraint: commission_rate entre 0 e 100
- Backfill automático dos valores (starter=R$3,98, pro=R$9,98) nas conversões existentes

#### `005_add_chc_movements.sql`
Cria a tabela `chc_movements` para rastrear movimentações de CHC.
- Tabela completa com: id, influencer_id, user_id, movement_type, chc_amount, real_value, description, created_at
- Constraint: movement_type IN ('earned', 'spent', 'purchased', 'won', 'lost')
- Índices compostos para queries de dashboard

#### `006_add_retention_fields.sql`
Adiciona métricas de retenção na tabela `conversions`.
- Novas colunas: last_activity_at, is_active, days_since_signup, churn_date, retention_7d, retention_30d, retention_60d
- Backfill automático com base na data de conversão

---

## 10. Dados de Teste

### Como inserir dados de teste

```bash
cd backend
npm run seed
```

### Influenciador de teste

| Campo | Valor |
|---|---|
| Nome | Afiliado Teste |
| Email | `teste@chicoai.com` |
| Senha | `123456` |
| Código de referência | `CHICO_TESTE001` |
| Link de referência | `https://www.chicoia.com.br/ref/CHICO_TESTE001` |

> A senha é armazenada como hash bcrypt com 12 rounds: `$2b$12$...`

### Conversões geradas

O seed cria **25 conversões aleatórias** com as seguintes características:
- Distribuição aleatória entre `paid` e `pending`
- Planos: `starter` (R$ 97,00) ou `pro` (R$ 197,00)
- Datas: distribuídas nos últimos 60 dias
- ~20% das conversões pro têm `previous_plan = 'starter'` (upgrades)
- Nomes dos usuários: João S., Maria L., Carlos M., Ana P., Pedro R., Lucia F., Roberto G., Fernanda A.

> **Nota:** Os valores R$ 97,00 e R$ 197,00 são valores de demonstração. Os planos reais da ChicoIA são R$ 19,90 (starter) e R$ 49,90 (pro).

---

## 11. Endpoints da API e Tabelas Utilizadas

| Método | Endpoint | Tabelas | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/login` | `influencers` | Login com email/senha |
| `POST` | `/api/auth/register` | `influencers` | Cadastro de novo afiliado |
| `GET` | `/api/auth/google/callback` | `influencers` | OAuth Google |
| `GET` | `/api/dashboard/metrics` | `conversions` | Métricas gerais do afiliado |
| `GET` | `/api/dashboard/conversions` | `conversions` | Lista paginada de conversões |
| `GET` | `/api/referral/code` | `influencers` | Retorna código de referência |
| `POST` | `/api/referral/generate` | `influencers` | Gera novo código |
| `GET` | `/api/referral/track/:code` | `influencers`, `conversions` | Rastreia clique no link |
| `GET` | `/api/analytics/conversions-by-plan` | `conversions` | Breakdown por plano |
| `GET` | `/api/analytics/commission/breakdown` | `conversions` | Detalhamento de comissões |
| `GET` | `/api/analytics/plan-upgrades` | `conversions` | Lista de upgrades |
| `GET` | `/api/analytics/plan-distribution` | `conversions` | Distribuição % por plano |
| `GET` | `/api/chc/total-moved` | `chc_movements` | Total de CHC movimentado |
| `GET` | `/api/chc/average-per-user` | `chc_movements` | Média de CHC por usuário |
| `GET` | `/api/chc/breakdown` | `chc_movements` | Breakdown completo de CHC |
| `GET` | `/api/retention/overview` | `conversions` | Visão geral de retenção |

Todos os endpoints (exceto auth e track) exigem header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 12. Variáveis de Ambiente

Arquivo: `backend/.env`

```env
# ─── Servidor ────────────────────────────────────────────────
PORT=3001
NODE_ENV=development

# ─── Banco de Dados (Supabase Session Pooler) ─────────────────
DATABASE_URL=postgresql://postgres.PROJECT_REF:SENHA@aws-0-us-west-2.pooler.supabase.com:5432/postgres
DB_HOST=db.PROJECT_REF.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=SENHA
DB_SSL=true

# ─── JWT ──────────────────────────────────────────────────────
JWT_SECRET=chave_secreta_longa_e_aleatoria
JWT_EXPIRES_IN=7d

# ─── Google OAuth ─────────────────────────────────────────────
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# ─── Facebook/Instagram OAuth ─────────────────────────────────
FACEBOOK_APP_ID=seu_facebook_app_id
FACEBOOK_APP_SECRET=seu_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3001/api/auth/facebook/callback

# ─── Session ──────────────────────────────────────────────────
SESSION_SECRET=chave_de_sessao_aleatoria

# ─── URLs ─────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173
BASE_URL=https://www.chicoia.com.br
```

---

## 13. Backup e Manutenção

### Backup via Supabase

O Supabase realiza backups automáticos diários. Para exportar manualmente:

```bash
# Exportar banco completo
pg_dump "postgresql://postgres.PROJECT_REF:SENHA@aws-0-us-west-2.pooler.supabase.com:5432/postgres" \
  --no-password \
  --format=custom \
  --file=backup_$(date +%Y%m%d).dump

# Restaurar backup
pg_restore \
  --dbname="postgresql://postgres.PROJECT_REF:SENHA@host:5432/postgres" \
  backup_20260226.dump
```

### Executar migrações

```bash
cd backend
npm run migrate
# Executa: 001 → 002 → 003 → 004 → 005 → 006
```

> As migrações usam `CREATE TABLE IF NOT EXISTS` e `ADD COLUMN IF NOT EXISTS`, portanto são idempotentes (seguras para re-executar).

### Inserir dados de teste

```bash
cd backend
npm run seed
# Cria afiliado de teste + 25 conversões
```

### Testar conexão

```bash
cd backend
node test-db.js
```

### Iniciar servidor local

```bash
cd backend
npm run dev    # nodemon (auto-reload)
npm start      # produção
```

---

## 14. Guia de Integração

### Para o time ChicoIA (backend principal)

Quando um usuário assinar um plano via link de afiliado:

**1. Identificar o afiliado**
```sql
SELECT id, name, referral_code
FROM influencers
WHERE referral_code = $1;  -- código extraído da URL
```

**2. Registrar a conversão**
```sql
INSERT INTO conversions (
  influencer_id, user_id, user_name,
  amount, status, plan_type, monthly_value,
  commission_rate, commission_amount, plan_monthly_value,
  converted_at
) VALUES (
  $1,        -- influencer_id
  $2,        -- user_id (da plataforma ChicoIA)
  $3,        -- user_name
  19.90,     -- amount pago
  'pending', -- status inicial
  'starter', -- plan_type
  19.90,     -- monthly_value
  20.00,     -- commission_rate (20%)
  0.00,      -- commission_amount (0 até confirmar pagamento)
  19.90,     -- plan_monthly_value
  NOW()
);
```

**3. Confirmar pagamento**
```sql
UPDATE conversions
SET
  status = 'paid',
  commission_amount = CASE
    WHEN plan_type = 'starter' THEN 3.98
    WHEN plan_type = 'pro'     THEN 9.98
    ELSE 0.00
  END
WHERE id = $1;
```

**4. Registrar atividade CHC**
```sql
INSERT INTO chc_movements (
  influencer_id, user_id, movement_type,
  chc_amount, real_value, description
) VALUES (
  $1,        -- influencer_id
  $2,        -- user_id
  'earned',  -- tipo
  5000,      -- 5000 CHC
  5.00,      -- R$ 5,00 (5000/1000)
  'Completou tutorial inicial'
);
```

**5. Atualizar retenção**
```sql
UPDATE conversions
SET
  last_activity_at = NOW(),
  is_active = true,
  retention_7d  = (NOW() - converted_at < INTERVAL '7 days'  OR retention_7d),
  retention_30d = (NOW() - converted_at < INTERVAL '30 days' OR retention_30d),
  retention_60d = (NOW() - converted_at < INTERVAL '60 days' OR retention_60d)
WHERE influencer_id = $1 AND user_id = $2;
```

### Constraints importantes a respeitar

- `plan_type` deve ser exatamente `'free'`, `'starter'` ou `'pro'`
- `movement_type` deve ser exatamente `'earned'`, `'spent'`, `'purchased'`, `'won'` ou `'lost'`
- `commission_rate` deve estar entre 0 e 100
- `real_value` em `chc_movements` deve ser sempre `chc_amount / 1000.0`
- Não deletar `influencers` diretamente — usar desativação lógica

---

## 15. Performance e Índices

### Índices existentes

Todos os índices já criados pelas migrações cobrem os casos de uso mais comuns:

```sql
-- Verificar todos os índices existentes
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Queries mais custosas (monitorar)

1. **Cálculo de retenção** — agrega muitas linhas, usar com `LIMIT` e filtro por `influencer_id`
2. **CHC breakdown com trend** — GROUP BY por data pode ser lento sem índice em `created_at`
3. **Distribuição por plano** — janela de 30 dias é a mais comum, índice `idx_conversions_converted_at` cobre

### Índices recomendados para escala (quando necessário)

```sql
-- Para relatórios mensais frequentes
CREATE INDEX idx_conversions_month
ON conversions (influencer_id, DATE_TRUNC('month', converted_at));

-- Para busca de usuários churned
CREATE INDEX idx_conversions_churn
ON conversions (influencer_id, is_active, churn_date)
WHERE is_active = false;

-- Para relatórios de CHC por tipo
CREATE INDEX idx_chc_type_influencer
ON chc_movements (influencer_id, movement_type, created_at);
```

---

## 16. Segurança

### Senhas

- Algoritmo: **bcrypt** com 12 rounds de salt
- Nunca armazenar senha em texto plano
- Nunca retornar `password_hash` em respostas da API

```javascript
// Correto: hash ao salvar
const hash = await bcrypt.hash(password, 12);

// Correto: verificar ao logar
const valid = await bcrypt.compare(password, hash);
```

### Tokens JWT

- Expiração: 7 dias (`JWT_EXPIRES_IN=7d`)
- Armazenado no frontend em `localStorage` com chave `chicoai_token`
- Todo endpoint protegido valida via `Authorization: Bearer <token>`

### Dados sensíveis

| Campo | Cuidado |
|---|---|
| `password_hash` | Nunca expor na API |
| `instagram_access_token` | Token OAuth — não logar, não expor |
| `DATABASE_URL` | Nunca commitar no git |
| `JWT_SECRET` | Nunca commitar no git |

### Injeção SQL

O projeto usa **queries parametrizadas** via `pg` pool:
```javascript
// Correto (parametrizado)
pool.query('SELECT * FROM influencers WHERE email = $1', [email]);

// NUNCA fazer (vulnerável a SQL injection)
pool.query(`SELECT * FROM influencers WHERE email = '${email}'`);
```

---

*Documentação gerada em 2026-02-26. Para dúvidas, contate o time ChicoIA.*
