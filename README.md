# Anamnesic App — SaaS shell (multi-tenant + billing)

Aplicação web do **Anamnesic**. É o **shell multi-tenant + módulo de cobrança** que faltava
para o produto virar SaaS. Construído reaproveitando (e corrigindo) dois repos seus:

| Camada | Veio de | Correções aplicadas |
|---|---|---|
| Shell Next.js + auth + workspaces | `kairos/packages/app` | ver §"Correções" |
| Billing por assinatura | `pagbank-finance-backend` | ver §"Correções" |
| Produto (contexto/memory/MCP) | `anamnesic-context` (thinkbrew) | conecta via API key |

---

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Prisma + PostgreSQL** (substitui o SQLite/TypeORM do kairos)
- **bcryptjs** (substitui o SHA-256 do kairos) + **JWT** access (15m) + **refresh rotation** (30d)
- **PagBank v4 Subscriptions** (`/plans`, `/subscriptions`) — PIX/boleto/cartão recorrente
- **Zod** (validação) + **Tailwind v4**

## Estrutura

```
anamnesic-app/
├── prisma/
│   ├── schema.prisma     # User, Workspace, Member(RBAC), Plan, Subscription, Invoice, ApiKey, AuditEvent, RefreshToken
│   └── seed.ts           # planos free/pro/team
├── middleware.ts         # gate de auth (kairos NÃO tinha)
└── src/
    ├── app/
    │   ├── (marketing)/  # landing + pricing
    │   ├── (auth)/       # login, signup
    │   ├── (app)/        # dashboard, billing, settings  (protegido)
    │   └── api/v1/
    │       ├── auth/        # login, signup, refresh, me
    │       ├── workspaces/  # CRUD com membership enforced
    │       ├── billing/     # plans, subscribe, subscription, webhook(assinado)
    │       └── settings/    # api-keys
    ├── context/          # AuthContext, WorkspaceContext
    └── lib/
        ├── auth.ts       # bcrypt + JWT + refresh rotation
        ├── prisma.ts
        ├── api.ts        # fetch c/ auto-refresh
        └── billing/      # pagbank.ts (v4), plans.ts
```

## Correções de segurança (o que estava quebrado nos repos de origem)

**Do `kairos/app`:**
1. Senha era **SHA-256 sem salt** → agora **bcrypt (cost 12)**.
2. **Sem `middleware.ts`** → agora rotas `/(app)` são gated (redirect p/ /login).
3. **Sem authz de tenant** (`getWorkspaceId` confiava no header do client) → agora `requireWorkspace()` valida `WorkspaceMember` no DB.
4. **Refresh aceitava token expirado** (`ignoreExpiration:true`) → agora **refresh rotation** (token opaque, hashed, revogado a cada uso).
5. `JWT_SECRET` com fallback inseguro → **falha rápido** se não configurado.
6. `ownerId:'system'` hardcoded → agora `auth.userId`.
7. `listAll()` vazava todos workspaces → agora só os do usuário.
8. SQLite/`synchronize:true` → **Postgres + Prisma migrations**.

**Do `pagbank-finance-backend`:**
1. **Webhook sem verificação de assinatura** → agora **HMAC-SHA256** (`x-signature` `t=,v1=`) + janela anti-replay de 5min.
2. Rotas de pagamento **públicas** → agora exigem auth + workspace.
3. **Catálogo de planos hardcoded** → tabela `Plan` + seed.
4. **Sem persistência** (tokens/users em memória) → Prisma.
5. Bug do `pagbankRecurrenceService` nunca instanciado → removido (uso só v4 subscriptions).

## Como rodar

```bash
cp .env.example .env              # preencha DATABASE_URL, JWT_*, PAGBANK_*
pnpm install
pnpm db:migrate                   # cria as tabelas
pnpm db:seed                      # cria os planos
pnpm dev                          # http://localhost:3000
```

> Para PagBank sandbox: crie os planos via `pagbank.createPlan()` e cole o id em
> `Plan.pagbankPlanId` (Pro/Team). Free não precisa.

## Wiring com o produto (`anamnesic-context`)

O Anamnesic App **não contém** o motor de contexto — ele é o **caixa + multi-tenant**.
O produto (thinkbrew core: Context/Decision/Export/MCP/CLI) roda separado e se conecta assim:

```
[CLI/MCP anamnesic-context] --API key--> [Anamnesic App /api/v1/settings/api-keys valida]
                                   [Anamnesic App concede cota por plano (Plan.features)]
                                   [anamnesic-context lê ANAMNESIC_CONTEXT_API_URL p/ sync em nuvem]
```

Fluxo de signup → uso:
1. Usuário cria conta (`/signup`) → ganha workspace + plano Free.
2. Upgrade em `/billing` → `POST /api/v1/billing/subscribe` → PagBank cria assinatura.
3. Webhook `subscription.active` / `order.paid` → atualiza `Subscription.status`.
4. Em `/settings` gera uma **API key** → usa no `anamnesic` CLI / MCP.
5. `anamnesic-context` valida a key e respeita `Plan.features.contextEntries` (cota).

## Próximos passos (o que ainda falta)

- [ ] Endpoint `/api/v1/auth/api-key` que o anamnesic-context chama para **validar key + ler cota**.
- [ ] **Usage metering**: contar `contextEntries` por workspace (contador incrementa no anamnesic-context, decremento de cota verificado aqui).
- [ ] Stripe (se for mercado global) — hoje só PagBank.
- [ ] Email transacional (resend/nodemailer) p/ receipts e onboarding.
- [ ] CI/CD + deploy (Docker) — reaproveite workflows do kairos.

## Licenca

AGPL-3.0 (open-core). Veja [LICENSE](LICENSE).
