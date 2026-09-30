import { redirect } from 'next/navigation'

// O pagamento acontece no checkout do Asaas; pendências ficam no Hub do cliente.
// (Esta rota tinha um formulário de cartão simulado, que não deve existir no site.)
export default function PagamentoPage() {
  redirect('/minha-conta')
}
