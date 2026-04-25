"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import MenuMobile from "@/components/MenuMobile";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [services, setServices] = useState<
    Array<{ id: string; name: string; price: number; duration: number; description?: string }>
  >([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch("/api/services");
        if (!res.ok) throw new Error("Falha ao carregar serviços");
        const data = await res.json();
        setServices(Array.isArray(data?.services) ? data.services : []);
      } catch (e) {
        console.error("Erro ao buscar serviços na home:", e);
        setServices([]);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="premium-shell min-h-screen overflow-hidden text-white">
      <header className="sticky top-0 z-40 bg-[#070606]">
        <div className="container flex items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div>
              <span className="brand-wordmark block text-3xl font-bold leading-none text-primary md:text-4xl">
                Elemento.
              </span>
              <span className="text-[10px] uppercase tracking-[0.32em] text-white/55">
                Estúdio e Barbearia
              </span>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/servicos" className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70 hover:text-primary">
              Serviços
            </Link>
            <Link href="/sobre" className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70 hover:text-primary">
              Sobre
            </Link>
            <Link href="/contato" className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70 hover:text-primary">
              Contato
            </Link>
          </nav>
          <div className="hidden md:block">
            <Button asChild>
              <Link href="/agendamento">Agendar agora</Link>
            </Button>
          </div>
          <div className="md:hidden">
            <MenuMobile open={menuOpen} setOpen={setMenuOpen} />
          </div>
        </div>
      </header>

      <main className={menuOpen ? "blur-sm transition" : "transition"}>
        <section className="px-4 py-16 md:py-24">
          <div className="container grid items-stretch gap-10 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="flex flex-col justify-center">
              <div className="brand-kicker mb-5">Preto, vermelho e presença.</div>
              <h1 className="max-w-4xl text-5xl font-bold leading-[0.94] md:text-7xl">
                Barbearia clássica com presença digital de alto padrão.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-white/70 md:text-xl">
                Um sistema direto, escuro e sólido para agendar serviços e reforçar a identidade da Elemento Estúdio e Barbearia.
              </p>
              <div className="red-rule mt-7" />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/agendamento">
                    Agendar serviço
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/servicos">Ver serviços</Link>
                </Button>
              </div>
            </div>

            <div className="editorial-grid hidden min-h-[520px] lg:grid">
              <div className="editorial-tile tile-black col-span-2 items-center">
                <div>
                  <div className="tile-type text-4xl text-primary">Elemento</div>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-primary">
                    Estúdio e Barbearia
                  </p>
                </div>
              </div>
              <div className="editorial-tile tile-red col-span-1 items-center justify-center">
                <div className="tile-type rotate-[-90deg] text-4xl">Elemento</div>
              </div>
              <div className="editorial-tile tile-photo col-span-2 items-end">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                  Corte. Barba. Presença.
                </p>
              </div>
              <div className="editorial-tile tile-photo col-span-1 row-span-2 items-end">
                <p className="tile-type text-2xl text-primary">Clássica.</p>
              </div>
              <div className="editorial-tile tile-white col-span-2 items-end">
                <div className="tile-type text-3xl">
                  Elemento
                  <br />
                  Elemento
                  <br />
                  Elemento
                </div>
              </div>
              <div className="editorial-tile tile-red col-span-1 items-center justify-center">
                <div className="tile-type text-3xl">
                  Ele
                  <br />
                  men
                  <br />
                  to
                </div>
              </div>
              <div className="editorial-tile tile-black col-span-1 items-end">
                <div className="tile-type text-3xl text-primary">
                  Forte.
                  <br />
                  Direta.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="container grid gap-4 md:grid-cols-3">
            {[
              { title: "Profissionais qualificados", text: "Equipe preparada para um atendimento preciso e consistente." },
              { title: "Agenda inteligente", text: "Escolha serviço, barbeiro, data e horário em poucos passos." },
              { title: "Operação confiável", text: "Fluxos simples para cliente e gestão robusta para a barbearia." },
            ].map((feature) => (
              <div key={feature.title} className="premium-card p-6 transition hover:border-primary/40">
                <div className="mb-5 h-2 w-14 bg-primary" />
                <h3 className="text-2xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm text-white/65">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="servicos" className="px-4 py-14">
          <div className="container">
            <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="brand-kicker mb-3">Serviços</div>
                <h2 className="text-4xl font-bold md:text-5xl">Escolha o próximo ritual</h2>
              </div>
              <Button variant="outline" asChild>
                <Link href="/servicos">Ver todos</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {loadingServices && [0, 1, 2, 3].map((item) => (
                <div key={item} className="premium-card h-48 animate-pulse" />
              ))}
              {!loadingServices && services.slice(0, 4).map((service) => (
                <div key={service.id} className="premium-card flex min-h-56 flex-col p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Elemento</span>
                    <span className="bg-white/10 px-3 py-1 text-xs text-white/70">
                      {service.duration} min
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold">{service.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-white/55">
                    {service.description || "Serviço profissional executado com excelência."}
                  </p>
                  <div className="mt-auto pt-6">
                    <div className="mb-4 text-2xl font-bold text-primary">{formatCurrency(service.price)}</div>
                    <Button className="w-full" asChild>
                      <Link href={`/agendamento?service=${service.id}`}>Agendar</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {!loadingServices && services.length === 0 && (
                <div className="premium-card col-span-full p-8 text-center text-white/60">
                  Nenhum serviço disponível no momento.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="container">
            <div className="grid md:grid-cols-[0.7fr_1.3fr]">
              <div className="tile-red p-8 md:p-12">
                <div className="mb-5 h-2 w-16 bg-black" />
                <h2 className="tile-type text-4xl md:text-5xl">Agende.</h2>
              </div>
              <div className="tile-black p-8 md:p-12">
                <h2 className="text-4xl font-bold md:text-5xl">Pronto para elevar o padrão?</h2>
                <p className="mt-4 max-w-2xl text-white/68">
                  Agende seu horário e viva uma experiência alinhada à presença da marca Elemento.
                </p>
                <Button className="mt-8" size="lg" asChild>
                  <Link href="/agendamento">Fazer agendamento</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0d0b0b] px-4 py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <div>
            <div className="brand-wordmark text-xl font-bold">Elemento Estúdio e Barbearia</div>
            <p className="text-sm text-white/48">© 2026 Todos os direitos reservados.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold uppercase tracking-[0.18em] text-white/52 hover:text-primary">
            Área administrativa
          </Link>
        </div>
      </footer>
    </div>
  );
}
