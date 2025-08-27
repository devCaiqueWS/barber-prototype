import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scissors, Clock, ArrowLeft, Star } from "lucide-react";

const services = [
  {
    id: 1,
    name: "Corte Tradicional",
    description: "Corte clássico com acabamento profissional",
    price: 25,
    duration: 30,
    category: "hair",
    image: "/placeholder-service.jpg",
    popular: false,
  },
  {
    id: 2,
    name: "Corte Moderno",
    description: "Cortes modernos e estilosos para o homem contemporâneo",
    price: 35,
    duration: 40,
    category: "hair",
    image: "/placeholder-service.jpg",
    popular: true,
  },
  {
    id: 3,
    name: "Barba Completa",
    description: "Aparar, desenhar e finalizar com produtos premium",
    price: 20,
    duration: 25,
    category: "beard",
    image: "/placeholder-service.jpg",
    popular: false,
  },
  {
    id: 4,
    name: "Barba + Bigode",
    description: "Cuidado completo da barba e bigode com styling",
    price: 30,
    duration: 35,
    category: "beard",
    image: "/placeholder-service.jpg",
    popular: false,
  },
  {
    id: 5,
    name: "Corte + Barba",
    description: "Combo completo: corte + barba com desconto especial",
    price: 40,
    duration: 50,
    category: "combo",
    image: "/placeholder-service.jpg",
    popular: true,
  },
  {
    id: 6,
    name: "Combo Premium",
    description: "Corte + Barba + Tratamento + Relaxamento",
    price: 60,
    duration: 70,
    category: "combo",
    image: "/placeholder-service.jpg",
    popular: false,
  },
  {
    id: 7,
    name: "Tratamento Capilar",
    description: "Hidratação e tratamento especializado para cabelos",
    price: 35,
    duration: 40,
    category: "treatment",
    image: "/placeholder-service.jpg",
    popular: false,
  },
  {
    id: 8,
    name: "Relaxamento",
    description: "Massagem relaxante no couro cabeludo e pescoço",
    price: 25,
    duration: 20,
    category: "treatment",
    image: "/placeholder-service.jpg",
    popular: false,
  },
];

const categories = [
  { id: "all", name: "Todos os Serviços" },
  { id: "hair", name: "Cortes de Cabelo" },
  { id: "beard", name: "Barba" },
  { id: "combo", name: "Combos" },
  { id: "treatment", name: "Tratamentos" },
];

export default function ServicosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild className="text-slate-300 hover:text-amber-500">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Scissors className="h-8 w-8 text-amber-500" />
              <span className="text-2xl font-bold text-white">BarberPro</span>
            </div>
          </div>
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link href="/agendamento">Agendar Agora</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Nossos <span className="text-amber-500">Serviços</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Escolha entre nossa variedade de serviços profissionais, 
            executados pelos melhores barbeiros da cidade.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={category.id === "all" ? "default" : "outline"}
              className={
                category.id === "all"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "border-slate-600 text-slate-300 hover:bg-slate-800"
              }
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {services.map((service) => (
            <div key={service.id} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20">
              {/* Service Image Placeholder */}
              <div className="h-48 bg-slate-700 flex items-center justify-center relative">
                <Scissors className="h-16 w-16 text-slate-600" />
                {service.popular && (
                  <div className="absolute top-3 right-3 bg-amber-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Popular
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{service.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{service.description}</p>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center text-slate-300">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm">{service.duration} min</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-500">
                    R$ {service.price}
                  </span>
                </div>
                
                <Button className="w-full bg-amber-600 hover:bg-amber-700" asChild>
                  <Link href={`/agendamento?service=${service.id}`}>
                    Agendar Serviço
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center bg-slate-800 rounded-lg p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            Não encontrou o que procurava?
          </h2>
          <p className="text-slate-300 mb-6">
            Entre em contato conosco para serviços personalizados ou tire suas dúvidas 
            sobre qualquer um dos nossos serviços.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-amber-600 hover:bg-amber-700">
              <Link href="/contato">Entre em Contato</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-slate-600 text-white hover:bg-slate-700">
              <Link href="/agendamento">Fazer Agendamento</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 py-8 px-4 mt-16">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Scissors className="h-6 w-6 text-amber-500" />
            <span className="text-xl font-bold text-white">BarberPro</span>
          </div>
          <p className="text-slate-400 mb-4">
            © 2025 BarberPro. Todos os direitos reservados.
          </p>
          <div className="flex justify-center space-x-6">
            <Link href="/" className="text-slate-400 hover:text-amber-500 transition-colors text-sm">
              Início
            </Link>
            <Link href="/agendamento" className="text-slate-400 hover:text-amber-500 transition-colors text-sm">
              Agendamento
            </Link>
            <Link href="/admin" className="text-slate-400 hover:text-amber-500 transition-colors text-sm">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
