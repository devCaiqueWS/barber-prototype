"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const callbackUrl = urlParams?.get("callbackUrl") || "/admin";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciais inválidas");
      } else {
        router.push(callbackUrl);
      }
    } catch (error) {
      setError("Erro de conexão. Tente novamente." + error);
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

      <div className="grid w-full max-w-5xl overflow-hidden bg-black md:grid-cols-[0.95fr_1.05fr]">
        <div className="editorial-grid hidden min-h-[620px] md:grid">
          <div className="editorial-tile tile-black col-span-3 items-center">
            <div>
              <div className="tile-type text-5xl text-primary">Elemento</div>
              <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-primary">Estúdio e Barbearia</p>
            </div>
          </div>
          <div className="editorial-tile tile-red col-span-2 items-center justify-center">
            <div className="tile-type rotate-[-90deg] text-5xl">Login</div>
          </div>
          <div className="editorial-tile tile-photo col-span-2 items-end">
            <p className="text-sm font-semibold uppercase tracking-[0.18em]">Sistema interno</p>
          </div>
          <div className="editorial-tile tile-white col-span-3 items-end">
            <div className="brand-kicker mb-3">Acesso interno</div>
            <h1 className="text-5xl font-bold leading-none text-[#4e0909]">Gestão com postura premium.</h1>
          </div>
        </div>

        <div className="bg-[#0d0b0b] p-6 sm:p-10">
          <div className="mb-10 text-center">
            <span className="brand-wordmark block text-3xl font-bold leading-none text-primary">Elemento</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/55">Estúdio e Barbearia</span>
            <h2 className="mt-8 text-4xl font-bold">Acesse sua conta</h2>
            <p className="mt-2 text-sm text-white/58">Entre com suas credenciais para continuar.</p>
          </div>

          <form className="premium-card space-y-6 p-6" onSubmit={handleSubmit}>
            <div>
              <h3 className="text-2xl font-bold">Painel Elemento</h3>
              <p className="text-xs text-white/52">Área administrativa e barbeiros.</p>
            </div>

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

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-white/86">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="premium-input px-3 py-3 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/45 hover:text-white"
                >
                  <span className="text-xs font-semibold">{showPassword ? "Ocultar" : "Mostrar"}</span>
                </button>
              </div>
            </div>

            {error && <div className="bg-red-950/40 px-4 py-3 text-sm text-red-100">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
