# Guia de Integração — Tabela users do ChicoIA com Affiliate System

> **Para:** Felipe e time de desenvolvimento
> **Data:** 2026-02-26
> **Status atual:** ⚠️ PARCIAL — `user_id` existe mas sem FK declarada

---

## Estado Atual

O campo `user_id` existe em duas tabelas do sistema affiliate:

```sql
conversions.user_id    VARCHAR(255)  -- sem FK, sem constraint
chc_movements.user_id  VARCHAR(255)  -- sem FK, sem constraint
```

Isso significa:
- ✅ O campo já aceita IDs do backend principal (inteiros como `"42"`)
- ✅ Dados podem ser inseridos com qualquer `user_id` válido
- ❌ Não há foreign key para a tabela `users` do ChicoIA principal
- ❌ Não há verificação de integridade referencial
- ❌ Os dois sistemas estão em **bancos diferentes** (affiliate no Supabase, main backend em PostgreSQL separado)

---

## Arquitetura Atual vs. Desejada

### Atual (standalone)
```
[ChicoIA Main DB]          [Affiliate DB — Supabase]
  users.id = 42   ─────►  conversions.user_id = "42"
                           (apenas string, sem FK)
```

### Desejada (integrada via API)
```
[ChicoIA Main Backend]                [Affiliate API]
  POST /payments/confirm   ─────►    PATCH /api/internal/conversion
  POST /chc/transaction    ─────►    POST  /api/internal/chc-movement
  POST /users/register     ─────►    POST  /api/internal/conversion (pending)
```

> **Importante:** Como os sistemas estão em bancos diferentes, a integração **deve ser feita via HTTP API**, não via foreign key. Uma FK cross-database não é possível no PostgreSQL.

---

## Opção 1: Integração via Webhooks (Recomendado)

O backend principal ChicoIA chama endpoints do affiliate sempre que eventos relevantes acontecem.

### Endpoints a criar no Affiliate API

#### 1. Registrar nova conversão (usuário se cadastrou via link)

```
POST /api/internal/conversion
Authorization: Bearer <SERVICE_TOKEN>

Body:
{
  "referral_code": "CHICO_AB3K9X2PQ",
  "user_id": 42,
  "user_name": "Maria L.",
  "plan_type": "start",
  "amount": 19.90,
  "status": "pending"
}

Response 201:
{
  "message": "Conversão registrada",
  "conversion_id": "uuid..."
}
```

#### 2. Confirmar pagamento (subscription paga)

```
PATCH /api/internal/conversion/:conversion_id/confirm
Authorization: Bearer <SERVICE_TOKEN>

Body:
{
  "status": "paid",
  "paid_at": "2026-02-26T10:00:00Z"
}

Response 200:
{
  "message": "Conversão confirmada",
  "commission_amount": 3.98
}
```

#### 3. Registrar upgrade de plano

```
PATCH /api/internal/conversion/:conversion_id/upgrade
Authorization: Bearer <SERVICE_TOKEN>

Body:
{
  "previous_plan": "start",
  "new_plan": "pro",
  "upgraded_at": "2026-02-26T12:00:00Z"
}
```

#### 4. Registrar movimento CHC

```
POST /api/internal/chc-movement
Authorization: Bearer <SERVICE_TOKEN>

Body:
{
  "user_id": 42,
  "movement_type": "earned",
  "chc_amount": 5000,
  "description": "Completou tutorial"
}
```

#### 5. Registrar atividade do usuário (para retenção)

```
POST /api/internal/activity
Authorization: Bearer <SERVICE_TOKEN>

Body:
{
  "user_id": 42,
  "activity_type": "login"
}
```

#### 6. Registrar cancelamento (churn)

```
POST /api/internal/churn
Authorization: Bearer <SERVICE_TOKEN>

Body:
{
  "user_id": 42,
  "churned_at": "2026-03-01T00:00:00Z"
}
```

---

## Opção 2: FK na Mesma Database (Somente se migrar para mesmo banco)

Se no futuro os dois sistemas compartilharem o mesmo banco PostgreSQL, adicionar FK é simples:

```sql
-- Pré-requisito: users.id deve ser INTEGER ou VARCHAR(255)
-- O backend principal usa INTEGER, então:

-- Para conversions
ALTER TABLE conversions
  ADD CONSTRAINT fk_conversions_user_id
  FOREIGN KEY (user_id)
  REFERENCES users(id::VARCHAR)  -- cast se necessário
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Para chc_movements
ALTER TABLE chc_movements
  ADD CONSTRAINT fk_chc_movements_user_id
  FOREIGN KEY (user_id)
  REFERENCES users(id::VARCHAR)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
```

> **Atenção:** O backend principal usa `users.id INTEGER`. O affiliate usa `user_id VARCHAR(255)`. Para adicionar FK, seria necessário ou converter o tipo no affiliate, ou usar uma coluna de referência separada.

---

## SERVICE_TOKEN — Autenticação Inter-Serviços

Para os endpoints `/api/internal/*`, usar uma API key separada (não JWT de usuário):

```env
# No backend affiliate (.env)
INTERNAL_SERVICE_TOKEN=chicoai_internal_service_token_2026_secreto

# No backend principal (.env)
AFFILIATE_API_URL=https://chico-afiliado-backend.vercel.app
AFFILIATE_SERVICE_TOKEN=chicoai_internal_service_token_2026_secreto
```

Middleware de autenticação interna:
```javascript
// backend/src/middleware/serviceAuth.js
const serviceAuth = (req, res, next) => {
  const token = req.headers['x-service-token'];
  if (token !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized service' });
  }
  next();
};
```

---

## O Que o Backend Principal Precisa Fazer

### Quando usuário se cadastrar via link de referência:

```python
# No backend principal (FastAPI/Python)
import httpx

async def on_user_register(user_id: int, referral_code: str):
    if referral_code:
        await httpx.post(
            f"{settings.AFFILIATE_API_URL}/api/internal/conversion",
            headers={"X-Service-Token": settings.AFFILIATE_SERVICE_TOKEN},
            json={
                "referral_code": referral_code,
                "user_id": user_id,
                "plan_type": "free",
                "amount": 0,
                "status": "pending"
            }
        )
```

### Quando pagamento for confirmado:

```python
async def on_payment_confirmed(user_id: int, plan: str, amount: float):
    conversion = await get_conversion_by_user_id(user_id)
    if conversion:
        await httpx.patch(
            f"{settings.AFFILIATE_API_URL}/api/internal/conversion/{conversion['id']}/confirm",
            headers={"X-Service-Token": settings.AFFILIATE_SERVICE_TOKEN},
            json={"status": "paid"}
        )
```

### Quando usuário movimentar CHC:

```python
async def on_chc_movement(user_id: int, movement_type: str, chc_amount: int, description: str):
    influencer_id = await get_influencer_by_user_id(user_id)
    if influencer_id:
        await httpx.post(
            f"{settings.AFFILIATE_API_URL}/api/internal/chc-movement",
            headers={"X-Service-Token": settings.AFFILIATE_SERVICE_TOKEN},
            json={
                "user_id": user_id,
                "movement_type": movement_type,
                "chc_amount": chc_amount,
                "description": description
            }
        )
```

---

## Checklist de Integração

- [ ] Criar endpoints `/api/internal/*` no affiliate backend
- [ ] Criar middleware `serviceAuth.js` para proteger endpoints internos
- [ ] Adicionar `INTERNAL_SERVICE_TOKEN` no `.env` de ambos os backends
- [ ] No backend principal: chamar affiliate ao cadastrar usuário via referral
- [ ] No backend principal: chamar affiliate ao confirmar pagamento
- [ ] No backend principal: chamar affiliate ao registrar movimento CHC
- [ ] No backend principal: chamar affiliate ao registrar login/atividade
- [ ] No backend principal: chamar affiliate ao cancelar assinatura
- [ ] Testar fluxo completo: cadastro → pagamento → comissão → dashboard atualizado

---

*Guia atualizado em 2026-02-26.*
