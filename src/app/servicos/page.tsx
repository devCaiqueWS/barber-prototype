import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scissors, Clock, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import SiteFooter from "@/components/SiteFooter";

const categories = [
  { id: "all", name: "Todos os Serviços" },
  { id: "Cabelo", name: "Cabelo" },
  { id: "Barba", name: "Barba" },
  { id: "Sobrancelhas", name: "Sobrancelhas" },
  { id: "Tratamentos", name: "Tratamentos" },
];

export default async function ServicosPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1F1F1F] via-[#1F1F1F] to-[#1F1F1F] flex flex-col">
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
              <Scissors className="h-8 w-8 text-amber-500" />
              <span className="text-2xl font-bold text-white">
                JM Barbearia
              </span>
            </div>
          </div>
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link
              className="text-white no-underline hover:no-underline"
              href="/agendamento"
            >
              Agendar Agora
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
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

          {/* Category Filter (visual apenas, ainda sem filtro funcional) */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {categories.map((category, index) => (
              <Button
                key={category.id}
                variant={index === 0 ? "default" : "outline"}
                className={
                  index === 0
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "border-slate-600 text-slate-300 hover:bg-slate-800"
                }
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Services Grid - dados vindos do banco */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20"
              >
                {/* Service Image Placeholder */}
                <div className="h-48 bg-slate-700 flex items-center justify-center">
                  <Scissors className="h-16 w-16 text-slate-600" />
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {service.name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    {service.description ||
                      "Serviço profissional executado com excelência."}
                  </p>

                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center text-slate-300">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        {service.duration} min
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-amber-500">
                      R$ {service.price.toFixed(2)}
                    </span>
                  </div>

                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    asChild
                  >
                    <Link
                      className="text-white no-underline hover:no-underline"
                      href={`/agendamento?service=${service.id}`}
                    >
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
              Entre em contato conosco para serviços personalizados ou tire
              suas dúvidas sobre qualquer um dos nossos serviços.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Link
                  className="text-white no-underline hover:no-underline"
                  href="/contato"
                >
                  Entre em Contato
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                <Link
                  className="text-white no-underline hover:no-underline"
                  href="/agendamento"
                >
                  Fazer Agendamento
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

