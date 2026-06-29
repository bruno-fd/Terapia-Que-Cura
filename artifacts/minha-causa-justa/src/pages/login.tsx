import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/dashboard";
import logoUrl from "@assets/minhacausajusta_1782681470221.webp";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    setError("");
    setLoading(true);
    // Login simulado: qualquer e-mail + senha entra
    setTimeout(() => {
      login();
      setLocation("/painel/perfil");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-200 p-8">
        <Link href="/" className="flex justify-center hover:opacity-90 transition-opacity" data-testid="link-login-logo">
          <img src={logoUrl} alt="Minha Causa Justa" className="h-14 w-auto" />
        </Link>

        <h1 className="mt-6 text-xl font-bold text-primary-800 text-center">Acesse sua conta</h1>
        <p className="mt-1 text-sm text-neutral-500 text-center">
          Área exclusiva para advogados cadastrados.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-neutral-700 mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              className="w-full h-12 px-4 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="input-login-email"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-bold text-neutral-700 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                className="w-full h-12 px-4 pr-12 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="input-login-senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                data-testid="button-toggle-senha"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#C0392B]" data-testid="text-login-erro">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-primary-600 hover:bg-primary-700 text-white text-base font-medium rounded-lg"
            data-testid="button-login-entrar"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="text-center">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-sm text-primary-500 hover:text-primary-600"
              data-testid="link-esqueci-senha"
            >
              Esqueci minha senha
            </a>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
          <p className="text-sm text-neutral-500">
            Ainda não tem cadastro?{" "}
            <Link href="/cadastro" className="text-primary-500 hover:text-primary-600 font-medium" data-testid="link-login-cadastro">
              Cadastre seu perfil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
