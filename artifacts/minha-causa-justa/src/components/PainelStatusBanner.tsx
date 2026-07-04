import { Link } from "wouter";
import { Check, CreditCard, UserCheck, Globe, ArrowRight, AlertTriangle } from "lucide-react";
import { useGetPerfil } from "@workspace/api-client-react";

// Banner guia que mostra ao advogado em qual etapa do fluxo ele está:
// conta criada, assinatura ativa, perfil completo e, por fim, publicado.
export function PainelStatusBanner() {
  const { data: perfil } = useGetPerfil();

  if (!perfil) return null;

  const assinaturaOk = perfil.subscriptionStatus === "ativa";
  const atrasada = perfil.subscriptionStatus === "atrasada";
  const perfilOk = perfil.complete;
  const publicado = perfil.visivel;

  const steps = [
    { key: "conta", label: "Conta criada", done: true, icon: Check },
    { key: "assinatura", label: "Assinatura ativa", done: assinaturaOk, icon: CreditCard },
    { key: "perfil", label: "Perfil completo", done: perfilOk, icon: UserCheck },
    { key: "publicado", label: "Perfil no ar", done: publicado, icon: Globe },
  ];

  if (publicado) {
    return (
      <div
        className="mb-6 rounded-2xl bg-[#1E7D4F]/10 border border-[#1E7D4F]/30 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
        data-testid="banner-status-publicado"
      >
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-[#1E7D4F] text-white flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-[#1E7D4F] leading-tight">Seu perfil está no ar!</p>
            <p className="text-sm text-neutral-600">Clientes já podem te encontrar no diretório.</p>
          </div>
        </div>
        <a
          href="/advogados"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-[#1E7D4F] hover:underline"
          data-testid="link-ver-publicado"
        >
          Ver no diretório <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  // Determina a próxima ação pendente.
  let cta: { label: string; href: string } | null = null;
  let message: string;
  let tone: "info" | "warning" = "info";

  if (atrasada) {
    tone = "warning";
    message = "Sua assinatura está atrasada. Regularize o pagamento para manter seu perfil no ar.";
    cta = { label: "Regularizar pagamento", href: "/painel/assinatura" };
  } else if (!assinaturaOk) {
    message = "Ative sua assinatura para publicar seu perfil no diretório.";
    cta = { label: "Ver planos", href: "/painel/assinatura" };
  } else {
    message = "Complete seu perfil para aparecer no diretório de advogados.";
    cta = { label: "Completar perfil", href: "/painel/perfil" };
  }

  const borderTone =
    tone === "warning" ? "border-[#B97D00]/30 bg-[#B97D00]/10" : "border-primary-200 bg-primary-50";
  const accentText = tone === "warning" ? "text-[#B97D00]" : "text-primary-800";

  return (
    <div
      className={`mb-6 rounded-2xl border ${borderTone} px-5 py-4`}
      data-testid="banner-status-progresso"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        {/* Etapas */}
        <ol className="flex items-center gap-2 flex-wrap">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = !step.done && steps.slice(0, idx).every((s) => s.done);
            return (
              <li key={step.key} className="flex items-center gap-2">
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                    step.done
                      ? "bg-[#1E7D4F] text-white"
                      : isCurrent
                        ? "bg-primary-600 text-white"
                        : "bg-white text-neutral-400 border border-neutral-300"
                  }`}
                >
                  {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span
                  className={`text-xs font-medium ${
                    step.done ? "text-[#1E7D4F]" : isCurrent ? "text-primary-800" : "text-neutral-400"
                  }`}
                >
                  {step.label}
                </span>
                {idx < steps.length - 1 && (
                  <span className="hidden sm:block w-6 h-px bg-neutral-300" />
                )}
              </li>
            );
          })}
        </ol>

        {/* Próxima ação */}
        {cta && (
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <p className={`text-sm ${accentText} flex items-start gap-1.5 min-w-0`}>
              {tone === "warning" && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{message}</span>
            </p>
            <Link
              href={cta.href}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shrink-0 ${
                tone === "warning"
                  ? "bg-[#B97D00] hover:bg-[#9c6900]"
                  : "bg-primary-600 hover:bg-primary-700"
              }`}
              data-testid="button-status-cta"
            >
              {cta.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
