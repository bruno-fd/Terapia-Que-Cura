import { useState } from "react";
import { Button } from "@/components/ui/button";
import { maskPhone } from "@/lib/dashboard";
import { isEmailValido, type FunnelData } from "@/lib/cadastro-funnel";
import { ArrowRight } from "lucide-react";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onNext: () => void;
}

export function StepIdentificacao({ data, update, onNext }: Props) {
  const [nomeErro, setNomeErro] = useState("");
  const [emailErro, setEmailErro] = useState("");
  const [telefoneErro, setTelefoneErro] = useState("");

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
    const digitos = data.telefone.replace(/\D/g, "");
    if (digitos.length < 10) {
      setTelefoneErro("Informe um WhatsApp com DDD.");
      ok = false;
    }
    if (ok) onNext();
  };

  const inputCls = (erro: string) =>
    `w-full h-12 px-4 rounded-lg border text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
      erro ? "border-[#C0392B]" : "border-neutral-300"
    }`;

  return (
    <div data-testid="step-identificacao">
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
            WhatsApp<span className="text-[#C0392B]"> *</span>
          </label>
          <input
            id="cad-telefone"
            type="tel"
            inputMode="numeric"
            value={data.telefone}
            onChange={(e) => {
              update({ telefone: maskPhone(e.target.value) });
              if (telefoneErro) setTelefoneErro("");
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
      </div>

      <div className="mt-8 flex justify-end">
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
