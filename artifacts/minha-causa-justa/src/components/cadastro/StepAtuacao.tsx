import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { AREAS } from "@/lib/dashboard";
import type { FunnelData } from "@/lib/cadastro-funnel";
import { ArrowRight, ArrowLeft, X } from "lucide-react";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepAtuacao({ data, update, onNext, onBack }: Props) {
  const [selectedUf, setSelectedUf] = useState("");
  const [areaErro, setAreaErro] = useState("");
  const [localErro, setLocalErro] = useState("");

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

  const badgeClass = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
      active
        ? "bg-primary-500 text-white border-primary-500"
        : "bg-white text-primary-800 border-primary-300 hover:bg-primary-50"
    }`;

  return (
    <div data-testid="step-atuacao">
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        Onde e em que você atua
      </h2>
      <p className="text-neutral-600 mb-8">
        Isso define para quem o seu perfil aparece nas buscas.
      </p>

      <div className="mb-8">
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
