"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ContatoPage() {
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
        <section className="grid md:grid-cols-[0.9fr_1.1fr]">
          <div className="solid-red flex items-center p-8 md:p-12">
            <h1 className="tile-type text-5xl md:text-7xl">
              Contato
              <br />
              Direto.
            </h1>
          </div>
          <div className="solid-black p-8 md:p-12">
            <div className="brand-kicker mb-4">Elemento Estúdio e Barbearia</div>
            <p className="max-w-2xl text-lg text-white/70">
              Tire dúvidas, faça orçamento ou fale com a equipe. A comunicação é objetiva, como a marca.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-0 md:grid-cols-3">
          {[
            { title: "WhatsApp", text: "(11) 97547-1336" },
            { title: "Instagram", text: "@ogabrieldocorte" },
            { title: "Endereço", text: "R. Angelo Jane, 160 - Bussocaba, Osasco - SP" },
          ].map((item, index) => (
            <div key={item.title} className={index === 1 ? "solid-white p-7" : "premium-card p-7"}>
              <div className="mb-6 h-2 w-12 bg-primary" />
              <h2 className="text-3xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm opacity-70">{item.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
