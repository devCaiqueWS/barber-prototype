'use client';

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, ArrowLeft, MessageCircle } from "lucide-react";

export default function ContatoPage() {
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
            <Link className="text-white no-underline hover:no-underline" href="/agendamento">Agendar Agora</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-10 space-y-8 md:space-y-10">
        {/* Title */}
        <section className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Fale com a <span className="text-amber-500">JM Barbearia</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            Tire suas dúvidas, faça orçamentos ou envie feedback. Estamos
            sempre prontos para te atender.
          </p>
        </section>

        {/* Info + Form */}
        <section className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Contact info */}
          <div className="space-y-4 bg-[#3D3D3D] rounded-lg p-6 border border-[#1F1F1F]">
            <h2 className="text-2xl font-semibold mb-2">Informações de contato</h2>
            <p className="text-slate-300 mb-4">
              Use um dos canais abaixo para falar diretamente com a equipe da
              barbearia.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-amber-500" />
                <span className="text-slate-200">(11) 99999-9999</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-amber-500" />
                <span className="text-slate-200">WhatsApp: (11) 99999-9999</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-500" />
                <span className="text-slate-200">
                  contato@barberpro.com.br
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-amber-500" />
                <span className="text-slate-200">
                  Rua Exemplo, 123 - Centro, São Paulo - SP
                </span>
              </div>
            </div>
          </div>

          {/* Simple contact form (sem backend) */}
          <div className="bg-[#3D3D3D] rounded-lg p-6 border border-[#1F1F1F]">
            <h2 className="text-2xl font-semibold mb-4">Envie uma mensagem</h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Mensagem enviada! Em breve entraremos em contato.");
              }}
            >
              <div>
                <label className="block text-sm mb-1 text-slate-200">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-200">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-200">
                  Mensagem
                </label>
                <textarea
                  rows={4}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                Enviar Mensagem
              </Button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
