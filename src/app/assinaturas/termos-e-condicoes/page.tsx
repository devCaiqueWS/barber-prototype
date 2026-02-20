import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermosECondicoesAssinaturasPage() {
  return (
    <div className="min-h-screen bg-[#1F1F1F] text-white">
      <header className="border-b border-[#3D3D3D] bg-[#1F1F1F]/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-slate-300 hover:text-amber-500"
            >
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Image
                src="/icon.svg"
                alt="JM Barbearia"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-2xl font-bold text-white">JM Barbearia</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-10">
        <section className="max-w-4xl mx-auto bg-[#3D3D3D] rounded-lg p-6 md:p-8 border border-[#1F1F1F]">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">
            Termos de Uso - Plano Mensal Basico
          </h1>

          <div className="space-y-6 text-slate-200">
            <p>
              Ao contratar o Plano Mensal Basico da JM Barbearia, voce concorda com as
              condicoes abaixo:
            </p>

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">1. Uso pessoal</h2>
              <p>O plano e individual e intransferivel. Nao pode ser utilizado por outra pessoa.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">2. Validade</h2>
              <p>
                O plano tem duracao de 30 dias corridos, contados a partir da data de
                confirmacao do pagamento.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">3. Renovacao</h2>
              <p>O plano nao e acumulativo.</p>
              <p>
                Servicos nao utilizados dentro do periodo de 30 dias nao serao transferidos
                para o mes seguinte.
              </p>
              <p>A renovacao pode ser feita:</p>
              <p>Manualmente via PIX;</p>
              <p>Automaticamente, caso esteja cadastrado no debito recorrente.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">4. Atendimento sem renovacao</h2>
              <p>
                Caso o plano esteja vencido no dia do atendimento, o servico sera cobrado
                pelo valor integral avulso vigente.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">5. Agendamento obrigatorio</h2>
              <p>Os atendimentos devem ser agendados previamente pelo link oficial:</p>
              <p className="mt-2">
                <a
                  href="https://www.jmbarbearia.online"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 underline"
                >
                  www.jmbarbearia.online
                </a>
              </p>
              <p>A disponibilidade depende da agenda da barbearia.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">6. Alteracoes no plano</h2>
              <p>
                A JM Barbearia pode atualizar precos, termos ou condicoes, comunicando com
                minimo de 30 dias de antecedencia.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
