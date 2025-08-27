import React from "react";

export default function TailwindTest() {
  return (
    <div className="p-8 bg-gradient-to-r from-amber-500 to-slate-900 text-white rounded-xl shadow-lg text-center">
      <h1 className="text-4xl font-bold mb-4">Teste Tailwind</h1>
      <p className="text-lg mb-2">Se você está vendo este bloco estilizado, o Tailwind está funcionando!</p>
      <button className="px-6 py-2 bg-white text-amber-700 rounded-lg font-bold hover:bg-amber-100 transition">Botão Teste</button>
    </div>
  );
}
