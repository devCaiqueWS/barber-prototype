import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermosECondicoesAssinaturasPage() {
  return (
    <div className="premium-shell min-h-screen text-white">
      <header className="bg-[#070606]">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="text-white/70 hover:text-primary">
              <Link href="/admin" aria-label="Voltar">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <span className="brand-wordmark text-3xl font-bold text-primary md:text-4xl">Elemento.</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 md:py-14">
        <section className="grid md:grid-cols-[0.75fr_1.25fr]">
          <div className="solid-red p-8 md:p-10">
            <h1 className="tile-type text-4xl md:text-6xl">
              Termos
              <br />
              Plano
              <br />
              Mensal.
            </h1>
          </div>

          <div className="solid-black p-6 md:p-10">
            <div className="space-y-6 text-white/78">
              <p>
                Ao contratar o Plano Mensal Básico da Elemento Estúdio e Barbearia, você concorda com as condições abaixo:
              </p>

              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">1. Uso pessoal</h2>
                <p>O plano é individual e intransferível. Não pode ser utilizado por outra pessoa.</p>
              </div>

              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">2. Validade</h2>
                <p>O plano tem duração de 30 dias corridos, contados a partir da confirmação do pagamento.</p>
              </div>

              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">3. Renovação</h2>
                <p>O plano não é acumulativo. Serviços não utilizados dentro do período não serão transferidos para o mês seguinte.</p>
                <p>A renovação pode ser feita manualmente via PIX ou automaticamente no débito recorrente.</p>
              </div>

              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">4. Atendimento sem renovação</h2>
                <p>Caso o plano esteja vencido no dia do atendimento, o serviço será cobrado pelo valor integral avulso vigente.</p>
              </div>

              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">5. Agendamento obrigatório</h2>
                <p>Os atendimentos devem ser agendados previamente pelo link oficial da Elemento.</p>
              </div>

              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">6. Alterações no plano</h2>
                <p>A Elemento Estúdio e Barbearia pode atualizar preços, termos ou condições, comunicando com mínimo de 30 dias de antecedência.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
