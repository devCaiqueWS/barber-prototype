"use client";
import Link from "next/link";
import React, { useEffect } from 'react'

export default function MenuMobile({ open, setOpen }: { open: boolean, setOpen: (v: boolean) => void }) {

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
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        onClick={() => setOpen(true)}
      >
        <span>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </span>
        Menu
      </button>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/80 z-[100]" onClick={() => setOpen(false)} />
          <nav className="fixed top-0 left-0 w-full h-screen bg-slate-900 bg-opacity-95 rounded-b-xl shadow-lg z-[101] flex flex-col items-center pt-6 pb-4 animate-slideDown">
            <button
              aria-label="Fechar menu"
              className="absolute top-3 right-4 text-amber-500 text-2xl font-bold"
              onClick={() => setOpen(false)}
            >×</button>
            <Link href="#servicos" className="w-full text-center px-4 py-3 text-lg text-slate-300 hover:text-amber-500 border-b border-slate-800" onClick={() => setOpen(false)}>Serviços</Link>
            <Link href="#sobre" className="w-full text-center px-4 py-3 text-lg text-slate-300 hover:text-amber-500 border-b border-slate-800" onClick={() => setOpen(false)}>Sobre</Link>
            <Link href="#contato" className="w-full text-center px-4 py-3 text-lg text-slate-300 hover:text-amber-500 border-b border-slate-800" onClick={() => setOpen(false)}>Contato</Link>
            <Link href="/agendamento" className="w-full text-center px-4 py-3 text-lg text-amber-500 font-bold hover:bg-amber-500 hover:text-white rounded-lg mt-2 transition" onClick={() => setOpen(false)}>Agendar Agora</Link>
          </nav>
        </>
      )}
      <style jsx>{`
        .animate-slideDown {
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { transform: translateY(-40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
