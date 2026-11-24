"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneRole, setDoneRole] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Não foi possível trocar a senha. Tente novamente.");
        return;
      }
      setDoneRole(String(data.role || "CLIENT").toUpperCase());
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="premium-card space-y-4 p-6 text-sm text-white/80">
        <p>Link inválido ou incompleto. Peça um novo link de redefinição.</p>
        <Button asChild className="w-full">
          <Link href="/esqueci-senha">Pedir novo link</Link>
        </Button>
      </div>
    );
  }

  if (doneRole) {
    const loginHref = doneRole === "CLIENT" ? "/minha-conta" : "/login";
    return (
      <div className="premium-card space-y-4 p-6 text-sm text-white/80">
        <p className="text-base font-semibold text-white">Senha alterada.</p>
        <p>Agora é só entrar com a nova senha.</p>
        <Button asChild className="w-full">
          <Link href={loginHref}>Entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="premium-card space-y-6 p-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-white/86">
          Nova senha
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="premium-input px-3 py-3 pr-10"
            placeholder="Mínimo de 6 caracteres"
            autoComplete="new-password"
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

      <div>
        <label htmlFor="confirm" className="mb-2 block text-sm font-semibold text-white/86">
          Repita a nova senha
        </label>
        <input
          id="confirm"
          type={showPassword ? "text" : "password"}
          required
          minLength={6}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="premium-input px-3 py-3"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="space-y-2 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          <p>{error}</p>
          {error.includes("Peça um novo") && (
            <Link href="/esqueci-senha" className="font-semibold underline">
              Pedir novo link
            </Link>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          <h1 className="mt-8 text-3xl font-bold">Criar nova senha</h1>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-white/58">Carregando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
