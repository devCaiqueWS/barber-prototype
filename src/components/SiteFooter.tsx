import Link from "next/link";
import { Scissors } from "lucide-react";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1F1F1F] border-t border-[#3D3D3D] py-8 px-4 mt-16">
      <div className="container mx-auto text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Scissors className="h-6 w-6 text-amber-500" />
          <span className="text-xl font-bold text-white">JM Barbearia</span>
        </div>
        <p className="text-slate-400 mb-4">
          © {year} JM Barbearia. Todos os direitos reservados.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <Link
            href="/"
            className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
          >
            Início
          </Link>
          <Link
            href="/servicos"
            className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
          >
            Serviços
          </Link>
          <Link
            href="/agendamento"
            className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
          >
            Agendamento
          </Link>
          <Link
            href="/sobre"
            className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
          >
            Sobre
          </Link>
          <Link
            href="/contato"
            className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
          >
            Contato
          </Link>
          <Link
            href="/admin"
            className="text-slate-400 hover:text-amber-500 transition-colors text-sm"
          >
            Área Administrativa
          </Link>
        </div>
      </div>
    </footer>
  );
}

