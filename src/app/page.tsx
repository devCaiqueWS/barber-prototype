"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import MenuMobile from "@/components/MenuMobile";
import { Scissors, Clock, Star, Users, Calendar, Shield } from "lucide-react";

export default function Home() {

  const [menuOpen, setMenuOpen] = useState(false);

  const [services, setServices] = useState<Array<{ id: string; name: string; price: number; duration: number; description?: string }>>([])
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services')
        if (!res.ok) throw new Error('Falha ao carregar serviços')
        const data = await res.json()
        setServices(Array.isArray(data?.services) ? data.services : [])
      } catch (e) {
        console.error('Erro ao buscar serviços na home:', e)
        setServices([])
      } finally {
        setLoadingServices(false)
      }
    }
    fetchServices()
  }, [])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="min-h-screen bg-[#1F1F1F] flex flex-col items-center justify-start">
      {/* Header/Navigation */}
      <header className="w-full px-4 py-4 bg-[#1F1F1F]/80 backdrop-blur-md shadow-lg rounded-b-2xl mb-8">
        <div className="container flex justify-between items-center mx-auto">
          <div className="flex items-center gap-3">
            <Scissors className="h-8 w-8 text-amber-500" />
            <span className="text-3xl font-extrabold text-white tracking-tight">JM Barbearia</span>
          </div>
          <nav className="hidden md:flex gap-8">
            <Link href="/servicos" className="no-underline text-lg text-slate-300 hover:text-amber-500 font-medium transition-colors">Serviços</Link>
            <Link href="/sobre" className="no-underline text-lg text-slate-300 hover:text-amber-500 font-medium transition-colors">Sobre</Link>
            <Link href="/contato" className="no-underline text-lg text-slate-300 hover:text-amber-500 font-medium transition-colors">Contato</Link>
          </nav>
          <div className="md:hidden">
            <MenuMobile open={menuOpen} setOpen={setMenuOpen} />
          </div>
          <Button asChild className="no-underline bg-amber-500 hover:bg-amber-700 text-white font-bold px-6 py-2 rounded-lg shadow-md transition-all hidden md:block">
            <Link href="/agendamento">Agendar Agora</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-10 pb-10 px-2 w-full">
        <div className="container mx-auto text-center flex flex-col items-center justify-center">
          <h1 className={`text-3xl md:text-5xl font-extrabold text-white mb-6 drop-shadow-lg transition-all duration-300 ${menuOpen ? 'blur-sm opacity-40' : ''}`}>
            Seu Estilo, <span className="text-amber-500">Nossa Missão</span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Transforme seu visual com os melhores barbeiros da cidade.<br />Agende online e tenha uma experiência única e profissional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center w-full">
            <Button asChild className="no-underline bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 md:px-8 md:py-4 rounded-xl shadow-lg text-base md:text-lg flex items-center gap-2 transition-all w-full sm:w-auto">
              <Link href="/agendamento">
                <Calendar className="mr-2 h-6 w-6" />
                Agendar Serviço
              </Link>
            </Button>
            <Button variant="outline" asChild className="no-underline border-2 border-amber-500 text-white hover:bg-amber-500 hover:text-slate-900 font-bold px-6 py-3 md:px-8 md:py-4 rounded-xl shadow-lg text-base md:text-lg flex items-center gap-2 transition-all w-full sm:w-auto">
              <Link href="/servicos">
                Ver Serviços
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-10 pb-10 px-2 w-full bg-[#3D3D3D]/60 rounded-xl shadow-lg">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white text-center mb-8 md:mb-12">Por que escolher a JM Barbearia?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <div className="text-center p-4 md:p-6 rounded-xl bg-[#3D3D3D] shadow-md hover:scale-105 transition-transform">
              <div className="bg-amber-500 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Profissionais Qualificados</h3>
              <p className="text-slate-300 text-base md:text-lg">Nossa equipe é formada por barbeiros experientes e apaixonados pela arte.</p>
            </div>
            <div className="text-center p-4 md:p-6 rounded-xl bg-[#3D3D3D] shadow-md hover:scale-105 transition-transform">
              <div className="bg-amber-500 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Agendamento Online</h3>
              <p className="text-slate-300 text-base md:text-lg">Sistema inteligente que facilita seu agendamento a qualquer hora do dia.</p>
            </div>
            <div className="text-center p-4 md:p-6 rounded-xl bg-[#3D3D3D] shadow-md hover:scale-105 transition-transform">
              <div className="bg-amber-500 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Ambiente Seguro</h3>
              <p className="text-slate-300 text-base md:text-lg">Seguimos todos os protocolos de higiene e segurança para seu bem-estar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section id="servicos" className="py-10 px-2 w-full">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8 md:mb-12">Nossos Serviços</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {loadingServices && (
              <>
                {[0,1,2,3].map((i) => (
                  <div key={i} className="bg-[#3D3D3D] rounded-lg p-4 md:p-6 border border-[#1F1F1F] animate-pulse h-40" />
                ))}
              </>
            )}
            {!loadingServices && services.slice(0,4).map((service) => (
              <div key={service.id} className="bg-[#3D3D3D] rounded-lg p-4 md:p-6 border border-[#1F1F1F] hover:border-amber-500 transition-colors flex flex-col gap-2">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <Scissors className="h-6 w-6 text-amber-500" />
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
                <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">{service.name}</h3>
                <div className="flex justify-between items-center text-slate-300 mb-2 md:mb-4">
                  <span className="text-lg md:text-xl font-bold text-amber-500">{formatCurrency(service.price)}</span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {service.duration} min
                  </span>
                </div>
                <Button className="w-full no-underline text-white bg-amber-600 hover:bg-amber-700 text-xs md:text-base" asChild>
                  <Link href="/agendamento">Agendar</Link>
                </Button>
              </div>
            ))}
            {!loadingServices && services.length === 0 && (
              <div className="col-span-full text-center text-slate-400">Nenhum servi��o dispon��vel</div>
            )}
          </div>
          <div className="text-center mt-6 md:mt-8">
            <Button variant="outline" size="lg" asChild className="no-underline border-slate-600 text-white hover:bg-[#3D3D3D]">
              <Link href="/servicos">Ver Todos os Serviços</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="w-full py-10 px-20 bg-amber-500">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para um novo corte?
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Agende seu horário agora e garante o melhor atendimento.
          </p>
          <Button size="lg" asChild className="no-underline bg-white text-black hover:bg-slate-100">
            <Link href="/agendamento">
              <Calendar className="mr-2 h-5 w-5" />
              Fazer Agendamento
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1F1F1F] border-t border-[#3D3D3D] py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Scissors className="h-6 w-6 text-amber-500" />
            <span className="text-xl font-bold text-white">JM Barbearia</span>
          </div>
          <p className="text-slate-400 mb-4">
            © 2025 JM Barbearia. Todos os direitos reservados.
          </p>
          <div className="flex justify-center space-x-6">
            <Link href="/admin" className="underline-offset-4 text-slate-400 hover:text-amber-500 transition-colors text-sm">
              Área Administrativa
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
