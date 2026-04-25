import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SobrePage() {
  return (
    <div className="premium-shell min-h-screen text-white">
      <header className="bg-[#070606]">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="text-white/70 hover:text-primary">
              <Link href="/" aria-label="Voltar">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <span className="brand-wordmark text-3xl font-bold text-primary md:text-4xl">Elemento.</span>
          </div>
          <Button asChild>
            <Link href="/agendamento">Agendar agora</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 md:py-14">
        <section className="editorial-grid min-h-[420px]">
          <div className="editorial-tile tile-black col-span-3 items-center">
            <div>
              <div className="brand-kicker mb-4">Nossa essência</div>
              <h1 className="max-w-3xl text-5xl font-bold leading-[0.9] md:text-7xl">
                Barbearia séria, profissional e clássica.
              </h1>
            </div>
          </div>
          <div className="editorial-tile tile-red col-span-2 items-center justify-center">
            <div className="tile-type text-5xl md:text-7xl">Elemento</div>
          </div>
          <div className="editorial-tile tile-photo col-span-2 items-end">
            <p className="text-sm font-semibold uppercase tracking-[0.18em]">Atendimento premium</p>
          </div>
          <div className="editorial-tile tile-white col-span-3 items-end">
            <p className="max-w-xl text-lg leading-relaxed">
              A Elemento une tecnologia de agendamento com uma experiência visual forte, masculina e direta.
            </p>
          </div>
        </section>

        <section className="mt-8 grid sm:grid-cols-2 md:grid-cols-3">
          {[
            {
              title: "Equipe especializada",
              text: "Barbeiros experientes, atentos ao acabamento e à consistência de cada atendimento.",
            },
            {
              title: "Agenda inteligente",
              text: "Horários organizados para reduzir atraso e manter o fluxo da barbearia preciso.",
            },
            {
              title: "Ambiente confiável",
              text: "Atendimento objetivo, visual sólido e experiência pensada para alto padrão.",
            },
          ].map((item, index) => (
            <div key={item.title} className={index === 1 ? "solid-red p-7" : "premium-card p-7"}>
              <div className={index === 1 ? "mb-6 h-2 w-14 bg-[#0d0b0b]" : "mb-6 h-2 w-14 bg-primary"} />
              <h2 className="text-3xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm opacity-70">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid md:grid-cols-[1fr_1fr]">
          <div className="solid-white p-8 md:p-10">
            <h2 className="tile-type text-4xl md:text-5xl">Conheça.</h2>
          </div>
          <div className="solid-black p-8 md:p-10">
            <p className="mb-6 text-white/70">
              Agende online e viva a experiência Elemento no próximo atendimento.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/agendamento">Agendar serviço</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contato">Ver contatos</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
