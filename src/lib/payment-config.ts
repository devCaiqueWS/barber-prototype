// Pagamento online obrigatório (Asaas) para quem não é assinante.
//
// Desligado nesta branch enquanto a integração com o Asaas não está configurada:
// o agendamento é confirmado na hora e o cliente paga na barbearia. O fluxo
// completo (checkout, reserva de 20 min, "Pagar agora", webhook) continua no código
// e está ativo na branch feat/pagamento-asaas. Para religar aqui, troque para true.
export const ONLINE_PAYMENT_REQUIRED = false
