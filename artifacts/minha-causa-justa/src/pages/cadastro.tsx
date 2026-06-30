import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { StepIdentificacao } from "@/components/cadastro/StepIdentificacao";
import { StepAtuacao } from "@/components/cadastro/StepAtuacao";
import { StepConcorrencia } from "@/components/cadastro/StepConcorrencia";
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

const STEP_LABELS = [
  "Identificação",
  "Atuação",
  "Plano",
  "Conta e pagamento",
  "Perfil",
];

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useUser();
  const [data, setData] = useState<FunnelData>(() => emptyFunnel());
  const [retomado, setRetomado] = useState(false);
  const [mostrarBanner, setMostrarBanner] = useState(false);

  // Carrega o lead salvo (resumo do funil) na montagem.
  useEffect(() => {
    const salvo = loadFunnel();
    if (salvo) {
      setData(salvo);
      // Se o usuário avançou para além da identificação, oferece retomar.
      if (salvo.step > 1 && !salvo.email) {
        setMostrarBanner(false);
      } else if (salvo.step > 1) {
        setMostrarBanner(true);
      }
    }
  }, []);

  // Persiste localmente a cada mudança.
  useEffect(() => {
    saveFunnel(data);
  }, [data]);

  const update = (patch: Partial<FunnelData>) =>
    setData((d) => ({ ...d, ...patch }));

  // Avança de etapa: persiste o lead no back-end (captura + remarketing).
  const goTo = (step: number) => {
    const clamped = Math.min(Math.max(step, 1), TOTAL_STEPS);
    setData((d) => {
      const next = { ...d, step: clamped };
      void syncLead(next);
      saveFunnel(next);
      return next;
    });
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
    setData(novo);
    saveFunnel(novo);
    setMostrarBanner(false);
  };

  const mostrarPreco = data.step >= 2;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F4F2]">
      <Navbar />

      <main className="flex-grow py-10 md:py-16">
        <div className="container mx-auto px-6 max-w-[720px]">
          <ProgressBar step={data.step} />

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
              <StepConcorrencia
                data={data}
                update={update}
                onNext={next}
                onBack={back}
              />
            )}
            {data.step === 4 && (
              <StepConta data={data} onNext={next} onBack={back} />
            )}
            {data.step === 5 &&
              (isSignedIn ? (
                <StepPerfil data={data} onConcluir={concluir} onBack={back} />
              ) : (
                <StepConta data={data} onNext={next} onBack={back} />
              ))}
          </div>

          {mostrarPreco && (
            <p
              className="mt-6 text-center text-sm font-medium text-neutral-600"
              data-testid="preco-transparencia"
            >
              {PRECO_TRANSPARENCIA}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);
  return (
    <div className="mb-8" data-testid="progress-bar">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-500">
        <span>
          Etapa {step} de {TOTAL_STEPS}
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
