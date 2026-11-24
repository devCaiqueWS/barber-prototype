"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Não foi possível enviar. Tente novamente.");
        return;
      }
      setSent(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-white">
      <Button variant="ghost" size="icon" asChild className="absolute left-4 top-4">
        <Link href="/" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>

      <div className="w-full max-w-md bg-[#0d0b0b] p-6 sm:p-10">
        <div className="mb-8 text-center">
          <span className="brand-wordmark block text-3xl font-bold leading-none text-primary">Elemento</span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/55">Estúdio e Barbearia</span>
          <h1 className="mt-8 text-3xl font-bold">Esqueci a senha</h1>
          <p className="mt-2 text-sm text-white/58">
            Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
          </p>
        </div>

        {sent ? (
          <div className="premium-card space-y-4 p-6 text-sm text-white/80">
            <p>
              Se existir uma conta com <strong className="text-white">{email}</strong>, você vai receber um e-mail em
              alguns minutos. O link vale por 1 hora.
            </p>
            <p className="text-white/55">Não chegou? Confira a caixa de spam ou tente de novo.</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Enviar de novo
            </button>
          </div>
        ) : (
          <form className="premium-card space-y-6 p-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-white/86">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="premium-input px-3 py-3"
                placeholder="seu@email.com"
              />
            </div>

            {error && <div className="bg-red-950/40 px-4 py-3 text-sm text-red-100">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}

        <div className="mt-6 flex justify-between text-sm text-white/58">
          <Link href="/minha-conta" className="hover:text-white">
            Entrar como cliente
          </Link>
          <Link href="/login" className="hover:text-white">
            Acesso da equipe
          </Link>
        </div>
      </div>
    </div>
  );
}
