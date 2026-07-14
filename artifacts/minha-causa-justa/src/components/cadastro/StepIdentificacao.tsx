import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import {
  isEmailValido,
  isCpfValido,
  isTelefoneValido,
  maskCpf,
  maskTelefone,
  type FunnelData,
} from "@/lib/cadastro-funnel";
import { ArrowRight } from "lucide-react";
import { ProvaSocial, PROVA_SOCIAL } from "@/components/cadastro/ProvaSocial";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onNext: () => void;
}

// NOTA: a verificação automática da inscrição no CRP (equivalente ao que este
// componente fazia contra o webservice da OAB) ainda não foi migrada — ver
// plano de migração. Por ora, todo cadastro segue para revisão manual do
// admin (crpVerificacaoPendente: true), sem chamar nenhum webservice externo.
export function StepIdentificacao({ data, update, onNext }: Props) {
  const [nomeErro, setNomeErro] = useState("");
  const [emailErro, setEmailErro] = useState("");
  const [telefoneErro, setTelefoneErro] = useState("");
  const [cpfErro, setCpfErro] = useState("");
  const [crpErro, setCrpErro] = useState("");

  const crpDigitos = data.crp.replace(/\D/g, "");
  const crpPreenchido = crpDigitos.length >= 3 && !!data.regiao;
  const nomeCompleto =
    data.nome.trim().split(/\s+/).filter(Boolean).length >= 2;

  const tudoValido =
    nomeCompleto &&
    isEmailValido(data.email) &&
    isTelefoneValido(data.telefone) &&
    isCpfValido(data.cpf) &&
    crpPreenchido;

  const inputCls = (erro: string) =>
    `w-full h-12 px-4 rounded-lg border text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
      erro ? "border-[#C0392B]" : "border-neutral-300"
    }`;

  const continuar = () => {
    let ok = true;
    if (!nomeCompleto) {
      setNomeErro("Informe seu nome completo (nome e sobrenome).");
      ok = false;
    }
    if (!isEmailValido(data.email)) {
      setEmailErro("Informe um e-mail válido.");
      ok = false;
    }
    if (!isTelefoneValido(data.telefone)) {
      setTelefoneErro("Informe um telefone válido com DDD.");
      ok = false;
    }
    if (!isCpfValido(data.cpf)) {
      setCpfErro("Informe um CPF válido.");
      ok = false;
    }
    if (!crpPreenchido) {
      setCrpErro("Informe o número do CRP e a região.");
      ok = false;
    }
    if (!ok) return;

    // Verificação pendente de revisão manual (ver nota acima).
    update({
      crpVerificada: false,
      crpVerificacaoPendente: true,
      crpVerificadaEm: null,
      crpSituacao: null,
      crpNomeConfirmado: null,
      oabToken: null,
    });
    onNext();
  };

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
            htmlFor="cad-telefone"
            className="block text-sm font-bold text-neutral-700 mb-1.5"
          >
            WhatsApp / Telefone<span className="text-[#C0392B]"> *</span>
          </label>
          <input
            id="cad-telefone"
            type="tel"
            inputMode="numeric"
            value={data.telefone}
            onChange={(e) => {
              update({ telefone: maskTelefone(e.target.value) });
              if (telefoneErro) setTelefoneErro("");
            }}
            onBlur={() => {
              if (data.telefone && !isTelefoneValido(data.telefone)) {
                setTelefoneErro("Informe um telefone válido com DDD.");
              }
            }}
            placeholder="(11) 99999-9999"
            className={inputCls(telefoneErro)}
            data-testid="input-telefone"
          />
          {telefoneErro && (
            <p
              className="mt-1.5 text-sm text-[#C0392B]"
              data-testid="erro-telefone"
            >
              {telefoneErro}
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
            Usamos seu CPF apenas para confirmar sua inscrição no CRP. Ele nunca
            aparece no seu perfil público.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
          <div>
            <label
              htmlFor="cad-crp"
              className="block text-sm font-bold text-neutral-700 mb-1.5"
            >
              Número do CRP<span className="text-[#C0392B]"> *</span>
            </label>
            <input
              id="cad-crp"
              type="text"
              inputMode="numeric"
              value={data.crp}
              onChange={(e) => {
                update({ crp: e.target.value });
                if (crpErro) setCrpErro("");
              }}
              placeholder="Ex: 145782"
              className={inputCls(crpErro)}
              data-testid="input-crp"
            />
          </div>
          <div>
            <span className="block text-sm font-bold text-neutral-700 mb-1.5">
              Região<span className="text-[#C0392B]"> *</span>
            </span>
            <StateAutocomplete
              value={data.regiao}
              onSelect={(uf) => {
                update({ regiao: uf });
                if (crpErro) setCrpErro("");
              }}
              placeholder="UF"
              inputClassName="w-full bg-white pr-9"
              testId="select-regiao"
            />
          </div>
        </div>

        {crpErro && (
          <p className="text-sm text-[#C0392B]" data-testid="erro-crp">
            {crpErro}
          </p>
        )}
        <p className="text-xs text-neutral-500">
          Nossa equipe confere manualmente sua inscrição no Conselho Regional
          de Psicologia antes de ativar seu perfil no diretório.
        </p>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={continuar}
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
