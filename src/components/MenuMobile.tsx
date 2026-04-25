"use client";

import Link from "next/link";
import React, { useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function MenuMobile({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Abrir menu"
        className="flex h-10 w-10 items-center justify-center bg-primary text-white hover:bg-[#c21111] focus:outline-none focus:ring-2 focus:ring-primary"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/85" onClick={() => setOpen(false)} />
          <nav className="fixed left-0 top-0 z-[101] flex h-screen w-full animate-slideDown flex-col items-center bg-[#0D0B0B] pt-8">
            <button
              aria-label="Fechar menu"
              className="absolute right-4 top-3 flex h-10 w-10 items-center justify-center text-primary"
              onClick={() => setOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <div className="brand-wordmark mb-6 text-4xl font-bold text-primary">Elemento</div>
            {[
              ["Serviços", "/servicos"],
              ["Sobre", "/sobre"],
              ["Contato", "/contato"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="w-full border-b border-white/10 px-4 py-3 text-center text-lg text-white/75 hover:text-primary"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/agendamento"
              className="mt-5 w-[calc(100%-2rem)] bg-primary px-4 py-3 text-center text-lg font-bold text-white transition hover:bg-[#c21111]"
              onClick={() => setOpen(false)}
            >
              Agendar Agora
            </Link>
          </nav>
        </>
      )}
      <style jsx>{`
        .animate-slideDown {
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from {
            transform: translateY(-40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
