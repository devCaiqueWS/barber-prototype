import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-[#0D0B0B] px-4 py-8">
      <div className="container mx-auto text-center">
        <div className="mb-4 flex items-center justify-center">
          <span className="brand-wordmark text-3xl font-bold text-primary">Elemento</span>
        </div>
        <p className="mb-4 text-white/50">
          © {year} Elemento Estúdio e Barbearia. Todos os direitos reservados.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {[
            ["Início", "/"],
            ["Serviços", "/servicos"],
            ["Agendamento", "/agendamento"],
            ["Sobre", "/sobre"],
            ["Contato", "/contato"],
            ["Área Administrativa", "/admin"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="text-sm text-white/55 transition-colors hover:text-primary">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
