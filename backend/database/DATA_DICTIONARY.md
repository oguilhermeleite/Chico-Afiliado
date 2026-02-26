# Data Dictionary — ChicoIA Affiliate System

> **Banco:** PostgreSQL 17.6 via Supabase
> **Schema:** `public`
> **Gerado em:** 2026-02-26 (verificado contra banco live)
> **Para:** Felipe e time de desenvolvimento

---

## Índice

1. [Tabela: influencers](#tabela-influencers)
2. [Tabela: conversions](#tabela-conversions)
3. [Tabela: chc_movements](#tabela-chc_movements)
4. [Tabela: plan_catalog](#tabela-plan_catalog)
5. [Relacionamentos](#relacionamentos)
6. [Índices](#índices)
7. [Enumerações e Regras de Negócio](#enumerações-e-regras-de-negócio)

---

## Tabela: influencers

**Propósito:** Cadastro e autenticação dos afiliados/influenciadores. Tabela central do sistema — todos os outros dados pertencem a um influencer.

**Chave Primária:** `id` (UUID)
**Chaves Estrangeiras:** Nenhuma (tabela raiz)
**Registros de referência:** `conversions.influencer_id`, `chc_movements.influencer_id`

| Coluna | Tipo | Nulo | Padrão | Descrição | Exemplo | Restrições |
|---|---|---|---|---|---|---|
| `id` | `UUID` | NÃO | `uuid_generate_v4()` | Identificador único do afiliado | `29a8bf8d-a2a5-45d6-bade-7a3e7fd269df` | PRIMARY KEY |
| `name` | `VARCHAR(255)` | NÃO | — | Nome completo do afiliado | `João Silva` | NOT NULL |
| `email` | `VARCHAR(255)` | NÃO | — | Email de login, único no sistema | `joao@email.com` | NOT NULL, UNIQUE |
| `password_hash` | `VARCHAR(255)` | SIM | — | Hash bcrypt da senha (12 rounds). NULL se login apenas via OAuth | `$2b$12$abc...` | — |
| `google_id` | `VARCHAR(255)` | SIM | — | ID retornado pelo Google OAuth2 | `1087432156789` | — |
| `referral_code` | `VARCHAR(50)` | NÃO | — | Código único para link de referência | `CHICO_AB3K9X2PQ` | NOT NULL, UNIQUE |
| `instagram_id` | `VARCHAR(255)` | SIM | — | ID da conta Instagram Business conectada | `17841400008460216` | UNIQUE |
| `instagram_username` | `VARCHAR(255)` | SIM | — | Username do Instagram (sem @) | `joaosilva` | — |
| `instagram_profile_picture` | `TEXT` | SIM | — | URL da foto de perfil do Instagram | `https://cdn.instagram.com/...` | — |
| `instagram_followers` | `INTEGER` | SIM | `0` | Total de seguidores no Instagram | `15420` | DEFAULT 0 |
| `facebook_page_id` | `VARCHAR(255)` | SIM | — | ID da página Facebook vinculada ao Instagram | `123456789012345` | — |
| `instagram_connected_at` | `TIMESTAMPTZ` | SIM | — | Data/hora em que o Instagram foi conectado | `2026-02-20T14:30:00Z` | — |
| `instagram_access_token` | `TEXT` | SIM | — | Token OAuth do Instagram. **SENSÍVEL** — nunca expor na API | `EAABwzLix...` | CONFIDENCIAL |
| `created_at` | `TIMESTAMPTZ` | SIM | `now()` | Data de criação do cadastro | `2026-02-26T02:51:44Z` | DEFAULT now() |
| `updated_at` | `TIMESTAMPTZ` | SIM | `now()` | Data da última atualização do cadastro | `2026-02-26T10:00:00Z` | DEFAULT now() |

---

## Tabela: conversions

**Propósito:** Registra cada usuário que assinou um plano ChicoIA através do link de referência de um afiliado. É a tabela principal para cálculo de comissões, métricas do dashboard e acompanhamento de retenção.

**Chave Primária:** `id` (UUID)
**Chaves Estrangeiras:**
- `influencer_id` → `influencers.id` (ON DELETE CASCADE)
- `plan_type` → `plan_catalog.plan_type` *(lógica de negócio, não FK declarada)*

**Nota:** `user_id` referencia o usuário na plataforma ChicoIA principal (sistema externo). Não há FK declarada — ver [Guia de Integração](USERS_INTEGRATION_GUIDE.md).

| Coluna | Tipo | Nulo | Padrão | Descrição | Exemplo | Restrições |
|---|---|---|---|---|---|---|
| `id` | `UUID` | NÃO | `uuid_generate_v4()` | Identificador único da conversão | `f89a0794-bf9e-43d8-956f-1ca35efe32a3` | PRIMARY KEY |
| `influencer_id` | `UUID` | SIM | — | Afiliado que gerou esta conversão | `29a8bf8d-...` | FK → influencers.id, CASCADE |
| `user_id` | `VARCHAR(255)` | SIM | — | ID do usuário na plataforma ChicoIA principal. Aceita inteiro (`"42"`) ou UUID string | `42` ou `abc-123-...` | — |
| `user_name` | `VARCHAR(255)` | SIM | — | Nome do usuário convertido (snapshot no momento da conversão) | `Maria L.` | — |
| `amount` | `NUMERIC(10,2)` | NÃO | `0` | Valor pago pelo usuário no momento da conversão | `29.90` | NOT NULL, DEFAULT 0 |
| `status` | `VARCHAR(50)` | NÃO | `'pending'` | Status do pagamento. Ver enumeração abaixo | `paid` | NOT NULL, DEFAULT 'pending' |
| `plan_type` | `VARCHAR(20)` | SIM | `'starter'`¹ | Plano assinado pelo usuário. Ver enumeração abaixo | `pro` | CHECK IN ('free','start','pro','goat') |
| `previous_plan` | `VARCHAR(20)` | SIM | — | Plano anterior, preenchido somente em upgrades | `start` | CHECK IN (NULL,'free','start','pro','goat') |
| `plan_upgraded_at` | `TIMESTAMPTZ` | SIM | — | Data/hora do upgrade de plano | `2026-02-15T10:00:00Z` | — |
| `monthly_value` | `NUMERIC(10,2)` | SIM | — | Valor mensal pago pelo usuário (snapshot) | `29.90` | — |
| `commission_rate` | `NUMERIC(5,2)` | SIM | `0.00` | Percentual de comissão aplicado | `20.00` | CHECK 0 ≤ rate ≤ 100 |
| `commission_amount` | `NUMERIC(10,2)` | SIM | `0.00` | Valor em R$ da comissão. Zero enquanto `status='pending'` | `5.98` | DEFAULT 0.00 |
| `plan_monthly_value` | `NUMERIC(10,2)` | SIM | — | Valor oficial do plano no catálogo (referência no momento da conversão) | `29.90` | — |
| `last_activity_at` | `TIMESTAMP` | SIM | — | Última vez que o usuário teve atividade registrada na plataforma | `2026-02-25T18:45:00` | — |
| `is_active` | `BOOLEAN` | SIM | `true` | Se o usuário está ativo (não cancelou) | `true` | DEFAULT true |
| `days_since_signup` | `INTEGER` | SIM | `0` | Dias desde a conversão até hoje (calculado no backfill, deve ser atualizado periodicamente) | `30` | DEFAULT 0 |
| `churn_date` | `TIMESTAMP` | SIM | — | Data em que o usuário cancelou a assinatura | `2026-03-15T00:00:00` | — |
| `retention_7d` | `BOOLEAN` | SIM | `true` | Usuário permaneceu ativo nos primeiros 7 dias | `true` | DEFAULT true |
| `retention_30d` | `BOOLEAN` | SIM | `true` | Usuário permaneceu ativo nos primeiros 30 dias | `true` | DEFAULT true |
| `retention_60d` | `BOOLEAN` | SIM | `true` | Usuário permaneceu ativo nos primeiros 60 dias | `false` | DEFAULT true |
| `converted_at` | `TIMESTAMPTZ` | SIM | `now()` | Data/hora da conversão (quando o usuário assinou) | `2026-02-14T09:00:00Z` | DEFAULT now() |
| `created_at` | `TIMESTAMPTZ` | SIM | `now()` | Data/hora de criação do registro no banco | `2026-02-14T09:00:05Z` | DEFAULT now() |

> ¹ O default `'starter'` é um artefato da migration 003. A constraint `CHECK` garante que apenas valores válidos (`'free','start','pro','goat'`) sejam inseridos. Novos registros devem sempre especificar `plan_type` explicitamente.

---

## Tabela: chc_movements

**Propósito:** Registra cada movimentação de CHC (Chico Coin) realizada por usuários que foram referenciados por um afiliado. Permite ao afiliado monitorar o engajamento e qualidade dos seus indicados.

**Chave Primária:** `id` (UUID)
**Chaves Estrangeiras:**
- `influencer_id` → `influencers.id` (ON DELETE NO ACTION)

**Taxa de câmbio:** `1.000 CHC = R$ 1,00`

| Coluna | Tipo | Nulo | Padrão | Descrição | Exemplo | Restrições |
|---|---|---|---|---|---|---|
| `id` | `UUID` | NÃO | `gen_random_uuid()` | Identificador único do movimento | `a1b2c3d4-...` | PRIMARY KEY |
| `influencer_id` | `UUID` | SIM | — | Afiliado ao qual este usuário pertence | `29a8bf8d-...` | FK → influencers.id, NO ACTION |
| `user_id` | `VARCHAR(255)` | NÃO | — | ID do usuário na plataforma ChicoIA que realizou o movimento | `42` | NOT NULL |
| `movement_type` | `VARCHAR(50)` | NÃO | — | Tipo do movimento. Ver enumeração abaixo | `earned` | NOT NULL, CHECK IN ('earned','spent','purchased','won','lost') |
| `chc_amount` | `INTEGER` | NÃO | — | Quantidade de CHC movimentada (sempre inteiro positivo) | `5000` | NOT NULL |
| `real_value` | `NUMERIC(10,2)` | NÃO | — | Equivalente em R$ = `chc_amount / 1000.0` | `5.00` | NOT NULL |
| `description` | `TEXT` | SIM | — | Descrição legível do motivo do movimento | `Completou tutorial inicial` | — |
| `created_at` | `TIMESTAMP` | SIM | `now()` | Data/hora do movimento | `2026-02-26T14:30:00` | DEFAULT now() |

---

## Tabela: plan_catalog

**Propósito:** Fonte única de verdade para preços e comissões de cada plano. Espelha os planos do backend principal ChicoIA. Deve ser atualizada sempre que os preços dos planos mudarem.

**Chave Primária:** `plan_type` (VARCHAR — chave natural)
**Chaves Estrangeiras:** Nenhuma

| Coluna | Tipo | Nulo | Padrão | Descrição | Exemplo | Restrições |
|---|---|---|---|---|---|---|
| `plan_type` | `VARCHAR(20)` | NÃO | — | Identificador do plano (igual ao usado em `conversions.plan_type`) | `pro` | PRIMARY KEY |
| `display_name` | `VARCHAR(50)` | NÃO | — | Nome amigável para exibição na UI | `Pro` | NOT NULL |
| `monthly_price` | `NUMERIC(10,2)` | NÃO | — | Preço mensal do plano em R$ | `29.90` | NOT NULL |
| `commission_rate` | `NUMERIC(5,2)` | NÃO | `20.00` | Taxa de comissão em % | `20.00` | NOT NULL, DEFAULT 20.00 |
| `commission_amount` | `NUMERIC(10,2)` | NÃO | — | Valor da comissão em R$ = `monthly_price * commission_rate / 100` | `5.98` | NOT NULL |
| `uploads_limit` | `INTEGER` | NÃO | `0` | Limite de uploads do plano (espelhado do main backend) | `80` | NOT NULL, DEFAULT 0 |
| `created_at` | `TIMESTAMP` | SIM | `now()` | Data de inserção do registro | `2026-02-26T02:00:00` | DEFAULT now() |

**Dados atuais:**

| plan_type | display_name | monthly_price | commission_rate | commission_amount | uploads_limit |
|---|---|---|---|---|---|
| `free` | Free | R$ 0,00 | 0% | R$ 0,00 | 1000 |
| `start` | Start | R$ 19,90 | 20% | R$ 3,98 | 40 |
| `pro` | Pro | R$ 29,90 | 20% | R$ 5,98 | 80 |
| `goat` | Goat | R$ 49,90 | 20% | R$ 9,98 | 200 |

---

## Relacionamentos

```
┌──────────────────────────────────────────────┐
│                  influencers                  │
│  PK: id (UUID)                               │
│  UK: email, referral_code, instagram_id      │
└────────────────┬─────────────────────────────┘
                 │ 1
                 │
        ┌────────┴────────┐
        │                 │
        │ many            │ many
        ▼                 ▼
┌───────────────┐   ┌─────────────────────┐
│  conversions  │   │    chc_movements     │
│  PK: id       │   │  PK: id              │
│  FK: influ.id │   │  FK: influ.id        │
│      CASCADE  │   │      NO ACTION       │
│  user_id ─────┼───┼─► (VARCHAR, sem FK)  │
│  plan_type ───┼─► │  user_id (VARCHAR)   │
└───────┬───────┘   └─────────────────────┘
        │ many
        │
        ▼ 1 (lógica de negócio)
┌──────────────────────┐
│     plan_catalog     │
│  PK: plan_type       │
│  (free/start/pro/    │
│   goat)              │
└──────────────────────┘

        ▲
        │ (sistema externo — SEM FK declarada)
        │
┌──────────────────────┐
│  ChicoIA Main        │
│  users table         │
│  PK: id (INTEGER)    │
│  user_id armazenado  │
│  como VARCHAR(255)   │
│  em conversions e    │
│  chc_movements       │
└──────────────────────┘
```

**Comportamento em DELETE:**

| Tabela origem | Tabela destino | Coluna FK | ON DELETE | Comportamento |
|---|---|---|---|---|
| `conversions` | `influencers` | `influencer_id` | CASCADE | Deletar influencer deleta todas as suas conversões |
| `chc_movements` | `influencers` | `influencer_id` | NO ACTION | Deletar influencer **falha** se tiver movimentos CHC |

> **Atenção:** O comportamento diferente entre `conversions` (CASCADE) e `chc_movements` (NO ACTION) é um inconsistência. Recomenda-se padronizar para CASCADE em ambas.

---

## Índices

### Tabela: influencers

| Índice | Coluna(s) | Tipo | Propósito |
|---|---|---|---|
| `influencers_pkey` | `id` | UNIQUE (automático) | PK lookup |
| `influencers_email_key` | `email` | UNIQUE | Login por email |
| `influencers_referral_code_key` | `referral_code` | UNIQUE | Busca por código de referência |
| `influencers_instagram_id_key` | `instagram_id` | UNIQUE | OAuth Instagram |
| `idx_influencers_email` | `email` | B-Tree | Login |
| `idx_influencers_referral_code` | `referral_code` | B-Tree | Rastreamento de link |
| `idx_instagram_id` | `instagram_id` | B-Tree | Auth Instagram |
| `idx_instagram_username` | `instagram_username` | B-Tree | Busca por @username |

### Tabela: conversions

| Índice | Coluna(s) | Tipo | Propósito |
|---|---|---|---|
| `conversions_pkey` | `id` | UNIQUE (automático) | PK lookup |
| `idx_conversions_influencer` | `influencer_id` | B-Tree | Dashboard: listar conversões do afiliado |
| `idx_conversions_status` | `status` | B-Tree | Filtrar por paid/pending |
| `idx_conversions_converted_at` | `converted_at` | B-Tree | Filtros por período |
| `idx_conversions_plan_type` | `plan_type` | B-Tree | Analytics por plano |
| `idx_conversions_plan_upgraded_at` | `plan_upgraded_at` | B-Tree | Histórico de upgrades |
| `idx_conversions_influencer_plan` | `(influencer_id, plan_type)` | B-Tree composto | Analytics combinado |
| `idx_conversions_commission` | `(influencer_id, status, commission_amount)` | B-Tree composto | Cálculo de comissões |
| `idx_conversions_activity` | `last_activity_at` | B-Tree | Retenção/atividade |
| `idx_conversions_active` | `is_active` | B-Tree | Filtro usuários ativos |
| `idx_conversions_ret` | `(influencer_id, retention_30d, retention_60d)` | B-Tree composto | Métricas de retenção |

### Tabela: chc_movements

| Índice | Coluna(s) | Tipo | Propósito |
|---|---|---|---|
| `chc_movements_pkey` | `id` | UNIQUE (automático) | PK lookup |
| `idx_chc_movements_influencer` | `influencer_id` | B-Tree | Movimentos do afiliado |
| `idx_chc_movements_date` | `created_at` | B-Tree | Filtro por período |
| `idx_chc_movements_influencer_date` | `(influencer_id, created_at DESC)` | B-Tree composto | Dashboard CHC |

---

## Enumerações e Regras de Negócio

### conversions.status

| Valor | Descrição | commission_amount |
|---|---|---|
| `pending` | Usuário cadastrado, pagamento não confirmado | `0.00` |
| `paid` | Pagamento confirmado, comissão gerada | Valor calculado |

> **Nota:** O valor `'cancelled'` não está na constraint atual. Para adicionar: `ALTER TABLE conversions DROP CONSTRAINT check_status; ALTER TABLE conversions ADD CONSTRAINT check_status CHECK (status IN ('pending','paid','cancelled'));`

### conversions.plan_type

| Valor | Preço/mês | Taxa | Comissão |
|---|---|---|---|
| `free` | R$ 0,00 | 0% | R$ 0,00 |
| `start` | R$ 19,90 | 20% | R$ 3,98 |
| `pro` | R$ 29,90 | 20% | R$ 5,98 |
| `goat` | R$ 49,90 | 20% | R$ 9,98 |

**Constraint ativa:** `CHECK (plan_type IN ('free', 'start', 'pro', 'goat'))`

### chc_movements.movement_type

| Valor | Descrição | Impacto no saldo |
|---|---|---|
| `earned` | Usuário recebeu CHC como recompensa | Positivo |
| `spent` | Usuário gastou CHC em features/produtos | Negativo |
| `purchased` | Usuário comprou CHC com dinheiro real | Positivo |
| `won` | Usuário ganhou CHC em sorteio/gamificação | Positivo |
| `lost` | CHC expirado ou penalidade | Negativo |

**Constraint ativa:** `CHECK (movement_type IN ('earned', 'spent', 'purchased', 'won', 'lost'))`

### Cálculo de Comissão

```
commission_amount = plan_monthly_value × (commission_rate ÷ 100)

Exemplos:
  start: 19.90 × (20 ÷ 100) = R$ 3,98
  pro:   29.90 × (20 ÷ 100) = R$ 5,98
  goat:  49.90 × (20 ÷ 100) = R$ 9,98

Regra: commission_amount = 0 quando status = 'pending'
       commission_amount = valor calculado quando status = 'paid'
```

### Conversão CHC → Real

```
real_value = chc_amount ÷ 1000

Exemplos:
  5.000 CHC = R$ 5,00
  15.000 CHC = R$ 15,00
  250 CHC = R$ 0,25
```

### Status de Atividade (calculado, não armazenado)

```
days_since_activity = hoje - last_activity_at

< 7 dias   → "Ativo"   🟢
7-30 dias  → "Inativo" 🟡
> 30 dias  → "Churned" 🔴
```

---

*Data Dictionary gerado em 2026-02-26 com dados verificados contra banco live (Supabase PostgreSQL 17.6).*
