import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import {
  contarAdvogados,
  type ConcorrenciaResult,
} from "@workspace/api-client-react";
import { AREAS } from "@/lib/dashboard";
import type { FunnelData } from "@/lib/cadastro-funnel";
import { ArrowRight, ArrowLeft, X, Loader2, Users } from "lucide-react";
import { ProvaSocial, PROVA_SOCIAL } from "@/components/cadastro/ProvaSocial";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Mensagem sempre positiva, em faixas, reforçando a demanda sem desmotivar.
function mensagemConcorrencia(
  count: number,
  area: string,
  local: string,
): string {
  if (count <= 0) {
    return `Você pode ser um dos primeiros em ${area} em ${local}. Quem chega cedo aparece primeiro para quem procura.`;
  }
  if (count <= 5) {
    return `Espaço aberto: poucos advogados de ${area} aparecem em ${local}. É a hora ideal para garantir destaque.`;
  }
  if (count <= 20) {
    return `A procura por ${area} em ${local} está aquecida. Com um perfil completo, você se destaca dos demais.`;
  }
  return `${area} é muito buscada em ${local}. Há bastante demanda; um perfil bem feito coloca você na frente.`;
}

export function StepAtuacao({ data, update, onNext, onBack }: Props) {
  const [selectedUf, setSelectedUf] = useState("");
  const [areaErro, setAreaErro] = useState("");
  const [localErro, setLocalErro] = useState("");
  const [counts, setCounts] = useState<ConcorrenciaResult | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const primeiraArea = data.areas[0] ?? "";
  const primeiraCidade = data.cidades[0];
  // O card só aparece com cidade E ao menos uma área (contrato da Etapa 2).
  const mostrarCard = !!primeiraArea && !!primeiraCidade;

  // Busca a contagem real quando há cidade + área.
  useEffect(() => {
    if (!mostrarCard || !primeiraCidade) {
      setCounts(null);
      return;
    }
    let ativo = true;
    setLoadingCount(true);
    contarAdvogados({
      area: primeiraArea,
      cidade: primeiraCidade.nome,
      uf: primeiraCidade.uf,
    })
      .then((r) => {
        if (ativo) setCounts(r);
      })
      .catch(() => {
        if (ativo) setCounts(null);
      })
      .finally(() => {
        if (ativo) setLoadingCount(false);
      });
    return () => {
      ativo = false;
    };
  }, [mostrarCard, primeiraArea, primeiraCidade?.nome, primeiraCidade?.uf]);

  const toggleArea = (area: string) => {
    setAreaErro("");
    update({
      areas: data.areas.includes(area)
        ? data.areas.filter((a) => a !== area)
        : [...data.areas, area],
    });
  };

  const addCidade = (nome: string) => {
    if (!selectedUf) return;
    if (data.cidades.some((c) => c.nome === nome && c.uf === selectedUf)) return;
    setLocalErro("");
    update({ cidades: [...data.cidades, { nome, uf: selectedUf }] });
  };

  const removeCidade = (nome: string, uf: string) => {
    update({
      cidades: data.cidades.filter((c) => !(c.nome === nome && c.uf === uf)),
    });
  };

  const validar = () => {
    let ok = true;
    if (data.areas.length === 0) {
      setAreaErro("Selecione ao menos uma área de atuação.");
      ok = false;
    }
    if (data.cidades.length === 0 && !data.atendeOnline) {
      setLocalErro("Adicione ao menos uma cidade ou marque atendimento online.");
      ok = false;
    }
    if (ok) onNext();
  };

  const localLabel = primeiraCidade
    ? `${primeiraCidade.nome}, ${primeiraCidade.uf}`
    : "todo o Brasil";

  const badgeClass = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
      active
        ? "bg-primary-500 text-white border-primary-500"
        : "bg-white text-primary-800 border-primary-300 hover:bg-primary-50"
    }`;

  return (
    <div data-testid="step-atuacao">
      <ProvaSocial>{PROVA_SOCIAL.atuacao}</ProvaSocial>
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        Onde e em que você atua
      </h2>
      <p className="text-neutral-600 mb-8">
        Isso define para quem o seu perfil aparece nas buscas.
      </p>

      <div>
        <h3 className="text-sm font-bold text-neutral-700 mb-3">
          Locais de atendimento<span className="text-[#C0392B]"> *</span>
        </h3>
        <StateAutocomplete
          value={selectedUf}
          onSelect={setSelectedUf}
          placeholder="Selecione um estado..."
          inputClassName="w-full bg-white pr-10"
          testId="select-estado"
        />
        {selectedUf && (
          <div className="mt-3">
            <CityAutocomplete
              uf={selectedUf}
              onSelect={addCidade}
              testId="autocomplete-cidade"
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {data.cidades.map((c) => (
            <span
              key={`${c.nome}-${c.uf}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-100 px-3 py-1.5 text-sm text-primary-800"
              data-testid={`tag-cidade-${c.nome}-${c.uf}`}
            >
              {c.nome}, {c.uf}
              <button
                type="button"
                onClick={() => removeCidade(c.nome, c.uf)}
                className="rounded-full p-0.5 text-primary-600 transition-colors hover:bg-primary-200 hover:text-primary-900"
                aria-label={`Remover ${c.nome}, ${c.uf}`}
                data-testid={`button-remover-cidade-${c.nome}-${c.uf}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {data.atendeOnline && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1E7D4F]/30 bg-[#1E7D4F]/10 px-3 py-1.5 text-sm font-medium text-[#1E7D4F]">
              🌐 Online - Todo o Brasil
            </span>
          )}
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-2.5">
          <Checkbox
            checked={data.atendeOnline}
            onCheckedChange={(v) => {
              update({ atendeOnline: v === true });
              if (v === true) setLocalErro("");
            }}
            data-testid="checkbox-online"
          />
          <span className="text-sm text-neutral-700">
            Também atendo online em todo o Brasil
          </span>
        </label>

        {localErro && (
          <p className="mt-3 text-sm text-[#C0392B]" data-testid="erro-local">
            {localErro}
          </p>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-neutral-700 mb-3">
          Áreas de atuação<span className="text-[#C0392B]"> *</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={badgeClass(data.areas.includes(area))}
              data-testid={`badge-area-${area}`}
            >
              {area}
            </button>
          ))}
        </div>
        {areaErro && (
          <p className="mt-3 text-sm text-[#C0392B]" data-testid="erro-area">
            {areaErro}
          </p>
        )}
      </div>

      {mostrarCard && (
        <div
          className="mt-8 rounded-2xl border border-primary-100 bg-[#EEF5FC] p-6"
          data-testid="bloco-concorrencia"
        >
          {loadingCount ? (
            <div
              className="flex items-center gap-2 text-primary-700"
              data-testid="concorrencia-carregando"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando o mercado em{" "}
              {localLabel}...
            </div>
          ) : counts ? (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-bold text-primary-900">
                  {counts.naAreaECidade} advogado(s) de {primeiraArea} em{" "}
                  {localLabel}
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {mensagemConcorrencia(
                    counts.naAreaECidade,
                    primeiraArea,
                    localLabel,
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-600">
              Seu perfil tem espaço garantido em {localLabel} assim que
              publicado.
            </p>
          )}
        </div>
      )}

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
          onClick={validar}
          className="h-12 px-7 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium"
          data-testid="button-avancar"
        >
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
