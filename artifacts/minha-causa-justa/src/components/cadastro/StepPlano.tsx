import { Button } from "@/components/ui/button";
import { PLANOS, type FunnelData, type Plano } from "@/lib/cadastro-funnel";
import { ArrowLeft, Check } from "lucide-react";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPlano({ data, update, onNext, onBack }: Props) {
  // Selecionar um plano já avança a etapa (sem botão "Continuar").
  const escolher = (plano: Plano) => {
    update({ plano });
    onNext();
  };

  return (
    <div data-testid="step-plano">
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        Escolha seu plano
      </h2>
      <p className="text-neutral-600 mb-8">
        Toque em um plano para continuar. Você pode trocar depois no seu painel.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {(Object.keys(PLANOS) as Plano[]).map((plano) => {
          const info = PLANOS[plano];
          const ativo = data.plano === plano;
          const destaque = plano === "anual";
          return (
            <button
              key={plano}
              type="button"
              onClick={() => escolher(plano)}
              className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                ativo
                  ? "border-accent-500 bg-accent-50/40 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
                  : "border-neutral-200 bg-white hover:border-primary-300"
              }`}
              data-testid={`card-plano-${plano}`}
            >
              {destaque && info.nota && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-700">
                  {info.nota}
                </span>
              )}
              <span
                className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  ativo
                    ? "border-accent-500 bg-accent-500 text-white"
                    : "border-neutral-300 text-transparent"
                }`}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <p className="text-sm font-bold text-primary-700 mb-1">
                {info.label}
              </p>
              <p className="text-3xl font-bold text-primary-900">
                {info.precoMes}
                <span className="text-base font-normal text-neutral-500">
                  /mês
                </span>
              </p>
              <p className="mt-2 text-sm text-neutral-600">{info.descricao}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-12 px-5 rounded-full text-primary-700 hover:bg-primary-50"
          data-testid="button-voltar"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    </div>
  );
}
