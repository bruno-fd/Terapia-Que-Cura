import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  contarAdvogados,
  type ConcorrenciaResult,
} from "@workspace/api-client-react";
import { PLANOS, type FunnelData, type Plano } from "@/lib/cadastro-funnel";
import { ArrowRight, ArrowLeft, Check, Loader2, Users } from "lucide-react";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepConcorrencia({ data, update, onNext, onBack }: Props) {
  const [counts, setCounts] = useState<ConcorrenciaResult | null>(null);
  const [loading, setLoading] = useState(true);

  const primeiraArea = data.areas[0] ?? "";
  const primeiraCidade = data.cidades[0];

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    contarAdvogados({
      area: primeiraArea || undefined,
      cidade: primeiraCidade?.nome || undefined,
      uf: primeiraCidade?.uf || undefined,
    })
      .then((r) => {
        if (ativo) setCounts(r);
      })
      .catch(() => {
        if (ativo) setCounts(null);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [primeiraArea, primeiraCidade?.nome, primeiraCidade?.uf]);

  const escolher = (plano: Plano) => update({ plano });

  const localLabel = primeiraCidade
    ? `${primeiraCidade.nome}, ${primeiraCidade.uf}`
    : "todo o Brasil";

  return (
    <div data-testid="step-concorrencia">
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        O espaço ainda está aberto
      </h2>
      <p className="text-neutral-600 mb-8">
        Veja quantos advogados já aparecem para o público que você quer
        alcançar.
      </p>

      <div
        className="rounded-2xl border border-primary-100 bg-[#EEF5FC] p-6 mb-10"
        data-testid="bloco-concorrencia"
      >
        {loading ? (
          <div
            className="flex items-center gap-2 text-primary-700"
            data-testid="concorrencia-carregando"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando a
            concorrência...
          </div>
        ) : counts ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold text-primary-900">
                  {counts.naAreaECidade} advogado(s)
                </p>
                <p className="text-sm text-neutral-600">
                  já atuam em {primeiraArea} em {localLabel}.
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-600">
              Na sua área são {counts.naArea} perfis ativos e na sua região,{" "}
              {counts.naCidade}. Quanto antes você publica, mais cedo aparece
              para quem procura.
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">
            Não foi possível calcular a concorrência agora, mas seu perfil ainda
            tem espaço garantido assim que publicado.
          </p>
        )}
      </div>

      <h3 className="text-lg font-bold text-primary-900 mb-4">
        Escolha seu plano
      </h3>
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
              {destaque && (
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
        <Button
          onClick={onNext}
          disabled={!data.plano}
          className="h-12 px-7 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium disabled:opacity-50"
          data-testid="button-avancar"
        >
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
