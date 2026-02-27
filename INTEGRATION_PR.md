# Pull Request: Integração Affiliate ↔ Backend Principal ChicoIA

**Para:** Felipe (Tech Lead)
**Data:** 2026-02-26
**Branch:** `feature/affiliate-integration`
**Status:** Pronto para revisão

---

## Resumo

Implementa o fluxo completo de rastreamento de afiliados entre o backend principal
(`Chico-Back`) e o sistema de afiliados (`chicoai-affiliate-dashboard`).

Quando um usuário se cadastra via link de um influencer, é pago e usa CHC —
tudo é registrado automaticamente no dashboard do afiliado sem impactar a experiência
do usuário principal.

---

## O que foi implementado

### 1. Backend Afiliado — novos endpoints internos (`./backend/`)

**Novos arquivos:**
- `backend/src/middleware/serviceAuth.js` — autentica chamadas via `X-Service-Token`
- `backend/src/controllers/internalController.js` — lógica dos 7 endpoints internos
- `backend/src/routes/internal.js` — router montado em `/api/internal`

**Arquivo modificado:**
- `backend/src/server.js` — registra `/api/internal` routes
- `backend/.env` — adicionado `INTERNAL_SERVICE_TOKEN`

**Endpoints disponíveis:**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/internal/validate/:code` | Valida se código de referência existe |
| `POST` | `/api/internal/conversion` | Registra nova conversão (usuário se cadastrou) |
| `POST` | `/api/internal/payment-confirmed` | Confirma pagamento e grava comissão |
| `POST` | `/api/internal/upgrade` | Registra upgrade de plano |
| `POST` | `/api/internal/chc-movement` | Rastreia movimentação CHC |
| `POST` | `/api/internal/activity` | Atualiza timestamp de atividade (retenção) |
| `POST` | `/api/internal/churn` | Registra cancelamento de assinatura |

---

### 2. Backend Principal — integração afiliados (`Chico-Back/`)

**Novo arquivo:**
- `services/affiliate_service.py` — chamadas HTTP ao backend afiliado (fire-and-forget,
  sempre em thread separada, nunca bloqueia o fluxo do usuário)

**Arquivos modificados:**
- `models/user.py` — adicionado campo `referral_code` (nullable, indexado)
- `services/auth_service.py` — `register_user()` aceita `referral_code` e persiste no user
- `routes/auth_routes.py` — endpoint `POST /auth/register` aceita `referral_code` (Form),
  chama `affiliate_service.notify_conversion_created()` após criar usuário
- `services/subscription_service.py` — `_handle_checkout_completed()` e `verify_payment()`
  chamam `affiliate_service.notify_payment_confirmed()` após Stripe confirmar pagamento
- `services/__init__.py` — exporta `affiliate_service`
- `core/config.py` — adicionadas vars `AFFILIATE_API_URL` e `AFFILIATE_SERVICE_TOKEN`
- `.env` — adicionadas as duas vars acima (valores de desenvolvimento)

---

### 3. Frontend Principal — captura de código de referência (`Chico-Front/`)

**Novo arquivo:**
- `app/ref/[code]/page.tsx` — página de destino para links `chicoia.com.br/ref/CODIGO`.
  Armazena o código no `localStorage` e redireciona para `/register?ref=CODIGO`

**Arquivos modificados:**
- `app/register/view/Template.tsx` — campo "Código de Indicação" (opcional, auto-preenchido
  via URL `?ref=` ou `localStorage`), limpa o código após cadastro bem-sucedido
- `schemas/user.ts` — adicionado `referral_code?: string` ao `RegisterUserSchema`
- `lib/services.ts` — `registerUser()` inclui `referral_code` no `FormData` se presente

---

## Fluxo completo

```
1. Influencer compartilha: chicoia.com.br/ref/CHICO_AB3K9X2PQ
2. Usuário acessa o link → app/ref/[code]/page.tsx armazena no localStorage
3. Usuário é redirecionado para /register?ref=CHICO_AB3K9X2PQ
4. Campo "Código de Indicação" é preenchido automaticamente
5. Usuário preenche o formulário e clica "Criar conta"
6. Chico-Back cria o usuário com referral_code = "CHICO_AB3K9X2PQ"
7. Chico-Back chama affiliate /api/internal/conversion → cria registro (pending)
8. Usuário assina um plano → Stripe webhook dispara
9. Chico-Back chama affiliate /api/internal/payment-confirmed
10. Conversão atualizada para 'paid', comissão calculada
11. Dashboard do influencer exibe a conversão e comissão em tempo real
```

---

## Segurança

- Endpoints `/api/internal/*` requerem header `X-Service-Token` válido
- Token é compartilhado via variável de ambiente (nunca exposto ao frontend)
- Se o sistema afiliado estiver fora do ar, **o cadastro e pagamento NÃO são afetados**
  (todas as chamadas são fire-and-forget em thread separada)

---

## Configuração necessária em produção

### Backend Principal (`Chico-Back`) — variáveis a adicionar:

```env
AFFILIATE_API_URL=https://chico-afiliado-backend.vercel.app/api
AFFILIATE_SERVICE_TOKEN=<gerar_token_seguro_com_secrets.token_hex(32)>
```

### Backend Afiliado — variável a adicionar no Vercel:

```env
INTERNAL_SERVICE_TOKEN=<mesmo_token_acima>
```

> **Importante:** O token deve ser o mesmo nos dois backends. Use um valor aleatório
> gerado em produção, nunca o valor do desenvolvimento.

---

## Migração de banco — Backend Principal

É necessário adicionar o campo `referral_code` à tabela `users` do banco principal:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(255);

CREATE INDEX IF NOT EXISTS ix_users_referral_code
  ON users (referral_code);
```

> O campo é nullable — usuários sem código de indicação não são afetados.

---

## Pontos abertos para discussão

1. **Migration do banco principal**: A alteração acima precisa ser aplicada na instância
   de produção antes do deploy.

2. **Token de produção**: Precisamos gerar e configurar o `AFFILIATE_SERVICE_TOKEN` /
   `INTERNAL_SERVICE_TOKEN` no ambiente de produção.

3. **Retry em falhas**: Atualmente as chamadas ao sistema afiliado são fire-and-forget
   sem retry. Se necessário, podemos adicionar uma fila simples (ex: Redis) para
   garantir entrega.

4. **Tracking de upgrade**: Quando um usuário faz upgrade de plano, o endpoint
   `/api/internal/upgrade` precisa ser chamado. Identificar o ponto exato no fluxo
   de pagamento onde isso deve ocorrer.

5. **Churn automático**: O handler `customer.subscription.deleted` no Stripe ainda não
   implementa a chamada de churn porque requer buscar o `user_id` a partir do
   `customer_id` do Stripe — isso pode ser feito depois.

---

## Como testar localmente

```bash
# 1. Iniciar backend afiliado
cd chicoai-affiliate-dashboard/backend
npm run dev  # porta 3001

# 2. Iniciar backend principal
cd Chico-Back
uvicorn main:app --reload --port 8000

# 3. Testar criação de conversão
curl -X POST http://localhost:8000/auth/register \
  -F "email=teste@example.com" \
  -F "username=testusuario" \
  -F "password=senha123" \
  -F "full_name=Teste Usuario" \
  -F "referral_code=CHICO_AB3K9X2PQ"

# 4. Verificar no dashboard afiliado
# Acessar http://localhost:3001/api/internal/validate/CHICO_AB3K9X2PQ
# Header: X-Service-Token: chicoai_internal_service_token_2026_secreto
```

---

*Documentação gerada em 2026-02-26.*
