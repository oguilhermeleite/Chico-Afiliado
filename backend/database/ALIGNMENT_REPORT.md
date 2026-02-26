# Alignment Report: Affiliate DB vs Main ChicoIA Backend

> **Gerado em:** 2026-02-26
> **Analisado por:** Exploração completa do repositório `Chico-Back`
> **Path do backend principal:** `C:\Users\Guilherme\Downloads\Chico\Chico-Back\`

---

## Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Padrões Encontrados no Backend Principal](#2-padrões-encontrados-no-backend-principal)
3. [Comparação Detalhada](#3-comparação-detalhada)
4. [Problemas Críticos de Integração](#4-problemas-críticos-de-integração)
5. [Mudanças Necessárias](#5-mudanças-necessárias)
6. [O Que Já Está Alinhado](#6-o-que-já-está-alinhado)
7. [Checklist de Integração](#7-checklist-de-integração)
8. [Recomendações](#8-recomendações)

---

## 1. Stack Tecnológico

| Aspecto | Backend Principal (Chico-Back) | Affiliate Dashboard |
|---|---|---|
| **Linguagem** | Python 3.10+ | Node.js |
| **Framework** | FastAPI 0.115.0 | Express |
| **ORM** | SQLAlchemy 2.0 | `pg` raw pool |
| **DB Driver** | psycopg2-binary | pg |
| **Banco** | PostgreSQL + SQLite (dev) | PostgreSQL via Supabase |
| **Auth JWT** | python-jose (HS256) | jsonwebtoken (HS256) |
| **Senhas** | SHA256 pre-hash + bcrypt | bcrypt direto |
| **Validação** | Pydantic | Express middleware |
| **Migrations** | Scripts Python + SQL avulsos | SQL numerados |

> Os dois sistemas são independentes. A integração acontece via API, não via acesso direto ao mesmo banco.

---

## 2. Padrões Encontrados no Backend Principal

### 2.1 IDs

```python
# Backend principal usa INTEGER SERIAL — NÃO UUID
id = Column(Integer, primary_key=True, index=True)  # autoincrement

# Exceção: match/fixture IDs externos são VARCHAR
fixture_id = Column(String, primary_key=True)
```

### 2.2 Timestamps

```python
# Sempre UTC, tipo TIMESTAMP (sem timezone)
created_at = Column(DateTime, default=datetime.utcnow)
updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

SQL equivalente:
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 2.3 Nomenclatura de Tabelas e Colunas

```
Tabelas:   snake_case, minúsculas
           users, predictions, pool_members, betting_tickets, user_actions

Colunas:   snake_case, minúsculas
           user_id, owner_id, is_active, is_verified, subscription_status

Booleans:  prefixo is_   →  is_active, is_verified, is_private, is_calculated
Status:    sufixo _status → subscription_status, bet_status
```

### 2.4 Chaves Estrangeiras

```sql
-- Padrão: {entidade}_id INTEGER
FOREIGN KEY (user_id) REFERENCES users(id)
FOREIGN KEY (owner_id) REFERENCES users(id)
FOREIGN KEY (pool_id) REFERENCES pools(id)
```

### 2.5 Nomenclatura de Índices

```sql
-- Padrão: ix_{tabela}_{coluna}
CREATE INDEX IF NOT EXISTS ix_user_actions_user_id ON user_actions (user_id);
CREATE INDEX IF NOT EXISTS ix_user_actions_action_type ON user_actions (action_type);
CREATE INDEX IF NOT EXISTS ix_predictions_user_id ON predictions (user_id);
```

### 2.6 Migrações

```
# Backend principal NÃO usa numeração sequencial
# Cada migration é independente e descritiva

migrate_add_avatar_columns.py        ← Python SQLAlchemy
migrate_add_reset_password_columns.py
migrate_add_subscription_columns.py
add_credits_column.sql               ← SQL avulso
create_user_actions_table.sql
migration_sync.sql                   ← Schema completo para sync
```

Todas as migrações são idempotentes (`IF NOT EXISTS`, `IF COLUMN EXISTS`).

### 2.7 Planos de Assinatura

```python
PLANS = {
    "free":  {"limit": 1000, "price": 0},
    "start": {"limit": 40,   "price": 19.90},   # ← "start", não "starter"
    "pro":   {"limit": 80,   "price": 29.90},   # ← R$ 29,90, não R$ 49,90
    "goat":  {"limit": 200,  "price": 49.90},   # ← plano extra, não existe no affiliate
}
```

### 2.8 Tabela `users` (referência principal)

```sql
-- Colunas relevantes para integração com affiliate
id                     INTEGER PRIMARY KEY  -- não UUID!
email                  VARCHAR UNIQUE NOT NULL
username               VARCHAR UNIQUE NOT NULL
subscription_plan      VARCHAR DEFAULT 'free'   -- 'free', 'start', 'pro', 'goat'
subscription_status    VARCHAR DEFAULT 'active'  -- 'active', 'canceled', 'expired'
credits                FLOAT DEFAULT 1000.0     -- CHC credits
is_active              BOOLEAN DEFAULT TRUE
is_verified            BOOLEAN DEFAULT FALSE
created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 2.9 Segurança de Senhas

```python
# Backend principal: dois estágios
def hash_password(password: str) -> str:
    pre_hashed = hashlib.sha256(password.encode()).digest()  # estágio 1
    b64_hash = base64.b64encode(pre_hashed).decode()
    return pwd_context.hash(b64_hash)  # estágio 2: bcrypt

# Campo na tabela: hashed_password (não password_hash)
```

### 2.10 JWT

```python
# Backend principal
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas
ALGORITHM = "HS256"
```

### 2.11 Formato de Resposta da API

```python
# Sucesso: retorna objeto Pydantic diretamente
return UserResponse(id=user.id, email=user.email, ...)

# Erro: raise HTTPException ou CustomError
raise CustomError(status_code=400, message="error_message")
# Resposta: {"message": "error_message"}
```

### 2.12 Arquitetura em Camadas

```
routes/      → FastAPI routers (HTTP layer)
services/    → Lógica de negócio
repositories/→ Acesso ao banco
models/      → SQLAlchemy ORM
```

---

## 3. Comparação Detalhada

### 3.1 Tipo de ID

| | Backend Principal | Affiliate Dashboard | Compatível? |
|---|---|---|---|
| **Tipo** | `INTEGER SERIAL` | `UUID` | ❌ **Incompatível** |
| **Geração** | Auto-increment DB | `uuid_generate_v4()` | ❌ |
| **Exemplo** | `1`, `42`, `1337` | `29a8bf8d-a2a5-...` | ❌ |

### 3.2 Timestamps

| | Backend Principal | Affiliate Dashboard | Compatível? |
|---|---|---|---|
| **Tipo SQL** | `TIMESTAMP` | `TIMESTAMP WITH TIME ZONE` | ⚠️ Parcial |
| **Referência** | UTC implícito | UTC explícito | ✅ Funcional |
| **updated_at** | `onupdate=utcnow` | `DEFAULT NOW()` (sem trigger) | ⚠️ Falta trigger |

### 3.3 Nomenclatura de Índices

| | Backend Principal | Affiliate Dashboard | Compatível? |
|---|---|---|---|
| **Prefixo** | `ix_` | `idx_` | ⚠️ Diferente, mas não afeta integração |
| **Exemplo** | `ix_user_actions_user_id` | `idx_conversions_influencer` | ⚠️ |

### 3.4 Planos

| | Backend Principal | Affiliate Dashboard | Compatível? |
|---|---|---|---|
| **Free** | `'free'` | `'free'` | ✅ |
| **Starter** | `'start'` | `'starter'` | ❌ **Incompatível** |
| **Pro** | `'pro'` | `'pro'` | ✅ |
| **Goat** | `'goat'` | não existe | ❌ **Falta** |
| **Preço Pro** | R$ 29,90 | R$ 49,90 | ❌ **Valor errado** |
| **Preço Starter** | R$ 19,90 | R$ 19,90 | ✅ |

### 3.5 Campo de senha

| | Backend Principal | Affiliate Dashboard | Compatível? |
|---|---|---|---|
| **Nome coluna** | `hashed_password` | `password_hash` | ⚠️ Nomes diferentes |
| **Algoritmo** | SHA256 + bcrypt | bcrypt direto | ❌ Hashes incompatíveis |

> Isso impede login cruzado: usuário que criou conta no main backend não consegue logar no affiliate com a mesma senha e vice-versa.

### 3.6 JWT

| | Backend Principal | Affiliate Dashboard | Compatível? |
|---|---|---|---|
| **Expiração** | 24 horas | 7 dias | ⚠️ Diferente |
| **Algoritmo** | HS256 | HS256 | ✅ |
| **Secret** | Variável própria | Variável própria | ✅ Isolado (correto) |

### 3.7 Formato de resposta da API

| | Backend Principal | Affiliate Dashboard | Compatível? |
|---|---|---|---|
| **Sucesso** | Objeto direto (`{id: 1, name: ...}`) | Objeto direto | ✅ |
| **Erro** | `{"message": "texto"}` | `{"error": "texto"}` | ⚠️ Chave diferente |

---

## 4. Problemas Críticos de Integração

> Estes são os problemas que **vão quebrar** a integração se não forem resolvidos.

### CRÍTICO 1 — `user_id` é INTEGER no main, UUID no affiliate

O campo `conversions.user_id` e `chc_movements.user_id` armazenam o ID do usuário da plataforma ChicoIA principal.

```sql
-- O que temos (affiliate):
user_id UUID NOT NULL

-- O que o backend principal envia:
user_id = 42  -- INTEGER
```

Quando o backend principal tentar registrar uma conversão enviando `user_id=42`, vai falhar porque o affiliate espera UUID.

**Impacto:** Quebra total na criação de conversões via integração API.

### CRÍTICO 2 — Nome do plano `'starter'` vs `'start'`

```sql
-- Constraint atual no affiliate:
CHECK (plan_type IN ('free', 'starter', 'pro'))

-- O backend principal usa:
subscription_plan IN ('free', 'start', 'pro', 'goat')
```

Se o backend principal enviar `plan_type = 'start'`, a constraint do affiliate rejeita o INSERT.
Se o backend principal enviar `plan_type = 'goat'`, também rejeita.

**Impacto:** Conversões de usuários com plano `start` ou `goat` não podem ser registradas.

### CRÍTICO 3 — Preço do plano Pro incorreto

```python
# Backend principal:
"pro": {"price": 29.90}

# Affiliate (seed e documentação):
plan_monthly_value = 49.90  # para pro
```

**Impacto:** Cálculo de comissão errado. Comissão do Pro deveria ser R$ 5,98 (20% de R$ 29,90), não R$ 9,98.

---

## 5. Mudanças Necessárias

### MUDANÇA 1 — Corrigir tipo do `user_id` (CRÍTICO)

**Situação atual:**
```sql
user_id UUID NOT NULL  -- em conversions e chc_movements
```

**Deve ser:**
```sql
user_id INTEGER NOT NULL  -- para aceitar IDs do backend principal
```

**Migration para aplicar:**
```sql
-- ATENÇÃO: fazer backup antes. Esta mudança altera dados existentes.

-- 1. Remover dados de teste (UUIDs não são compatíveis com INTEGER)
TRUNCATE TABLE chc_movements;
TRUNCATE TABLE conversions;

-- 2. Alterar coluna em conversions
ALTER TABLE conversions ALTER COLUMN user_id TYPE INTEGER
USING NULL;  -- zera dados existentes

-- 3. Alterar coluna em chc_movements
ALTER TABLE chc_movements ALTER COLUMN user_id TYPE INTEGER
USING NULL;

-- OU: manter como VARCHAR para aceitar qualquer formato:
ALTER TABLE conversions ALTER COLUMN user_id TYPE VARCHAR(255)
USING user_id::TEXT;
```

> **Recomendação:** Usar `VARCHAR(255)` em vez de `INTEGER` para máxima flexibilidade — aceita IDs inteiros como string e futuros UUIDs sem nova migration.

### MUDANÇA 2 — Corrigir nomes e valores dos planos (CRÍTICO)

**Situação atual:**
```sql
CHECK (plan_type IN ('free', 'starter', 'pro'))
```

**Deve ser:**
```sql
CHECK (plan_type IN ('free', 'start', 'pro', 'goat'))
```

**Migration:**
```sql
-- Remover constraint antiga
ALTER TABLE conversions DROP CONSTRAINT IF EXISTS check_plan_type;
ALTER TABLE conversions DROP CONSTRAINT IF EXISTS check_previous_plan;

-- Renomear 'starter' para 'start' nos dados existentes
UPDATE conversions SET plan_type = 'start' WHERE plan_type = 'starter';
UPDATE conversions SET previous_plan = 'start' WHERE previous_plan = 'starter';

-- Adicionar nova constraint
ALTER TABLE conversions
ADD CONSTRAINT check_plan_type
CHECK (plan_type IN ('free', 'start', 'pro', 'goat'));

ALTER TABLE conversions
ADD CONSTRAINT check_previous_plan
CHECK (previous_plan IS NULL OR previous_plan IN ('free', 'start', 'pro', 'goat'));
```

### MUDANÇA 3 — Corrigir valores de comissão (CRÍTICO)

**Valores corretos:**
```
free  → R$ 0,00/mês  → comissão R$ 0,00
start → R$ 19,90/mês → comissão R$ 3,98  (20%)
pro   → R$ 29,90/mês → comissão R$ 5,98  (20%)  ← WAS R$ 9,98
goat  → R$ 49,90/mês → comissão R$ 9,98  (20%)  ← plano novo
```

**Migration:**
```sql
-- Corrigir valores do plano pro
UPDATE conversions
SET
  commission_amount = CASE
    WHEN status = 'paid' THEN 5.98
    ELSE 0.00
  END,
  plan_monthly_value = 29.90
WHERE plan_type = 'pro';

-- Corrigir plan_type 'starter' → 'start' (se ainda existir)
UPDATE conversions SET plan_type = 'start' WHERE plan_type = 'starter';

-- Atualizar valores para plano start
UPDATE conversions
SET
  commission_amount = CASE
    WHEN status = 'paid' THEN 3.98
    ELSE 0.00
  END,
  plan_monthly_value = 19.90
WHERE plan_type = 'start';
```

### MUDANÇA 4 — Nomenclatura de índices (Cosmética)

Não afeta integração, mas melhora consistência para o time:

```sql
-- Renomear prefixo de idx_ para ix_
-- Só necessário se for unificar os padrões de documentação

-- Exemplo:
DROP INDEX IF EXISTS idx_conversions_influencer;
CREATE INDEX IF NOT EXISTS ix_conversions_influencer_id ON conversions(influencer_id);
```

### MUDANÇA 5 — Expiração do JWT (Recomendado)

```javascript
// Atual (affiliate):
JWT_EXPIRES_IN=7d

// Backend principal usa 24h — alinhar para consistência:
JWT_EXPIRES_IN=24h
```

### MUDANÇA 6 — Chave de erro na API (Cosmética)

```javascript
// Atual (affiliate):
res.status(400).json({ error: "mensagem" })

// Backend principal usa:
res.status(400).json({ message: "mensagem" })
```

---

## 6. O Que Já Está Alinhado

| Aspecto | Status | Detalhe |
|---|---|---|
| Banco PostgreSQL | ✅ | Ambos usam PostgreSQL |
| Snake_case em tabelas/colunas | ✅ | Mesma convenção |
| Algoritmo JWT HS256 | ✅ | Compatível |
| bcrypt para senhas | ✅ | Mesmo algoritmo base |
| Campos `created_at` / `updated_at` | ✅ | Mesma semântica |
| Booleanos `is_` prefixo | ✅ | `is_active`, `is_verified` |
| Índices em FKs | ✅ | Ambos indexam chaves estrangeiras |
| Migrações idempotentes | ✅ | `IF NOT EXISTS` em ambos |
| `CURRENT_TIMESTAMP` / `NOW()` padrão | ✅ | Equivalentes |
| Soft delete não usado | ✅ | Ambos usam hard delete |
| Plano `free` e `pro` | ✅ | Existem nos dois |
| Comissão do plano `start` (R$ 3,98) | ✅ | Correto |

---

## 7. Checklist de Integração

### Banco de Dados
- [ ] **CRÍTICO:** Alterar `user_id` de `UUID` para `VARCHAR(255)` em `conversions`
- [ ] **CRÍTICO:** Alterar `user_id` de `UUID` para `VARCHAR(255)` em `chc_movements`
- [ ] **CRÍTICO:** Renomear plano `'starter'` → `'start'` em todos os dados e constraints
- [ ] **CRÍTICO:** Adicionar plano `'goat'` nas constraints
- [ ] **CRÍTICO:** Corrigir `plan_monthly_value` do Pro: R$ 49,90 → R$ 29,90
- [ ] **CRÍTICO:** Corrigir `commission_amount` do Pro: R$ 9,98 → R$ 5,98
- [ ] Adicionar plano `goat`: `plan_monthly_value = 49.90`, `commission_amount = 9.98`

### API
- [ ] Padronizar resposta de erro: `{ error }` → `{ message }`
- [ ] Alinhar expiração do JWT: `7d` → `24h` (ou alinhar com o time)
- [ ] Documentar endpoints que o backend principal deve chamar
- [ ] Criar endpoint `POST /api/conversions/webhook` para receber conversões do backend principal

### Integração
- [ ] Definir com Felipe qual sistema é a fonte de verdade dos planos
- [ ] Definir como o backend principal notifica o affiliate de novas conversões
- [ ] Definir como o affiliate recebe atualizações de atividade CHC
- [ ] Documentar autenticação inter-serviços (API key? JWT compartilhado?)
- [ ] Testar fluxo completo: usuário assina plano → conversão registrada → comissão calculada

### Documentação
- [ ] Atualizar `DATABASE_DOCUMENTATION.md` com planos corretos
- [ ] Atualizar `QUICK_REFERENCE.md` com planos corretos
- [ ] Criar documento de contrato de API (quais endpoints o backend principal chama)

---

## 8. Recomendações

### 8.1 Sobre user_id

Use `VARCHAR(255)` em vez de `INTEGER` para `user_id`. O backend principal usa INTEGER hoje, mas isso pode mudar. VARCHAR aceita ambos sem nova migration.

### 8.2 Sobre planos

O backend principal tem 4 planos (`free`, `start`, `pro`, `goat`). O affiliate deve espelhar exatamente esses nomes. Sugere-se criar uma tabela de referência de planos:

```sql
CREATE TABLE IF NOT EXISTS plan_catalog (
  plan_type     VARCHAR(20) PRIMARY KEY,
  monthly_price DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  commission_amount DECIMAL(10,2) NOT NULL
);

INSERT INTO plan_catalog VALUES
  ('free',  0.00,  0.00, 0.00),
  ('start', 19.90, 20.00, 3.98),
  ('pro',   29.90, 20.00, 5.98),
  ('goat',  49.90, 20.00, 9.98)
ON CONFLICT DO NOTHING;
```

### 8.3 Sobre integração de sistemas

Os dois sistemas são em linguagens diferentes (Python/FastAPI vs Node/Express). A comunicação deve ser exclusivamente via **HTTP API** com uma API key de serviço compartilhada. Nunca compartilhar o mesmo banco ou JWT secret.

### 8.4 Webhook recomendado

O backend principal deveria chamar o affiliate via webhook quando:
1. Um usuário usa link de referência e assina → `POST /api/internal/conversion`
2. Um usuário muda de plano (upgrade/downgrade) → `POST /api/internal/plan-change`
3. Um usuário movimenta CHC → `POST /api/internal/chc-movement`
4. Um usuário cancela → `POST /api/internal/churn`

---

## Resumo Executivo

| Prioridade | Problema | Impacto se não corrigir |
|---|---|---|
| 🔴 CRÍTICO | `user_id` UUID vs INTEGER | Conversões não podem ser registradas |
| 🔴 CRÍTICO | Plano `starter` vs `start` | Conversões de usuários `start` são rejeitadas |
| 🔴 CRÍTICO | Plano `goat` não existe | Conversões de usuários `goat` são rejeitadas |
| 🔴 CRÍTICO | Preço Pro errado (R$49,90 vs R$29,90) | Comissão calculada errada |
| 🟡 IMPORTANTE | JWT expira em 7d vs 24h | Tokens do affiliate ficam válidos por mais tempo |
| 🟡 IMPORTANTE | Resposta de erro `error` vs `message` | Frontend do affiliate com mensagens de erro diferentes |
| 🟢 COSMÉTICO | Prefixo de índice `idx_` vs `ix_` | Nenhum — só afeta DBA |

*O backend principal está em Python/FastAPI. O affiliate está em Node/Express. Os sistemas são independentes e a integração deve ser feita via HTTP — não há conflito de runtime, apenas de contrato de dados.*
