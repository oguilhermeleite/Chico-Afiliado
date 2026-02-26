# Respostas para Felipe — Perguntas sobre o Banco de Dados

> **Para:** Felipe
> **Data:** 2026-02-26
> **Contexto:** Análise do banco em produção (Supabase) + código-fonte do affiliate backend

---

## Q1: "Quero um dicionário de dados"

✅ **Criado.** Ver arquivo: [`DATA_DICTIONARY.md`](./DATA_DICTIONARY.md)

O dicionário contém:
- Todas as 4 tabelas (`influencers`, `conversions`, `chc_movements`, `plan_catalog`)
- Tipo exato de cada coluna (verificado ao vivo no Supabase via `information_schema`)
- Constraints, índices, valores permitidos e regras de negócio
- Relacionamentos entre tabelas

---

## Q2: "Isso está implementado junto com a tabela `users` no sistema em produção?"

### Resposta direta: ⚠️ NÃO — integração com `users` ainda não está implementada

### O que existe hoje

O campo `user_id` existe nas tabelas `conversions` e `chc_movements`:

```sql
conversions.user_id    VARCHAR(255)  -- sem FK, sem constraint de integridade
chc_movements.user_id  VARCHAR(255)  -- sem FK, sem constraint de integridade
```

Isso significa que:
- ✅ O campo aceita IDs do backend principal (ex: `"42"`, `"123"`)
- ✅ Dados podem ser inseridos com qualquer `user_id` como string
- ❌ **Não existe nenhuma foreign key** para uma tabela `users`
- ❌ **Não existe nenhuma referência à tabela `users`** em nenhuma query SQL do sistema affiliate
- ❌ Não há verificação se o `user_id` realmente existe no sistema principal

### Por que não tem FK?

Os dois sistemas estão em **bancos de dados separados**:

| Sistema | Banco | Provedor |
|---|---|---|
| **Affiliate Dashboard** | PostgreSQL 17.6 | Supabase (us-west-2) |
| **ChicoIA Principal** | PostgreSQL | Servidor separado |

**Foreign key entre bancos diferentes é tecnicamente impossível no PostgreSQL.** Uma FK só funciona dentro do mesmo banco de dados.

### O que precisa ser feito para integrar

A integração correta é via **HTTP API** (webhooks). Quando um evento acontece no backend principal, ele chama um endpoint do affiliate:

| Evento | Endpoint affiliate |
|---|---|
| Usuário se cadastra via link de referência | `POST /api/internal/conversion` |
| Pagamento confirmado | `PATCH /api/internal/conversion/:id/confirm` |
| Upgrade de plano | `PATCH /api/internal/conversion/:id/upgrade` |
| Movimento CHC | `POST /api/internal/chc-movement` |
| Login/atividade | `POST /api/internal/activity` |
| Cancelamento (churn) | `POST /api/internal/churn` |

Ver guia completo: [`USERS_INTEGRATION_GUIDE.md`](./USERS_INTEGRATION_GUIDE.md)

### Estado resumido

```
HOJE (standalone):
  Backend Principal  ─── (sem comunicação) ───  Affiliate DB
  users.id = 42                                  conversions.user_id = "42"
                                                 (apenas string, sem validação)

OBJETIVO (integrado via API):
  Backend Principal  ──► POST /api/internal/conversion  ──►  Affiliate DB
  (ao cadastrar via link)                                      (registra conversão)
  (ao confirmar pagamento)  ──► PATCH .../confirm  ──►        (atualiza, gera comissão)
```

---

## Resumo do que está pronto vs. o que falta

| Item | Status |
|---|---|
| Campo `user_id` nas tabelas | ✅ Existe (VARCHAR 255) |
| Aceita IDs do backend principal | ✅ Sim |
| Tabela `users` no affiliate | ❌ Não existe (nem deve) |
| Foreign key para `users` | ❌ Impossível (bancos separados) |
| Endpoints `/api/internal/*` | ❌ Não implementados ainda |
| Middleware `serviceAuth` para proteger endpoints internos | ❌ Não implementado ainda |
| Backend principal chamando affiliate ao cadastrar usuário | ❌ Não implementado |
| Backend principal chamando affiliate ao confirmar pagamento | ❌ Não implementado |
| Fluxo completo: cadastro → conversão → comissão | ❌ Pendente |

---

*Análise baseada em inspeção do código-fonte e banco em produção em 2026-02-26.*
