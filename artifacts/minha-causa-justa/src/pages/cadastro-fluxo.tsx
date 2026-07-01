import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { StepIdentificacao } from "@/components/cadastro/StepIdentificacao";
import { StepAtuacao } from "@/components/cadastro/StepAtuacao";
import { StepCheckout } from "@/components/cadastro/StepCheckout";
import {
  emptyFunnel,
  loadFunnel,
  saveFunnel,
  clearFunnel,
  syncLead,
  PRECO_TRANSPARENCIA,
  TOTAL_STEPS,
  type FunnelData,
  type Plano,
} from "@/lib/cadastro-funnel";
import { RotateCcw } from "lucide-react";

const STEP_LABELS = ["Identificação", "Atuação", "Pagamento"];

// Lê a etapa a partir do hash (#etapa-1..3), se presente e válido.
function parseHashStep(): number | null {
  const m = /^#?etapa-([1-3])$/.exec(window.location.hash);
  return m ? Number(m[1]) : null;
}

// Lê o plano pré-selecionado do parâmetro ?plano= da URL (vindo da landing).
function parsePlanoParam(): Plano | null {
  const p = new URLSearchParams(window.location.search).get("plano");
  return p === "mensal" || p === "anual" ? p : null;
}

export default function CadastroFluxo() {
  // Plano vindo da landing (?plano=). É apenas a seleção inicial; o plano
  // continua editável na etapa de pagamento.
  const [planoViaUrl] = useState<Plano | null>(() => parsePlanoParam());

  const ordem = [1, 2, 3];

  const [data, setData] = useState<FunnelData>(() => emptyFunnel());
  const [mostrarBanner, setMostrarBanner] = useState(false);
  // Maior etapa já alcançada, para permitir voltar via hash sem pular adiante.
  const furthest = useRef(1);

  // Carrega o lead salvo (resumo do funil) na montagem e sincroniza o hash.
  useEffect(() => {
    const salvo = loadFunnel();
    const hashStep = parseHashStep();
    const base = salvo ?? emptyFunnel();
    // O plano da URL tem prioridade sobre o que estiver salvo localmente.
    const planoBase = planoViaUrl ?? base.plano;
    const alvo = hashStep ? Math.min(hashStep, base.step) : base.step;
    const inicial = { ...base, plano: planoBase, step: alvo };
    setData(inicial);
    furthest.current = base.step;
    if (salvo && salvo.step > 1 && salvo.email) {
      setMostrarBanner(true);
    }
    window.history.replaceState(null, "", `#etapa-${inicial.step}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voltar/avançar do navegador: reage apenas a hashes #etapa-N e nunca pula
  // além do já alcançado.
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

  const next = () => {
    const i = ordem.indexOf(data.step);
    goTo(ordem[Math.min(i + 1, ordem.length - 1)]);
  };
  const back = () => {
    const i = ordem.indexOf(data.step);
    goTo(ordem[Math.max(i - 1, 0)]);
  };

  // Marca o lead como concluído (remarketing) ao iniciar o checkout. A conta e
  // o perfil só existem após o pagamento confirmado, então não limpamos o funil
  // aqui: o redirect vai para a fatura do Asaas.
  const concluir = () => {
    void syncLead({ ...data, step: TOTAL_STEPS }, true);
    clearFunnel();
  };

  const recomecar = () => {
    const novo = { ...emptyFunnel(), plano: planoViaUrl };
    furthest.current = 1;
    setData(novo);
    saveFunnel(novo);
    setMostrarBanner(false);
    window.history.replaceState(null, "", "#etapa-1");
  };

  const mostrarPreco = data.step >= 2;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F4F2]">
      <Navbar />

      <main className={`flex-grow py-10 md:py-16 ${mostrarPreco ? "pb-28" : ""}`}>
        <div className="container mx-auto px-6 max-w-[720px]">
          <ProgressBar step={data.step} steps={ordem} />

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
              <StepCheckout
                data={data}
                update={update}
                onBack={back}
                onConcluir={concluir}
              />
            )}
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

function ProgressBar({ step, steps }: { step: number; steps: number[] }) {
  const total = steps.length;
  const idx = steps.indexOf(step);
  const pos = idx < 0 ? 0 : idx;
  const pct = total > 1 ? Math.round((pos / (total - 1)) * 100) : 0;
  return (
    <div className="mb-8" data-testid="progress-bar">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-500">
        <span>
          Etapa {pos + 1} de {total}
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
