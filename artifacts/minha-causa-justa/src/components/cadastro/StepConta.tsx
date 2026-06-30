import { useEffect, useState } from "react";
import { SignUp, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import {
  getAssinatura,
  createAssinatura,
  type SubscriptionState,
} from "@/lib/assinatura";
import {
  PLANOS,
  maskCpfCnpj,
  type FunnelData,
} from "@/lib/cadastro-funnel";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Lock,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

interface Props {
  data: FunnelData;
  onNext: () => void;
  onBack: () => void;
  onEditar: (step: number) => void;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Resumo do pedido com link "Editar" por linha, levando de volta à etapa certa.
function ResumoPedido({
  data,
  onEditar,
}: {
  data: FunnelData;
  onEditar: (step: number) => void;
}) {
  const plano = data.plano ?? "mensal";
  const info = PLANOS[plano];
  const primeiraCidade = data.cidades[0];
  const localLabel = primeiraCidade
    ? `${primeiraCidade.nome}, ${primeiraCidade.uf}${
        data.cidades.length > 1 ? ` +${data.cidades.length - 1}` : ""
      }${data.atendeOnline ? " e online" : ""}`
    : data.atendeOnline
      ? "Online, todo o Brasil"
      : "Não informado";
  const areasLabel = data.areas.length
    ? data.areas.join(", ")
    : "Não informado";

  const linha = (
    rotulo: string,
    valor: string,
    step: number,
    testid: string,
  ) => (
    <div
      className="flex items-start justify-between gap-4 py-3"
      data-testid={`resumo-${testid}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {rotulo}
        </p>
        <p className="text-sm font-medium text-neutral-800 break-words">
          {valor}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onEditar(step)}
        className="shrink-0 text-sm font-medium text-primary-700 underline-offset-2 hover:underline"
        data-testid={`button-editar-${testid}`}
      >
        Editar
      </button>
    </div>
  );

  return (
    <div
      className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] divide-y divide-neutral-100"
      data-testid="resumo-pedido"
    >
      {linha("Plano", info.label, 3, "plano")}
      {linha("Valor", `${info.precoMes}/mês`, 3, "valor")}
      {linha("Cidade e UF", localLabel, 2, "local")}
      {linha("Áreas de atuação", areasLabel, 2, "areas")}
    </div>
  );
}

export function StepConta({ data, onNext, onBack, onEditar }: Props) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex justify-center py-20" data-testid="conta-carregando">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div data-testid="step-conta-signup">
        <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
          Crie sua conta para continuar
        </h2>
        <p className="text-neutral-600 mb-8">
          Use o mesmo e-mail informado no início. É com ele que você acessa seu
          painel.
        </p>

        <ResumoPedido data={data} onEditar={onEditar} />

        <div className="flex justify-center">
          <SignUp
            routing="hash"
            signInUrl={`${basePath}/sign-in`}
            fallbackRedirectUrl={`${basePath}/cadastro`}
            forceRedirectUrl={`${basePath}/cadastro`}
            initialValues={{ emailAddress: data.email }}
          />
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

  return (
    <PagamentoBloco
      data={data}
      onNext={onNext}
      onBack={onBack}
      onEditar={onEditar}
    />
  );
}

function PagamentoBloco({ data, onNext, onBack, onEditar }: Props) {
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    getAssinatura()
      .then((s) => {
        if (ativo) setState(s.hasSubscription ? s : null);
      })
      .catch(() => {
        if (ativo) setState(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const plano = data.plano ?? "mensal";
  const info = PLANOS[plano];

  const criar = async () => {
    setErro("");
    if (cpfCnpj.replace(/\D/g, "").length < 11) {
      setErro("Informe um CPF ou CNPJ válido.");
      return;
    }
    setEnviando(true);
    try {
      const novo = await createAssinatura({
        plano,
        nome: data.nome.trim(),
        cpfCnpj: cpfCnpj.trim(),
        email: data.email.trim(),
        telefone: data.telefone.trim() || undefined,
      });
      setState(novo);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível gerar a cobrança. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center py-20" data-testid="pagamento-carregando">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  const status = state?.status ?? null;
  const ativa = status === "ativa";

  return (
    <div data-testid="step-conta-pagamento">
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        {state ? "Sua assinatura" : "Finalize o pagamento"}
      </h2>
      <p className="text-neutral-600 mb-8">
        {state
          ? "Acompanhe o status do pagamento abaixo."
          : `Você escolheu o ${info.label} (${info.precoMes}/mês).`}
      </p>

      {!state && <ResumoPedido data={data} onEditar={onEditar} />}

      {!state && (
        <>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <label
              htmlFor="cad-cpf"
              className="block text-sm font-bold text-neutral-700 mb-1.5"
            >
              CPF ou CNPJ<span className="text-[#C0392B]"> *</span>
            </label>
            <input
              id="cad-cpf"
              type="text"
              inputMode="numeric"
              value={cpfCnpj}
              onChange={(e) => {
                setCpfCnpj(maskCpfCnpj(e.target.value));
                if (erro) setErro("");
              }}
              placeholder="000.000.000-00"
              className={`w-full h-12 px-4 rounded-lg border text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                erro ? "border-[#C0392B]" : "border-neutral-300"
              }`}
              data-testid="input-cpf"
            />
            {erro && (
              <p className="mt-1.5 text-sm text-[#C0392B]" data-testid="erro-cpf">
                {erro}
              </p>
            )}

            <p className="mt-3 text-sm text-neutral-600">
              Na próxima tela você escolhe pagar com PIX, boleto ou cartão de
              crédito.
            </p>

            <Button
              onClick={criar}
              disabled={enviando}
              className="mt-5 w-full h-12 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium disabled:opacity-60"
              data-testid="button-gerar-cobranca"
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando
                  cobrança...
                </>
              ) : (
                "Gerar cobrança"
              )}
            </Button>
          </div>

          <div
            className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-500"
            data-testid="selo-seguranca"
          >
            <Lock className="h-4 w-4 text-[#1E7D4F]" />
            Pagamento processado com segurança pela Asaas. Não armazenamos dados
            do seu cartão.
          </div>
        </>
      )}

      {state && (
        <div
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          data-testid={`bloco-status-${status ?? "pendente"}`}
        >
          {ativa ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-[#1E7D4F]" />
              <div>
                <p className="font-bold text-primary-900">
                  Pagamento confirmado
                </p>
                <p className="text-sm text-neutral-600">
                  Sua assinatura está ativa. Conclua seu perfil para publicar.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 shrink-0 text-[#B97D00]" />
              <div>
                <p className="font-bold text-primary-900">
                  Aguardando confirmação do pagamento
                </p>
                <p className="text-sm text-neutral-600">
                  Assim que o pagamento for confirmado, seu perfil fica
                  publicado. Você pode concluir o cadastro enquanto isso.
                </p>
              </div>
            </div>
          )}

          {state.invoiceUrl && !ativa && (
            <a
              href={state.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 font-medium text-white transition-colors hover:bg-accent-600"
              data-testid="link-pagar"
            >
              Pagar agora <ExternalLink className="h-4 w-4" />
            </a>
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
        {state && (
          <Button
            onClick={onNext}
            className="h-12 px-7 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium"
            data-testid="button-avancar"
          >
            Concluir perfil <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
