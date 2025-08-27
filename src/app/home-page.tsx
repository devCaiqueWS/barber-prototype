import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scissors, Clock, Star, Users, Calendar, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header/Navigation */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm fixed w-full z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Scissors className="h-8 w-8 text-amber-500" />
            <span className="text-2xl font-bold text-white">BarberPro</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="#servicos" className="text-slate-300 hover:text-amber-500 transition-colors">
              Serviços
            </Link>
            <Link href="#sobre" className="text-slate-300 hover:text-amber-500 transition-colors">
              Sobre
            </Link>
            <Link href="#contato" className="text-slate-300 hover:text-amber-500 transition-colors">
              Contato
            </Link>
          </nav>
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link href="/agendamento">Agendar Agora</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Seu Estilo, Nossa <span className="text-amber-500">Paixão</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Transforme seu visual com os melhores barbeiros da cidade. 
            Agende online e tenha uma experiência única e profissional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-amber-600 hover:bg-amber-700 text-white">
              <Link href="/agendamento">
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Serviço
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-slate-600 text-white hover:bg-slate-800">
              <Link href="/servicos">
                Ver Serviços
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-slate-800/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Por que escolher a BarberPro?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Profissionais Qualificados</h3>
              <p className="text-slate-300">
                Nossa equipe é formada por barbeiros experientes e apaixonados pela arte.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Agendamento Online</h3>
              <p className="text-slate-300">
                Sistema inteligente que facilita seu agendamento a qualquer hora do dia.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Ambiente Seguro</h3>
              <p className="text-slate-300">
                Seguimos todos os protocolos de higiene e segurança para seu bem-estar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section id="servicos" className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Nossos Serviços
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Corte Tradicional", price: "R$ 25", duration: "30 min" },
              { name: "Barba Completa", price: "R$ 20", duration: "25 min" },
              { name: "Corte + Barba", price: "R$ 40", duration: "50 min" },
              { name: "Tratamento Capilar", price: "R$ 35", duration: "40 min" },
            ].map((service, index) => (
              <div key={index} className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-amber-500 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <Scissors className="h-6 w-6 text-amber-500" />
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{service.name}</h3>
                <div className="flex justify-between items-center text-slate-300 mb-4">
                  <span className="text-xl font-bold text-amber-500">{service.price}</span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {service.duration}
                  </span>
                </div>
                <Button className="w-full bg-amber-600 hover:bg-amber-700" asChild>
                  <Link href="/agendamento">Agendar</Link>
                </Button>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild className="border-slate-600 text-white hover:bg-slate-800">
              <Link href="/servicos">Ver Todos os Serviços</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-amber-600 to-amber-700">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para um Novo Visual?
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Agende seu horário agora e garante o melhor atendimento.
          </p>
          <Button size="lg" asChild className="bg-white text-amber-700 hover:bg-slate-100">
            <Link href="/agendamento">
              <Calendar className="mr-2 h-5 w-5" />
              Fazer Agendamento
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Scissors className="h-6 w-6 text-amber-500" />
            <span className="text-xl font-bold text-white">BarberPro</span>
          </div>
          <p className="text-slate-400 mb-4">
            © 2025 BarberPro. Todos os direitos reservados.
          </p>
          <div className="flex justify-center space-x-6">
            <Link href="/admin" className="text-slate-400 hover:text-amber-500 transition-colors text-sm">
              Área Administrativa
            </Link>
            <Link href="/cliente" className="text-slate-400 hover:text-amber-500 transition-colors text-sm">
              Área do Cliente
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
