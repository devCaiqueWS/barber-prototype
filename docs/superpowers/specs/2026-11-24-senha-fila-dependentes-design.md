# Esqueci a senha, fila de interesse em assinatura e dependentes

Data: 2026-11-24 · Branch: `main` (testar local antes do push)

## Por quê

- Clientes e equipe que perdem a senha hoje não têm como recuperar o acesso sozinhos.
- "Quero assinar" só abre o WhatsApp; a barbearia não tem uma lista de quem pediu.
  O cliente deve apenas demonstrar interesse e entrar numa fila visível no painel.
- Titulares querem agendar cortes para filho, cônjuge, irmão etc. pela própria conta.
  O plano de assinatura é único e intransferível: só cobre o titular.

## Contexto que restringe

- O `.env` local e a homologação apontam para o **Neon de produção**. Migrations só
  aditivas, via `prisma migrate deploy`, autorizadas pelo usuário (autorizada nesta).
- O banco já tem a tabela `PasswordResetToken` (migration fantasma, vazia) com
  `id, userId, tokenHash (unique), expiresAt, usedAt, createdAt`, FK para `users`
  com cascade e índice `(userId, expiresAt)`. Será mapeada no schema sem recriá-la.
- Pagamento online está desligado (`ONLINE_PAYMENT_REQUIRED = false`): cobranças
  são pagas na barbearia.
- Dois sistemas de login: clientes via cookie `auth-token` (`ClientAuthForm`),
  equipe via NextAuth (`/login`). Ambos validam `users.password` (bcrypt).

## 1. Esqueci a senha

- Link "Esqueci a senha" no `ClientAuthForm` (modo login) e no `/login`.
- Página `/esqueci-senha`: pede o e-mail. `POST /api/auth/forgot-password` sempre
  responde igual ("se houver conta, enviamos um link"), sem revelar se o e-mail existe.
- Elegível: usuário ativo e (`role` ≠ CLIENT ou `isRegistered`). Conta antiga
  não cadastrada não recebe link (deve usar "Criar conta").
- Token aleatório de 32 bytes; no banco só o SHA-256. Válido por 1 hora, uso único.
  Ao pedir um novo, os anteriores não usados do mesmo usuário são invalidados.
  Limite simples: no máximo 3 pedidos por usuário por hora.
- E-mail via Resend com link para `/redefinir-senha?token=...`.
- `POST /api/auth/reset-password` (token + nova senha, mín. 6 caracteres) troca a
  senha e marca o token como usado, numa transação. A pessoa é mandada ao login
  correspondente (cliente → `/minha-conta`, equipe → `/login`).

## 2. Fila de interesse em assinatura

- Tabela nova `SubscriptionInterest`: `clientId`, `status`
  (`waiting` | `converted` | `dismissed`), `createdAt`, `handledAt`, `handledById`.
- Minha Conta, sem assinatura: "Quero assinar" vira `POST /api/client/subscription-interest`
  (idempotente: se já há um `waiting`, devolve o mesmo). Depois mostra
  "Você está na fila — a barbearia vai entrar em contato" com a data do pedido.
- Aba **Assinaturas** do painel (ADMIN e BARBER): seção "Fila de interessados" em
  ordem de chegada, com nome, código, WhatsApp (link) e data.
  - **Criar assinatura**: preenche o formulário existente com o cliente; ao criar a
    assinatura com sucesso, o interesse vira `converted`.
  - **Descartar**: vira `dismissed`.
- Criar uma assinatura para o cliente por qualquer caminho também fecha o interesse
  `waiting` dele como `converted`.

## 3. Dependentes

- Tabela nova `Dependent`: `ownerId` (titular), `name`, `relationship`
  (`filho`, `conjuge`, `irmao`, `outro`), `isActive`, `createdAt`.
  Remover = `isActive=false` (preserva histórico de agendamentos).
- `Appointment` ganha `dependentId` (opcional, FK) e `dependentName` (cópia do nome
  no momento do agendamento, para histórico e relatórios).
- Minha Conta: seção "Dependentes" para adicionar, editar e remover.
  API: `GET/POST /api/client/dependents`, `PATCH/DELETE /api/client/dependents/[id]`.
- Agendamento: passo "Para quem é o corte?" com **Eu** + dependentes ativos + "Adicionar
  dependente" inline. Só aparece com cliente logado.
- Servidor (`POST /api/appointments`): `dependentId` precisa pertencer ao titular e estar
  ativo. Com dependente, a assinatura **não** se aplica: cobra como não assinante
  (hoje: pago na barbearia).
- Contato, e-mail de confirmação, cancelamento e Hub continuam do titular. O e-mail e o Hub
  dizem para quem é o corte.
- Painel/agenda (admin e barbeiro): nome exibido "João (dependente de Pedro Silva)".

## Abordagens consideradas (dependentes)

- **A. Tabela de dependentes ligada ao titular — escolhida.** Cadastro reutilizável,
  histórico por pessoa, regra de assinatura clara.
- B. Dependente como `User` filho — descartada: exige e-mail único/senha e polui a
  lista de clientes.
- C. Campo de texto livre no agendamento — descartada: não é "cadastrar dependente".

## Não-objetivos

- Dependente com login próprio, ou assinatura compartilhada/familiar.
- Verificação de e-mail no cadastro.
- Notificação ao barbeiro (e-mail/WhatsApp) quando alguém entra na fila.

## Migration

Uma migration aditiva: cria `SubscriptionInterest` e `Dependent`, adiciona
`dependentId`/`dependentName` em `Appointment` e cria `PasswordResetToken` com
`IF NOT EXISTS` (já existe em produção; cria em bancos novos).
