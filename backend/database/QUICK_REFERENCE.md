# ChicoIA DB — Quick Reference

> Referência rápida para o time de desenvolvimento. Documentação completa em `DATABASE_DOCUMENTATION.md`.

---

## Conexão

```
Host:     aws-0-us-west-2.pooler.supabase.com
Porta:    5432  ← Session Pooler (IPv4)
Banco:    postgres
SSL:      obrigatório
```

```bash
# Testar conexão
cd backend && node test-db.js

# Rodar migrações
npm run migrate

# Inserir dados de teste
npm run seed
```

---

## Tabelas

| Tabela | Propósito |
|---|---|
| `influencers` | Afiliados cadastrados |
| `conversions` | Usuários convertidos por cada afiliado |
| `chc_movements` | Movimentações de CHC dos usuários referidos |

---

## Colunas-chave

### influencers
```
id              UUID      PK
email           TEXT      UNIQUE — login
referral_code   TEXT      UNIQUE — código do link
password_hash   TEXT      bcrypt 12 rounds
instagram_id    TEXT      OAuth Instagram
created_at      TIMESTAMPTZ
```

### conversions
```
id              UUID      PK
influencer_id   UUID      FK → influencers.id
user_id         UUID      usuário na ChicoIA
status          TEXT      'paid' | 'pending'
plan_type       TEXT      'free' | 'starter' | 'pro'
amount          DECIMAL   valor pago
commission_amount DECIMAL comissão gerada
previous_plan   TEXT      se houve upgrade
last_activity_at TIMESTAMP retenção
retention_7d/30d/60d BOOL  janelas de retenção
```

### chc_movements
```
id              UUID      PK
influencer_id   UUID      FK → influencers.id
user_id         UUID      usuário que movimentou
movement_type   TEXT      'earned'|'spent'|'purchased'|'won'|'lost'
chc_amount      INTEGER   quantidade de CHC
real_value      DECIMAL   chc_amount / 1000.0
```

---

## Regras de Negócio

```
1 CHC = R$ 0,001     →   1.000 CHC = R$ 1,00

Planos:
  free    → R$ 0,00/mês  → comissão R$ 0,00
  starter → R$ 19,90/mês → comissão R$ 3,98  (20%)
  pro     → R$ 49,90/mês → comissão R$ 9,98  (20%)

Status:
  pending → conversão registrada, aguardando pagamento
  paid    → pago, comissão gerada

Retenção:
  < 7 dias sem atividade  → Ativo   🟢
  7-30 dias sem atividade → Inativo 🟡
  > 30 dias sem atividade → Churned 🔴
```

---

## Queries Essenciais

```sql
-- Métricas do afiliado (últimos 30 dias)
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status='paid') AS paid,
  SUM(commission_amount) AS commission
FROM conversions
WHERE influencer_id = $1
  AND converted_at >= NOW() - INTERVAL '30 days';

-- Inserir conversão nova
INSERT INTO conversions
  (influencer_id, user_id, user_name, amount, status, plan_type,
   commission_rate, commission_amount, plan_monthly_value)
VALUES
  ($1, $2, $3, 19.90, 'pending', 'starter', 20.00, 0.00, 19.90);

-- Confirmar pagamento
UPDATE conversions
SET status='paid', commission_amount=3.98
WHERE id=$1;

-- Registrar movimento CHC
INSERT INTO chc_movements
  (influencer_id, user_id, movement_type, chc_amount, real_value)
VALUES
  ($1, $2, 'earned', 5000, 5.00);

-- Buscar afiliado pelo código de referência
SELECT id, name FROM influencers WHERE referral_code = $1;
```

---

## Dados de Teste

```
Email:  teste@chicoai.com
Senha:  123456
Código: CHICO_TESTE001
Link:   https://www.chicoia.com.br/ref/CHICO_TESTE001
```

---

## Endpoints API

```
POST /api/auth/login                      → login
GET  /api/dashboard/metrics               → métricas gerais      [auth]
GET  /api/dashboard/conversions           → lista conversões     [auth]
GET  /api/referral/code                   → código do afiliado   [auth]
GET  /api/analytics/conversions-by-plan   → breakdown por plano  [auth]
GET  /api/analytics/commission/breakdown  → comissões            [auth]
GET  /api/analytics/plan-distribution     → distribuição %       [auth]
GET  /api/chc/breakdown                   → CHC detalhado        [auth]
GET  /api/retention/overview              → retenção             [auth]
```

Header obrigatório (exceto login):
```
Authorization: Bearer <jwt_token>
```
