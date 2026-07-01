import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import { isEmailValido, type FunnelData } from "@/lib/cadastro-funnel";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { ProvaSocial, PROVA_SOCIAL } from "@/components/cadastro/ProvaSocial";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onNext: () => void;
}

type VerifStatus = "idle" | "verificando" | "ok";

export function StepIdentificacao({ data, update, onNext }: Props) {
  const [nomeErro, setNomeErro] = useState("");
  const [emailErro, setEmailErro] = useState("");
  const [oabErro, setOabErro] = useState("");
  const [verif, setVerif] = useState<VerifStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const oabDigitos = data.oab.replace(/\D/g, "");
  const oabPreenchida = oabDigitos.length >= 3 && !!data.seccional;

  // Verificação de OAB simulada (placeholder, sem webservice real), disparada
  // no blur do número/seccional quando ambos estão preenchidos. Habilita o
  // "Continuar" ao concluir.
  const verificarOab = (numero: string, seccional: string) => {
    const ok = numero.replace(/\D/g, "").length >= 3 && !!seccional;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!ok) {
      setVerif("idle");
      return;
    }
    setVerif("verificando");
    timerRef.current = setTimeout(() => setVerif("ok"), 800);
  };

  const resetarVerif = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (verif !== "idle") setVerif("idle");
  };

  const tudoValido =
    !!data.nome.trim() &&
    isEmailValido(data.email) &&
    oabPreenchida &&
    verif === "ok";

  const validar = () => {
    let ok = true;
    if (!data.nome.trim()) {
      setNomeErro("Informe seu nome completo.");
      ok = false;
    }
    if (!isEmailValido(data.email)) {
      setEmailErro("Informe um e-mail válido.");
      ok = false;
    }
    if (!oabPreenchida) {
      setOabErro("Informe o número da OAB e a seccional.");
      ok = false;
    }
    if (ok && verif === "ok") onNext();
  };

  const inputCls = (erro: string) =>
    `w-full h-12 px-4 rounded-lg border text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
      erro ? "border-[#C0392B]" : "border-neutral-300"
    }`;

  return (
    <div data-testid="step-identificacao">
      <ProvaSocial>{PROVA_SOCIAL.identificacao}</ProvaSocial>
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        Vamos começar pelo básico
      </h2>
      <p className="text-neutral-600 mb-8">
        Esses dados ficam guardados para você retomar o cadastro quando quiser.
      </p>

      <div className="space-y-5">
        <div>
          <label
            htmlFor="cad-nome"
            className="block text-sm font-bold text-neutral-700 mb-1.5"
          >
            Nome completo<span className="text-[#C0392B]"> *</span>
          </label>
          <input
            id="cad-nome"
            type="text"
            value={data.nome}
            onChange={(e) => {
              update({ nome: e.target.value });
              if (nomeErro) setNomeErro("");
            }}
            placeholder="Ex: Dra. Carla Mendes Santos"
            className={inputCls(nomeErro)}
            data-testid="input-nome"
          />
          {nomeErro && (
            <p className="mt-1.5 text-sm text-[#C0392B]" data-testid="erro-nome">
              {nomeErro}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="cad-email"
            className="block text-sm font-bold text-neutral-700 mb-1.5"
          >
            E-mail<span className="text-[#C0392B]"> *</span>
          </label>
          <input
            id="cad-email"
            type="email"
            value={data.email}
            onChange={(e) => {
              update({ email: e.target.value });
              if (emailErro) setEmailErro("");
            }}
            onBlur={() => {
              if (data.email && !isEmailValido(data.email)) {
                setEmailErro("Informe um e-mail válido.");
              }
            }}
            placeholder="seu@email.com.br"
            className={inputCls(emailErro)}
            data-testid="input-email"
          />
          {emailErro && (
            <p
              className="mt-1.5 text-sm text-[#C0392B]"
              data-testid="erro-email"
            >
              {emailErro}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
          <div>
            <label
              htmlFor="cad-oab"
              className="block text-sm font-bold text-neutral-700 mb-1.5"
            >
              Número da OAB<span className="text-[#C0392B]"> *</span>
            </label>
            <input
              id="cad-oab"
              type="text"
              inputMode="numeric"
              value={data.oab}
              onChange={(e) => {
                update({ oab: e.target.value });
                if (oabErro) setOabErro("");
                resetarVerif();
              }}
              onBlur={(e) => verificarOab(e.target.value, data.seccional)}
              placeholder="Ex: 145782"
              className={inputCls(oabErro)}
              data-testid="input-oab"
            />
          </div>
          <div>
            <span className="block text-sm font-bold text-neutral-700 mb-1.5">
              Seccional<span className="text-[#C0392B]"> *</span>
            </span>
            <StateAutocomplete
              value={data.seccional}
              onSelect={(uf) => {
                update({ seccional: uf });
                if (oabErro) setOabErro("");
                verificarOab(data.oab, uf);
              }}
              placeholder="UF"
              inputClassName="w-full bg-white pr-9"
              testId="select-seccional"
            />
          </div>
        </div>

        {verif === "verificando" && (
          <p
            className="flex items-center gap-2 text-sm text-neutral-600"
            data-testid="oab-verificando"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando inscrição na
            OAB...
          </p>
        )}
        {verif === "ok" && (
          <p
            className="flex items-center gap-2 text-sm font-medium text-[#1E7D4F]"
            data-testid="oab-ok"
          >
            <CheckCircle2 className="h-4 w-4" /> Inscrição localizada
            (verificação simulada).
          </p>
        )}
        {oabErro && (
          <p className="text-sm text-[#C0392B]" data-testid="erro-oab">
            {oabErro}
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={validar}
          disabled={!tudoValido}
          className="h-12 px-7 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium disabled:opacity-50"
          data-testid="button-avancar"
        >
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
