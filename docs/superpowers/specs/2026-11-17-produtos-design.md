# Produtos no painel e no agendamento — desenho

Data: 2026-11-17

## Intenção

A barbearia quer vender produtos junto com o agendamento. O admin cadastra os
produtos no painel, do mesmo jeito que cadastra serviços, e o cliente pode
incluí-los no agendamento depois de escolher o serviço, pagando tudo no mesmo
checkout.

## Objetivos

- Cadastro de produtos no painel: criar, editar, ativar/desativar, excluir.
- Passo opcional de produtos no agendamento, com quantidade.
- Um único pagamento no Asaas cobrindo serviço + produtos.
- Produtos visíveis onde o agendamento já aparece: e-mail de confirmação,
  Minha Conta e painel de agendamentos.

## Fora do escopo

- Controle de estoque.
- Venda de produto sem agendamento.
- Foto do produto.
- Relatórios de faturamento: continuam somando só serviços nesta rodada.

## O que não pode acontecer

- Valor cobrado vindo do navegador. Preço e total são sempre calculados no servidor.
- Mudança de preço de um produto alterar o valor de um agendamento já feito.
- Agendamento confirmado com pagamento menor que o total (serviço + produtos).

## Abordagens consideradas

1. **Itens de produto ligados ao agendamento (escolhida).** Nova tabela com
   produto, quantidade e preço unitário gravado na hora. O total do agendamento
   passa a ser serviço + itens, e o checkout, o "Pagar agora" e o webhook usam
   esse mesmo total. Reaproveita toda a lógica de reserva e pagamento que já
   existe. Limite: produto só é vendido junto com um agendamento.
2. **Pedido separado, com pagamento próprio.** Permitiria vender produto sem
   agendamento, mas cria um segundo checkout e um segundo caminho no webhook
   para algo que hoje ninguém pediu.
3. **Lista de produtos em um campo JSON do agendamento.** Menos tabelas, mas
   sem vínculo com o cadastro e ruim para consultar depois.

A 1 atende o pedido com o menor risco sobre o fluxo de pagamento.

## Desenho

**Banco** (migration nova, só adiciona):

- `Product`: id, name, description?, price, category?, isActive, createdAt.
- `AppointmentProduct`: id, appointmentId, productId, name (cópia), unitPrice
  (cópia), quantity. Apagado em cascata com o agendamento.

**Total a cobrar** — uma função única em `src/lib`, usada na criação, no
"Pagar agora" e no webhook:

    total = (serviço coberto por assinatura ? 0 : preço do serviço) + Σ (unitPrice × quantity)

"Coberto por assinatura" é o agendamento criado com `paymentMethod = 'assinatura'`.

**Regra do assinante** (decidida pelo cliente): se adicionar produtos, paga os
produtos online na hora. O agendamento fica aguardando pagamento com a mesma
reserva de 20 minutos; se não pagar, a reserva expira como qualquer outra. Sem
produtos, continua confirmado na hora, sem cobrança.

**API**

- `GET /api/products`: produtos ativos (público).
- `/api/admin/products` e `/api/admin/products/[id]`: mesmo contrato e mesmas
  de serviços, mas admin e barbeiro podem criar, editar e excluir. Excluir um produto já
  vendido apenas o desativa.
- `POST /api/appointments` aceita `products: [{ productId, quantity }]`.
  Valida que cada produto existe e está ativo, quantidade inteira de 1 a 10.
- Checkout do Asaas recebe um item por linha (serviço, quando cobrado, e cada
  produto com sua quantidade).
- Webhook compara o valor pago com o total, não mais só com o preço do serviço.

**Painel**

- Aba "Produtos" no painel (`/admin`), ao lado de "Serviços", com o componente
  `ProductsManagement` espelhando `ServicesManagement` (sem o campo duração).
  Admin e barbeiro podem criar, editar e excluir.
- Agenda do painel, tela de edição e página do barbeiro mostram os produtos de
  cada agendamento.

**Agendamento (cliente)**

- Novo passo "Adicionar produtos" entre horário e confirmação, com botões
  − / + por produto e "Continuar" (pode seguir sem nenhum). Se não houver
  produto ativo, o passo é pulado.
- A confirmação mostra serviço, produtos e total.

## Decisões minhas (não discutidas)

- Categorias de produto: Cabelo, Barba, Pele, Acessórios, Outros.
- Limite de 10 unidades por produto.
- Relatórios ficam para depois.

## Fica para quem implementa

- Aplicar a migration em produção (Neon) é um passo manual, à parte.
