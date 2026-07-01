import { useState } from "react";
import { verificarOab as verificarOabApi } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import {
  isEmailValido,
  isCpfValido,
  maskCpf,
  type FunnelData,
} from "@/lib/cadastro-funnel";
import { ArrowRight, Loader2 } from "lucide-react";
import { ProvaSocial, PROVA_SOCIAL } from "@/components/cadastro/ProvaSocial";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onNext: () => void;
}

export function StepIdentificacao({ data, update, onNext }: Props) {
  const [nomeErro, setNomeErro] = useState("");
  const [emailErro, setEmailErro] = useState("");
  const [cpfErro, setCpfErro] = useState("");
  const [oabErro, setOabErro] = useState("");
  const [verificando, setVerificando] = useState(false);

  const oabDigitos = data.oab.replace(/\D/g, "");
  const oabPreenchida = oabDigitos.length >= 3 && !!data.seccional;
  const nomeCompleto =
    data.nome.trim().split(/\s+/).filter(Boolean).length >= 2;

  // Habilita o "Continuar" quando os campos locais estão válidos. A verificação
  // real na OAB acontece no clique (verificarEContinuar).
  const tudoValido =
    nomeCompleto &&
    isEmailValido(data.email) &&
    isCpfValido(data.cpf) &&
    oabPreenchida;

  const focar = (id: string) => {
    document.getElementById(id)?.focus();
  };

  const aplicarErroMotivo = (motivo: string | null | undefined) => {
    switch (motivo) {
      case "cpf_nao_encontrado":
        setCpfErro(
          "Não encontramos esse CPF na base da OAB. Confira o número informado.",
        );
        focar("cad-cpf");
        break;
      case "oab_divergente":
        setOabErro(
          "O número da OAB e a seccional não conferem com esse CPF.",
        );
        focar("cad-oab");
        break;
      case "nome_divergente":
        setNomeErro(
          "O nome informado não confere com o registrado na OAB para esse CPF.",
        );
        focar("cad-nome");
        break;
      case "inscricao_inativa":
        setOabErro(
          "Sua inscrição na OAB não consta como ativa. Verifique sua situação junto à seccional.",
        );
        focar("cad-oab");
        break;
      default:
        setOabErro(
          "Não foi possível confirmar sua inscrição agora. Tente novamente.",
        );
    }
  };

  // Marca a verificação como pendente (revisão manual) e segue o funil. Usado
  // quando o serviço da OAB está indisponível: não bloqueamos o cadastro.
  const seguirPendente = () => {
    update({
      oabVerificada: false,
      oabVerificacaoPendente: true,
      oabVerificadaEm: null,
      oabSituacao: null,
      oabNomeConfirmado: null,
      oabToken: null,
    });
    onNext();
  };

  const verificarEContinuar = async () => {
    let ok = true;
    if (!nomeCompleto) {
      setNomeErro("Informe seu nome completo (nome e sobrenome).");
      ok = false;
    }
    if (!isEmailValido(data.email)) {
      setEmailErro("Informe um e-mail válido.");
      ok = false;
    }
    if (!isCpfValido(data.cpf)) {
      setCpfErro("Informe um CPF válido.");
      ok = false;
    }
    if (!oabPreenchida) {
      setOabErro("Informe o número da OAB e a seccional.");
      ok = false;
    }
    if (!ok) return;

    setVerificando(true);
    try {
      const r = await verificarOabApi({
        cpf: data.cpf,
        oab: data.oab,
        seccional: data.seccional,
        nome: data.nome,
      });
      if (r.valido) {
        update({
          oabVerificada: true,
          oabSituacao: r.situacao ?? null,
          oabNomeConfirmado: r.nomeOab ?? null,
          oabVerificadaEm: new Date().toISOString(),
          oabVerificacaoPendente: false,
          oabToken: r.token ?? null,
        });
        onNext();
        return;
      }
      if (r.motivo === "erro_servico") {
        seguirPendente();
        return;
      }
      aplicarErroMotivo(r.motivo);
      setVerificando(false);
    } catch {
      // Falha de rede/inesperada: trata como verificação pendente e segue.
      seguirPendente();
    }
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

        <div>
          <label
            htmlFor="cad-cpf"
            className="block text-sm font-bold text-neutral-700 mb-1.5"
          >
            CPF<span className="text-[#C0392B]"> *</span>
          </label>
          <input
            id="cad-cpf"
            type="text"
            inputMode="numeric"
            value={data.cpf}
            onChange={(e) => {
              update({ cpf: maskCpf(e.target.value) });
              if (cpfErro) setCpfErro("");
            }}
            onBlur={() => {
              if (data.cpf && !isCpfValido(data.cpf)) {
                setCpfErro("Informe um CPF válido.");
              }
            }}
            placeholder="000.000.000-00"
            className={inputCls(cpfErro)}
            data-testid="input-cpf"
          />
          {cpfErro && (
            <p className="mt-1.5 text-sm text-[#C0392B]" data-testid="erro-cpf">
              {cpfErro}
            </p>
          )}
          <p className="mt-1.5 text-xs text-neutral-500">
            Usamos seu CPF apenas para confirmar sua inscrição na OAB. Ele nunca
            aparece no seu perfil público.
          </p>
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
              }}
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
              }}
              placeholder="UF"
              inputClassName="w-full bg-white pr-9"
              testId="select-seccional"
            />
          </div>
        </div>

        {verificando && (
          <p
            className="flex items-center gap-2 text-sm text-neutral-600"
            data-testid="oab-verificando"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando sua
            inscrição na OAB...
          </p>
        )}
        {oabErro && (
          <p className="text-sm text-[#C0392B]" data-testid="erro-oab">
            {oabErro}
          </p>
        )}
        <p className="text-xs text-neutral-500">
          Confirmamos seu número diretamente na base do Conselho Federal da OAB.
        </p>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={verificarEContinuar}
          disabled={!tudoValido || verificando}
          className="h-12 px-7 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium disabled:opacity-50"
          data-testid="button-avancar"
        >
          {verificando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...
            </>
          ) : (
            <>
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
