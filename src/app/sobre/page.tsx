import Link from "next/link";
import Image from "next/image";
import { Users, Clock, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-[#1F1F1F] text-white">
      {/* Header */}
      <header className="border-b border-[#3D3D3D] bg-[#1F1F1F]/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-slate-300 hover:text-amber-500"
            >
              <Link href="/">
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
              <span className="text-2xl font-bold text-white">
                JM Barbearia
              </span>
            </div>
          </div>
          <Button asChild className="bg-amber-500 hover:bg-amber-700">
            <Link href="/agendamento">Agendar Agora</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-10 space-y-10 md:space-y-12">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Sobre a <span className="text-amber-500">JM Barbearia</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
            A JM Barbearia nasceu para simplificar a rotina da barbearia
            moderna, unindo atendimento de alto nível com tecnologia de
            agendamento online rápida e intuitiva.
          </p>
        </section>

        {/* Info blocks */}
        <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-[#3D3D3D] rounded-lg p-6 border border-[#1F1F1F] space-y-3">
            <Users className="h-8 w-8 text-amber-500" />
            <h2 className="text-xl font-semibold">Equipe Especializada</h2>
            <p className="text-slate-300 text-sm">
              Barbeiros experientes, atualizados com as últimas tendências e
              focados em entregar uma experiência diferenciada em cada
              atendimento.
            </p>
          </div>
          <div className="bg-[#3D3D3D] rounded-lg p-6 border border-[#1F1F1F] space-y-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <h2 className="text-xl font-semibold">Agendamento Inteligente</h2>
            <p className="text-slate-300 text-sm">
              Sistema de horários que respeita a duração de cada serviço,
              evitando atrasos e garantindo melhor aproveitamento da agenda.
            </p>
          </div>
          <div className="bg-[#3D3D3D] rounded-lg p-6 border border-[#1F1F1F] space-y-3">
            <Shield className="h-8 w-8 text-amber-500" />
            <h2 className="text-xl font-semibold">Ambiente Confortável</h2>
            <p className="text-slate-300 text-sm">
              Espaço pensado para que o cliente relaxe, com atendimento
              atencioso e foco total na qualidade de cada detalhe.
            </p>
          </div>
        </section>

        {/* Call to action */}
        <section className="bg-[#3D3D3D] rounded-lg p-8 border border-[#1F1F1F] text-center">
          <h2 className="text-2xl font-bold mb-3">
            Quer conhecer melhor nossa barbearia?
          </h2>
          <p className="text-slate-300 mb-6">
            Fale com a gente pelo WhatsApp ou faça seu agendamento online e
            venha viver a experiência JM Barbearia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-amber-600 hover:bg-amber-700">
              <Link href="/agendamento">Agendar Serviço</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <Link href="/contato">Ver Contatos</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
