import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { StepIdentificacao } from "@/components/cadastro/StepIdentificacao";
import { StepAtuacao } from "@/components/cadastro/StepAtuacao";
import { StepPlano } from "@/components/cadastro/StepPlano";
import { StepConta } from "@/components/cadastro/StepConta";
import { StepPerfil } from "@/components/cadastro/StepPerfil";
import {
  emptyFunnel,
  loadFunnel,
  saveFunnel,
  clearFunnel,
  syncLead,
  PRECO_TRANSPARENCIA,
  TOTAL_STEPS,
  type FunnelData,
} from "@/lib/cadastro-funnel";
import { RotateCcw } from "lucide-react";

// A barra de progresso cobre apenas as Etapas 1-4 (a 5 é a conclusão do perfil).
const PROGRESS_STEPS = 4;

const STEP_LABELS = [
  "Identificação",
  "Atuação",
  "Plano",
  "Conta e pagamento",
  "Perfil",
];

// Lê a etapa a partir do hash (#etapa-1..5), se presente e válido.
function parseHashStep(): number | null {
  const m = /^#?etapa-([1-5])$/.exec(window.location.hash);
  return m ? Number(m[1]) : null;
}

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useUser();
  const [data, setData] = useState<FunnelData>(() => emptyFunnel());
  const [mostrarBanner, setMostrarBanner] = useState(false);
  // Maior etapa já alcançada, para permitir voltar via hash sem pular adiante.
  const furthest = useRef(1);

  // Carrega o lead salvo (resumo do funil) na montagem e sincroniza o hash.
  useEffect(() => {
    const salvo = loadFunnel();
    const hashStep = parseHashStep();
    const base = salvo ?? emptyFunnel();
    const inicial = hashStep
      ? { ...base, step: Math.min(hashStep, base.step) }
      : base;
    setData(inicial);
    furthest.current = base.step;
    if (salvo && salvo.step > 1 && salvo.email) {
      setMostrarBanner(true);
    }
    window.history.replaceState(null, "", `#etapa-${inicial.step}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voltar/avançar do navegador: reage apenas a hashes #etapa-N (ignora os
  // hashes internos do Clerk no signup), e nunca pula além do já alcançado.
  useEffect(() => {
    const onHash = () => {
      const hashStep = parseHashStep();
      if (!hashStep) return;
      const alvo = Math.min(hashStep, furthest.current);
      setData((d) => (d.step === alvo ? d : { ...d, step: alvo }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Persiste localmente a cada mudança.
  useEffect(() => {
    saveFunnel(data);
  }, [data]);

  const update = (patch: Partial<FunnelData>) =>
    setData((d) => ({ ...d, ...patch }));

  // Avança/volta de etapa: persiste o lead no back-end (captura + remarketing)
  // e espelha a etapa no hash (cria uma entrada para o botão Voltar).
  const goTo = (step: number) => {
    const clamped = Math.min(Math.max(step, 1), TOTAL_STEPS);
    furthest.current = Math.max(furthest.current, clamped);
    setData((d) => {
      const next = { ...d, step: clamped };
      void syncLead(next);
      saveFunnel(next);
      return next;
    });
    if (parseHashStep() !== clamped) {
      window.location.hash = `etapa-${clamped}`;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => goTo(data.step + 1);
  const back = () => goTo(data.step - 1);

  // Conclusão: marca o lead como concluído e limpa o estado local.
  const concluir = () => {
    void syncLead({ ...data, step: TOTAL_STEPS }, true);
    clearFunnel();
    setLocation("/painel/perfil");
  };

  const recomecar = () => {
    const novo = emptyFunnel();
    furthest.current = 1;
    setData(novo);
    saveFunnel(novo);
    setMostrarBanner(false);
    window.history.replaceState(null, "", "#etapa-1");
  };

  const mostrarPreco = data.step >= 2;
  const mostrarProgresso = data.step <= PROGRESS_STEPS;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F4F2]">
      <Navbar />

      <main className={`flex-grow py-10 md:py-16 ${mostrarPreco ? "pb-28" : ""}`}>
        <div className="container mx-auto px-6 max-w-[720px]">
          {mostrarProgresso && <ProgressBar step={data.step} />}

          {mostrarBanner && data.step > 1 && (
            <div
              className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-primary-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              data-testid="banner-retomar"
            >
              <p className="text-sm text-neutral-700">
                Você tem um cadastro em andamento. Continuamos de onde você
                parou.
              </p>
              <Button
                variant="ghost"
                onClick={recomecar}
                className="h-9 shrink-0 rounded-full text-primary-700 hover:bg-primary-50"
                data-testid="button-recomecar"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Recomeçar
              </Button>
            </div>
          )}

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {data.step === 1 && (
              <StepIdentificacao data={data} update={update} onNext={next} />
            )}
            {data.step === 2 && (
              <StepAtuacao
                data={data}
                update={update}
                onNext={next}
                onBack={back}
              />
            )}
            {data.step === 3 && (
              <StepPlano
                data={data}
                update={update}
                onNext={next}
                onBack={back}
              />
            )}
            {data.step === 4 && (
              <StepConta
                data={data}
                onNext={next}
                onBack={back}
                onEditar={goTo}
              />
            )}
            {data.step === 5 &&
              (isSignedIn ? (
                <StepPerfil data={data} onConcluir={concluir} onBack={back} />
              ) : (
                <StepConta
                  data={data}
                  onNext={next}
                  onBack={back}
                  onEditar={goTo}
                />
              ))}
          </div>
        </div>
      </main>

      {mostrarPreco && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-sm"
          data-testid="preco-transparencia"
        >
          <p className="container mx-auto px-6 py-4 text-center text-sm font-medium text-neutral-700">
            {PRECO_TRANSPARENCIA}
          </p>
        </div>
      )}

      <Footer />
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round(((step - 1) / (PROGRESS_STEPS - 1)) * 100);
  return (
    <div className="mb-8" data-testid="progress-bar">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-500">
        <span>
          Etapa {step} de {PROGRESS_STEPS}
        </span>
        <span>{STEP_LABELS[step - 1]}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-accent-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
