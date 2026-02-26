# Deployment Report — ChicoIA Affiliate Dashboard

**Data:** 2026-02-26
**Versão:** Alinhamento com backend principal (commit `8e0852b`)
**Status:** ✅ DEPLOYED — AMBOS ONLINE

---

## URLs de Produção

| Serviço | URL | Status |
|---|---|---|
| **Frontend** | https://chico-afiliado-frontend.vercel.app | ✅ Online |
| **Backend API** | https://chico-afiliado-backend.vercel.app/api | ✅ Online |
| **Health Check** | https://chico-afiliado-backend.vercel.app/api/health | ✅ `{"status":"ok"}` |

---

## O Que Foi Deployado

### Correções Críticas de Integração (Migration 007)
- `user_id`: `UUID` → `VARCHAR(255)` em `conversions` e `chc_movements`
- Planos: `starter` → `start`, adicionado `goat` (R$ 49,90)
- Preço Pro corrigido: R$ 49,90 → **R$ 29,90**
- Comissão Pro corrigida: R$ 9,98 → **R$ 5,98**
- Tabela `plan_catalog` criada no Supabase

### API Padronizada
- Respostas de erro: `{ "error": "..." }` → `{ "message": "..." }`
- JWT expiry: `7d` → **`24h`**
- Endpoints retornam planos corretos: `free`, `start`, `pro`, `goat`

### Documentação Adicionada
- `backend/database/DATABASE_DOCUMENTATION.md`
- `backend/database/QUICK_REFERENCE.md`
- `backend/database/ALIGNMENT_REPORT.md`

---

## Banco de Dados (Supabase)

| Item | Valor |
|---|---|
| **Provedor** | Supabase (PostgreSQL 17.6) |
| **Região** | us-west-2 |
| **Pooler** | Session Pooler (IPv4) |
| **Tabelas** | `influencers`, `conversions`, `chc_movements`, `plan_catalog` |
| **Migration aplicada** | `007_align_with_main_backend.sql` ✅ |

---

## Variáveis de Ambiente (Backend Produção)

| Variável | Status |
|---|---|
| `DATABASE_URL` | ✅ Atualizada (Supabase Session Pooler) |
| `JWT_EXPIRES_IN` | ✅ Atualizada para `24h` |
| `FRONTEND_URL` | ✅ `https://chico-afiliado-frontend.vercel.app` |
| `NODE_ENV` | ✅ `production` |
| `JWT_SECRET` | ✅ Configurado |
| `FACEBOOK_APP_ID/SECRET` | ✅ Configurados |
| `SESSION_SECRET` | ✅ Configurado |
| `BASE_URL` | ✅ `https://www.chicoia.com.br` |

---

## Testes Realizados em Produção

| Teste | Resultado |
|---|---|
| `GET /api/health` | ✅ `{"status":"ok"}` |
| `POST /api/auth/login` | ✅ JWT retornado |
| `GET /api/analytics/plan-distribution` | ✅ Keys: `free, start, pro, goat` |
| `GET /api/analytics/commission/breakdown` | ✅ Pro avg: R$ 29,90 / Goat avg: R$ 49,90 |
| Formato de erro | ✅ `{"message":"Credenciais inválidas"}` |
| Frontend build | ✅ 2540 módulos, gzip 230 kB |

---

## Credenciais de Teste

```
URL:    https://chico-afiliado-frontend.vercel.app/dashboard
Email:  teste@chicoai.com
Senha:  123456
```

---

## Planos e Comissões (Valores Corretos)

| Plano | Preço/mês | Comissão (20%) |
|---|---|---|
| Free | R$ 0,00 | R$ 0,00 |
| Start | R$ 19,90 | R$ 3,98 |
| Pro | R$ 29,90 | R$ 5,98 |
| Goat | R$ 49,90 | R$ 9,98 |

---

## Rollback

**Commit anterior:** `bcc1904`

```bash
# Para reverter o frontend/backend ao estado anterior:
git revert 8e0852b
git push origin main
cd frontend && vercel --prod
cd ../backend && vercel --prod

# Para reverter a migration no banco:
# 1. Renomear 'start' → 'starter' nos dados
# 2. Remover constraint goat
# 3. Restaurar user_id como UUID (DESTRUTIVO - requer backup)
```

> **Nota:** A migration 007 alterou dados no Supabase. Reverter o banco requer restauração de backup. Recomenda-se não reverter a menos que seja estritamente necessário.

---

## Próximos Passos

- [ ] Conectar frontend ao backend real (substituir mock data por chamadas API)
- [ ] Deploy do backend ChicoIA principal para receber webhooks do affiliate
- [ ] Implementar endpoint `POST /api/internal/conversion` para receber eventos do main backend
- [ ] Configurar domínio personalizado no Vercel (opcional)
- [ ] Compartilhar URL com Felipe para integração

---

*Gerado em 2026-02-26 após deploy bem-sucedido de ambos os serviços.*
