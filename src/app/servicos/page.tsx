import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import SiteFooter from "@/components/SiteFooter";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const categories = [
  { id: "all", name: "Todos" },
  { id: "Cabelo", name: "Cabelo" },
  { id: "Barba", name: "Barba" },
  { id: "Sobrancelhas", name: "Sobrancelhas" },
  { id: "Tratamentos", name: "Tratamentos" },
];

export default async function ServicosPage() {
  let services: { id: string; name: string; description: string | null; duration: number; price: number }[] = [];
  let loadError = false;

  try {
    services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Erro ao buscar serviços", error);
    loadError = true;
  }

  return (
    <div className="premium-shell flex min-h-screen flex-col">
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

      <main className="flex-1">
        <section className="container mx-auto grid px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-14">
          <div className="solid-black p-8 md:p-12">
            <div className="brand-kicker mb-4">Carta de serviços</div>
            <h1 className="max-w-3xl text-5xl font-bold leading-[0.9] md:text-7xl">
              Serviços Elemento.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/68">
              Corte, barba e cuidado com presença clássica, operação direta e acabamento profissional.
            </p>
          </div>
          <div className="solid-red flex items-center justify-center p-8 md:p-12">
            <div className="tile-type text-center text-5xl md:text-7xl">
              Forte.
              <br />
              Direta.
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-8">
          <div className="flex flex-wrap gap-3">
            {categories.map((category, index) => (
              <Button key={category.id} variant={index === 0 ? "default" : "outline"}>
                {category.name}
              </Button>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-14">
          {loadError ? (
            <div className="solid-burgundy mb-10 flex items-start gap-3 p-5 text-red-100">
              <div>
                <h3 className="font-semibold">Não foi possível carregar os serviços.</h3>
                <p className="text-sm text-red-100/75">Tente novamente em instantes.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <div key={service.id} className={index % 5 === 1 ? "solid-white" : "premium-card"}>
                  <div className={index % 5 === 0 ? "brick-texture flex h-36 items-center justify-center" : "solid-black flex h-36 items-center justify-center"}>
                    <span className="brand-wordmark text-2xl font-bold text-primary">Elemento.</span>
                  </div>
                  <div className="flex min-h-72 flex-col p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-65">Elemento.</span>
                      <span className="text-sm opacity-70">
                        {service.duration} min
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold">{service.name}</h3>
                    <p className="mt-3 text-sm opacity-70">
                      {service.description || "Serviço profissional executado com excelência."}
                    </p>
                    <div className="mt-auto pt-6">
                      <div className="mb-4 text-3xl font-bold text-primary">
                        R$ {service.price.toFixed(2)}
                      </div>
                      <Button className="w-full" asChild>
                        <Link href={`/agendamento?service=${service.id}`}>Agendar serviço</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="container mx-auto grid px-4 pb-16 md:grid-cols-[0.95fr_1.05fr]">
          <div className="solid-red p-8 md:p-10">
            <h2 className="tile-type text-4xl md:text-5xl">Não encontrou?</h2>
          </div>
          <div className="solid-black p-8 md:p-10">
            <p className="mb-6 max-w-2xl text-white/70">
              Fale com a equipe para serviços personalizados, dúvidas ou recomendações.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/contato">Entrar em contato</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/agendamento">Fazer agendamento</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
