# Contas de cliente, pagamento obrigatório e assinaturas — design

Data: 2026-09-30 · Branch: `users`

## Objetivo

Todo agendamento feito pelo site vem de uma conta identificada. Quem não é assinante paga
antes de o horário ser confirmado. Assinantes agendam sem pagar. O cliente acompanha tudo
num Hub (`/minha-conta`). O pagamento via Asaas funciona de ponta a ponta sem intervenção.

## O que o usuário pediu × decisões

| Pedido | Decisão |
|---|---|
| ID para cada usuário | Já existe `id` (uuid). Adiciona `clientCode` (inteiro sequencial, exibido como `#000123`) para identificar o cliente no balcão, no Hub e no painel. |
| Login/cadastro obrigatório | Já existe (`/api/appointments` exige cookie `auth-token`). Mantido. |
| Pagamento obrigatório para não assinantes | Agendamento online de não assinante nasce `awaiting_payment` com reserva de 20 min; checkout Asaas criado **no servidor**. Opção "pagar no local" sai do site. Agendamentos criados pelo admin/barbeiro continuam sem cobrança (o barbeiro decide). |
| Quem é assinante | Opção C: `Subscription` com `status = 'active'` e `clientId` do usuário. Status sincronizado pelo webhook do Asaas; admin pode criar assinatura manual (sem Asaas, ex.: paga em dinheiro) e ativar/desativar. |
| Hub do cliente | Evolui `/minha-conta`. |

## Pagamento de agendamento

- **Mecanismo:** Asaas Checkout (`POST /v3/checkouts`), `billingTypes: [PIX, CREDIT_CARD]` (sem boleto — compensação lenta demais para segurar horário), `chargeTypes: [DETACHED]`, `minutesToExpire: 15`, `callback` → `/minha-conta?pagamento=sucesso|cancelado|expirado`, `externalReference` = id do agendamento, `customerData` pré-preenchido com nome/e-mail/telefone/CPF.
- **Valor** sempre lido de `Service.price` no servidor. A rota antiga que aceitava `amount` do navegador é substituída.
- **Reserva:** `Appointment.paymentExpiresAt = now + 20 min` (5 min de folga sobre o checkout). Enquanto não expira, o horário fica bloqueado. Depois, deixa de contar para conflito e disponibilidade (filtro compartilhado em `src/lib/appointment-status.ts`) e é marcado `expired` preguiçosamente nas leituras.
- **Webhook:** reconhece `CHECKOUT_PAID` (por `checkout.id`) e `PAYMENT_CONFIRMED/RECEIVED` (por `externalReference`, `checkoutSession` ou link legado). Confere se o valor pago ≥ preço do serviço. Pagamento que chega depois da expiração: confirma se o horário continua livre; se outro cliente já ocupou, marca `payment_conflict` para o admin resolver (estorno manual) e registra em log.
- **Retomar pagamento:** Hub mostra "Pagar agora" enquanto a reserva vale; reaproveita o checkout ativo ou cria outro.
- **E-mail de confirmação** só sai quando o agendamento fica confirmado (webhook ou assinante), nunca no `awaiting_payment`.

## Assinaturas

- Rotas `/api/admin/subscriptions*` passam a exigir sessão ADMIN (hoje estão abertas).
- Status gravado em minúsculo (`pending`, `active`, `overdue`, `cancelled`). Assinatura Asaas nasce `pending`; vira `active` no primeiro pagamento confirmado.
- Webhook: pagamento com `payment.subscription` → atualiza a `Subscription` (`active` + `lastPaymentAt`; `PAYMENT_OVERDUE` → `overdue`). Eventos `SUBSCRIPTION_DELETED`/`SUBSCRIPTION_INACTIVATED` → `cancelled`.
- Asaas exige CPF/CNPJ para criar cliente: `User.cpf` (opcional) + campo CPF no formulário de assinatura; cliente também pode informar no Hub.
- Assinatura manual (`provider = 'manual'`): admin cria sem Asaas, ativa/desativa.

## Hub do cliente (`/minha-conta`)

- Código do cliente, dados de contato editáveis (nome, WhatsApp, CPF).
- Cartão de assinatura (status, valor, ciclo, último pagamento).
- Próximos agendamentos com status de pagamento; "Pagar agora" com contagem regressiva.
- Cancelar agendamento pelo próprio cliente até 2 h antes quando não houve pagamento online (assinante ou reserva não paga). Pago → orientação para WhatsApp (estorno é manual).
- Histórico (últimos 20).
- Aviso de retorno do checkout (`?pagamento=`).

## Modelo de dados (migration `20260930120000_payments_and_client_hub`)

- `users`: `clientCode SERIAL UNIQUE`, `cpf TEXT NULL`.
- `Appointment`: `asaasCheckoutId TEXT NULL` (indexado), `paymentExpiresAt TIMESTAMP NULL`, `amountPaid DOUBLE NULL`.
- `Subscription`: `provider TEXT DEFAULT 'asaas'`, `lastPaymentAt TIMESTAMP NULL`, índice em `asaasSubscriptionId`; normaliza status existentes para minúsculo.

Novos status de agendamento: `awaiting_payment`, `expired`, `payment_conflict`.

## Fora do escopo (sugestões futuras)

Remarcação pelo cliente, estorno automático via API, lembrete por WhatsApp/e-mail antes do horário,
programa de fidelidade, avaliação pós-atendimento, "agendar de novo" com um clique.

## Verificação

Não há suíte de testes no projeto. Cada etapa: `tsc --noEmit` sem erros novos, `next build`,
SQL da migration conferido com `prisma migrate diff` (schema antigo → novo). Fluxo do Asaas
só pode ser testado de ponta a ponta com chave sandbox + webhook público (pendência do usuário).

## Ordem dos commits

1. Spec (este documento)
2. Schema + migration + helper de status/reserva
3. Checkout Asaas no servidor + agendamento com pagamento obrigatório + disponibilidade respeitando reserva
4. Webhook (checkout, valor, assinaturas, pagamento tardio)
5. Assinaturas: auth, status, CPF, assinatura manual
6. Hub do cliente + APIs (perfil, pagar, cancelar)
7. Painel admin: código do cliente, novos status
