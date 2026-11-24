# Esqueci a senha, fila de assinatura e dependentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recuperação de senha por e-mail, fila de interesse em assinatura visível no painel e cadastro de dependentes usados no agendamento.

**Architecture:** Next.js 15 App Router + Prisma (Postgres/Neon). Rotas de cliente usam `getAuthUser` (cookie `auth-token`); rotas do painel usam `requireStaff`/NextAuth (`src/lib/staff-auth.ts`). E-mail via `sendEmail` (`src/lib/email.ts`). Uma migration aditiva cobre as três partes.

**Tech Stack:** Next 15, React 18, Prisma 6, bcryptjs, Resend (fetch), Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-24-senha-fila-dependentes-design.md`

## Global Constraints

- O banco local é o Neon de **produção**: só migration aditiva, via `npx prisma migrate deploy` (nunca `migrate dev`/`db push`/reset).
- `PasswordResetToken` já existe em produção: a migration usa `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` e adiciona a FK só se não existir.
- Roles comparadas sempre com `.toUpperCase()`.
- Textos da interface em português do Brasil, no tom do resto do site.
- `ONLINE_PAYMENT_REQUIRED` continua `false`; nada aqui o altera.
- O projeto não tem framework de testes: verificação = `npx tsc --noEmit`, `npm run build` e chamadas HTTP contra `npm run dev` (porta 3000). Dados criados nos testes são apagados ao fim de cada task.

## Review Focus

- Token de reset expirado, já usado ou adulterado → página mostra "link inválido ou expirado" e nada muda. (Task 2, passo de verificação 4)
- Pedido de reset para e-mail inexistente ou conta não cadastrada → mesma resposta 200 de um e-mail válido, sem envio. (Task 2, passo 4)
- Cliente clica "Quero assinar" duas vezes / em duas abas → um único interesse `waiting`. (Task 3, passo 3)
- `dependentId` de outro titular ou de dependente removido em `POST /api/appointments` → 400, nenhum agendamento criado. (Task 5, passo 3)
- Titular assinante agendando para dependente → `paymentMethod` = `no_local` (não `assinatura`). (Task 5, passo 3)

---

### Task 1: Schema e migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261124120000_password_reset_interest_dependents/migration.sql`

**Interfaces:**
- Produces (Prisma): `PasswordResetToken { id, userId, tokenHash @unique, expiresAt, usedAt?, createdAt }` (`@@index([userId, expiresAt])`, relação `user` com `onDelete: Cascade`);
  `SubscriptionInterest { id, clientId, status String @default("waiting"), createdAt, handledAt?, handledById? }` (`@@index([status, createdAt])`, relação `client` → `User`, cascade);
  `Dependent { id, ownerId, name, relationship String, isActive Boolean @default(true), createdAt, updatedAt }` (`@@index([ownerId])`, relação `owner` → `User`, cascade);
  `Appointment.dependentId String?` (relação `dependent` → `Dependent`, `onDelete: SetNull`) e `Appointment.dependentName String?`.

- [ ] **Step 1:** Adicionar os modelos e campos acima (com back-relations em `User`: `passwordResetTokens`, `subscriptionInterests`, `dependents`; em `Dependent`: `appointments`). Nomes de tabela padrão do Prisma (sem `@@map`), para casar com a `PasswordResetToken` existente (timestamps `timestamp(3)` no novo SQL; a tabela existente é `timestamp` sem precisão e é compatível).
- [ ] **Step 2:** Escrever o SQL da migration à mão (não usar `migrate dev`): `CREATE TABLE IF NOT EXISTS` para as três tabelas, índices `IF NOT EXISTS`, `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS` para as duas colunas, FKs dentro de `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...) $$`.
- [ ] **Step 3:** `npx prisma validate` → "The schema is valid" (a conferência schema × SQL é o Step 5).
- [ ] **Step 4:** Aplicar: `npx prisma migrate deploy` → "All migrations have been successfully applied". Depois `npx prisma migrate status` → "Database schema is up to date!" e `npx prisma generate`.
- [ ] **Step 5:** Verificar drift: `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` → só diferenças esperadas da migration fantasma (Account/Session/AuditLog, colunas extras de users), nada sobre as tabelas novas.
- [ ] **Step 6:** `npx tsc --noEmit` passa. Commit `feat: schema de reset de senha, fila de assinatura e dependentes`.

### Task 2: Esqueci a senha

**Files:**
- Create: `src/lib/password-reset.ts`, `src/lib/email-templates/password-reset.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`, `src/app/esqueci-senha/page.tsx`, `src/app/redefinir-senha/page.tsx`
- Modify: `src/components/client/ClientAuthForm.tsx` (link no modo login), `src/app/login/page.tsx` (link)

**Interfaces:**
- Produces: `hashResetToken(token: string): string` (SHA-256 hex); `createPasswordResetToken(userId: string): Promise<string>` (devolve o token em claro; invalida os não usados do usuário marcando `usedAt`); `RESET_TOKEN_TTL_MS = 60 * 60 * 1000`; `MAX_RESETS_PER_HOUR = 3`.
- `POST /api/auth/forgot-password` `{ email }` → sempre `200 { ok: true }` (400 só se o e-mail vier vazio).
- `POST /api/auth/reset-password` `{ token, password }` → `200 { ok: true, role }` | `400 { error }`.

- [ ] **Step 1:** `password-reset.ts` com as funções acima (`crypto.randomBytes(32).toString('hex')`).
- [ ] **Step 2:** forgot-password: normaliza e-mail; elegível = `isActive && (role.toUpperCase() !== 'CLIENT' || isRegistered)`; conta tokens do usuário com `createdAt` na última hora; se < 3, cria token e envia e-mail com link `${siteUrl}/redefinir-senha?token=...` (siteUrl do mesmo jeito que `src/app/api/appointments/route.ts` obtém para o e-mail de confirmação). Template: assunto "Redefinir sua senha — {BUSINESS.name}", botão, aviso de 1 hora e "se não foi você, ignore".
- [ ] **Step 3:** reset-password: senha ≥ 6 caracteres; busca token por hash com `usedAt: null` e `expiresAt > now`; na mesma `$transaction` atualiza `users.password` (bcrypt, 10) e marca `usedAt`. Erro: "Link inválido ou expirado. Peça um novo."
- [ ] **Step 4:** Páginas: `/esqueci-senha` (campo e-mail, mensagem neutra após enviar) e `/redefinir-senha` (lê `token` com `useSearchParams` dentro de `Suspense`; nova senha + confirmação; sucesso → link "Entrar" para `/minha-conta` se role CLIENT, senão `/login`). Mesmo visual escuro/âmbar das páginas de login.
- [ ] **Step 5:** Links "Esqueci a senha" → `/esqueci-senha` no ClientAuthForm (modo login) e no `/login`.
- [ ] **Step 6 (verificação, dev server):** com um usuário de teste criado via script (`role CLIENT, isRegistered true`, e-mail `reset-test+<ts>@example.com`):
  - forgot-password para e-mail inexistente → 200 `{ ok: true }`, nenhum token criado.
  - forgot-password para o teste → 200 e 1 token no banco (envio ao `example.com` será recusado/ignorado pela Resend — tudo bem).
  - Gerar um token direto com `createPasswordResetToken` via script, chamar reset-password → 200; login em `/api/auth/login` com a nova senha → 200.
  - Repetir o mesmo token → 400. Token aleatório → 400. Token com `expiresAt` no passado → 400.
  - 4º pedido na mesma hora não cria token.
  - Apagar o usuário de teste (cascade remove tokens).
- [ ] **Step 7:** `npx tsc --noEmit`. Commit `feat: esqueci a senha por e-mail`.

### Task 3: Fila de interesse em assinatura

**Files:**
- Create: `src/app/api/client/subscription-interest/route.ts`, `src/app/api/admin/subscription-interests/route.ts`, `src/app/api/admin/subscription-interests/[id]/route.ts`
- Modify: `src/app/api/client/overview/route.ts` (devolve `subscriptionInterest: { status, createdAt } | null` — o `waiting` mais recente), `src/app/minha-conta/page.tsx` (bloco "Seja assinante"), `src/app/api/admin/subscriptions/route.ts` (POST fecha interesse), `src/components/admin/SubscriptionsManagement.tsx` (seção da fila)

**Interfaces:**
- `POST /api/client/subscription-interest` → `200 { interest: { id, status, createdAt } }` (reutiliza `waiting` existente; 409 se já tem assinatura `active`).
- `GET /api/admin/subscription-interests` (staff) → `{ interests: Array<{ id, createdAt, client: { id, name, email, whatsapp, phone, clientCode } }> }`, só `waiting`, `createdAt asc`.
- `PATCH /api/admin/subscription-interests/[id]` `{ status: 'dismissed' | 'converted' }` (staff) → `{ ok: true }`; grava `handledAt`, `handledById`.
- Helper em `src/lib/subscription.ts`: `closeSubscriptionInterest(clientId: string, staffId: string | null): Promise<void>` (marca `waiting` → `converted`).

- [ ] **Step 1:** APIs acima; o POST de assinatura no painel chama `closeSubscriptionInterest` quando a assinatura criada tem `clientId`.
- [ ] **Step 2:** Minha Conta: botão "Quero assinar" faz o POST; com interesse `waiting` mostra "Você está na fila desde {data}. A barbearia vai entrar em contato." e um link secundário "Falar no WhatsApp" (o link atual).
- [ ] **Step 3:** Painel: no topo da aba Assinaturas, card "Fila de interessados ({n})" — lista em ordem de chegada com posição, nome, código `#000123`, WhatsApp (link `wa.me`), data. Botões **Criar assinatura** (seleciona o cliente no formulário existente: setar barbeiro se vazio, carregar clientes e `setSelectedClientId`; rolar até o formulário) e **Descartar** (confirm + PATCH). Após criar assinatura com sucesso, recarregar a fila. Esconder o card quando vazio.
- [ ] **Step 4 (verificação, dev server):** com cliente de teste logado (cookie de `/api/auth/login`): POST duas vezes → mesmo `id`; overview mostra `waiting`. GET admin (cookie NextAuth de um login de staff — ou checagem via script do Prisma se não houver senha de staff em mãos) lista o cliente. PATCH dismissed → some da lista. Limpar dados de teste.
- [ ] **Step 5:** `npx tsc --noEmit`. Commit `feat: fila de interesse em assinatura`.

### Task 4: Cadastro de dependentes (Minha Conta)

**Files:**
- Create: `src/lib/dependents.ts`, `src/app/api/client/dependents/route.ts`, `src/app/api/client/dependents/[id]/route.ts`, `src/components/client/DependentsManager.tsx`
- Modify: `src/app/minha-conta/page.tsx` (seção "Dependentes")

**Interfaces:**
- `src/lib/dependents.ts`: `RELATIONSHIPS = { filho: 'Filho(a)', conjuge: 'Cônjuge', irmao: 'Irmão(ã)', outro: 'Outro' } as const`; `type Relationship = keyof typeof RELATIONSHIPS`; `isRelationship(v: unknown): v is Relationship`; `appointmentDisplayName(a: { clientName?: string | null; client?: { name?: string | null } | null; dependentName?: string | null }): string` → `"João (dependente de Pedro Silva)"` quando há `dependentName`, senão o nome do cliente.
- `GET /api/client/dependents` → `{ dependents: Array<{ id, name, relationship }> }` (ativos, por nome). `POST` `{ name, relationship }` → `201 { dependent }`. `PATCH /[id]` `{ name?, relationship? }`, `DELETE /[id]` (→ `isActive=false`). Nome 2–80 caracteres; dono ≠ titular → 404. Máximo 10 ativos por titular.
- `DependentsManager` props: `{ onChange?: (list: DependentItem[]) => void; compact?: boolean }` — lista + formulário inline de adicionar/editar; reutilizado na Task 5.

- [ ] **Step 1:** lib + APIs + componente.
- [ ] **Step 2:** Seção "Dependentes" na Minha Conta, abaixo da assinatura, com texto "Agende para filhos, cônjuge ou familiares pela sua conta. A assinatura vale só para você."
- [ ] **Step 3 (verificação, dev server):** com cliente de teste: POST cria; GET lista; PATCH renomeia; DELETE some do GET; PATCH num id de outro titular → 404; nome vazio → 400; relationship inválida → 400. Limpar.
- [ ] **Step 4:** `npx tsc --noEmit`. Commit `feat: cadastro de dependentes na Minha Conta`.

### Task 5: Dependente no agendamento

**Files:**
- Modify: `src/app/agendamento/page.js`, `src/app/api/appointments/route.ts`, `src/lib/appointment-email.ts` + `src/lib/email-templates/appointment-confirmation.ts`, `src/app/minha-conta/page.tsx` (lista de agendamentos mostra "para João"), `src/app/api/client/overview/route.ts` (se usar `select`, incluir `dependentName`)

**Interfaces:**
- Consumes: `RELATIONSHIPS`, `DependentsManager` (Task 4).
- `POST /api/appointments` aceita `dependentId?: string`. Inválido/inativo/de outro titular → `400 { error: 'Dependente não encontrado.' }`.
- `AppointmentEmailInput.dependentName?: string | null`.

- [ ] **Step 1:** Rota: validar `dependentId` (`findFirst({ id, ownerId: authUser.id, isActive: true })`); `subscription = dependent ? null : await getActiveSubscription(...)`; gravar `dependentId` e `dependentName`. E-mail: "Agendamento para {dependentName}" no resumo.
- [ ] **Step 2:** Página: com cliente logado, bloco "Para quem é o corte?" antes do resumo/confirmar — opções "Eu ({nome})" + dependentes + "Adicionar dependente" (abre `DependentsManager compact`). Estado `selectedDependentId` (null = eu). Com dependente selecionado, `bookingPaymentLabel` e `amountDue` tratam como não assinante, e o resumo mostra "A assinatura vale só para o titular" se o titular for assinante. Enviar `dependentId` no POST. Tela de sucesso mostra o nome do dependente.
- [ ] **Step 3 (verificação, dev server):** com cliente de teste assinante (assinatura `manual` `active` criada por script) e um dependente:
  - agendar sem dependente → `paymentMethod: 'assinatura'`.
  - agendar com o dependente → `paymentMethod: 'no_local'`, `dependentName` gravado.
  - `dependentId` de outro titular → 400; dependente removido → 400; nada criado.
  - Limpar agendamentos, assinatura, dependentes e usuários de teste.
- [ ] **Step 4:** `npx tsc --noEmit`. Commit `feat: agendamento para dependentes`.

### Task 6: Dependente nos painéis

**Files:**
- Modify: `src/components/admin/AppointmentsManagement.tsx`, `src/app/admin/page.tsx` (calendário/relatórios), `src/app/admin/agendamentos/page.tsx`, `src/app/barbeiro/page.tsx`, `src/components/admin/AppointmentsReportTable.tsx`, e as rotas que alimentam essas telas se usarem `select` sem `dependentName` (`src/app/api/admin/appointments/route.ts`, `src/app/api/barber/appointments/route.ts`, `src/app/api/admin/reports/route.ts`, `src/app/api/admin/reports/export/route.ts`).

**Interfaces:**
- Consumes: `appointmentDisplayName` (Task 4).

- [ ] **Step 1:** Trocar a exibição do nome do cliente por `appointmentDisplayName(...)` em cada tela; a busca por nome também casa com `dependentName`. Exportação Excel ganha o nome exibido.
- [ ] **Step 2 (verificação):** `npx tsc --noEmit` e `npm run build` passam; com um agendamento de dependente de teste, `GET /api/admin/appointments` e `/api/barber/appointments` trazem `dependentName`. Limpar.
- [ ] **Step 3:** Commit `feat: painel mostra agendamentos de dependentes`.

### Task 7: Entrega para teste

- [ ] **Step 1:** `npx tsc --noEmit`, `npm run build` → sem erros.
- [ ] **Step 2:** Subir `npm run dev` em background e passar ao usuário o roteiro de teste das três partes. **Não** dar push até o usuário aprovar.
