import { useState } from "react";
import { Button } from "@/components/ui/button";
import { iniciarCheckout } from "@/lib/assinatura";
import { ProvaSocial, PROVA_SOCIAL } from "@/components/cadastro/ProvaSocial";
import {
  PLANOS,
  type FunnelData,
  type Plano,
} from "@/lib/cadastro-funnel";
import { ArrowLeft, Check, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onBack: () => void;
  // Marca o lead como concluído no back-end (best-effort) ao iniciar o checkout.
  onConcluir: () => void;
}

// Resumo do pedido (somente leitura): as informações do perfil poderão ser
// editadas no painel após o pagamento e a criação da conta.
function ResumoPedido({ data }: { data: FunnelData }) {
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

  const linha = (rotulo: string, valor: string, testid: string) => (
    <div className="py-3" data-testid={`resumo-${testid}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {rotulo}
      </p>
      <p className="text-sm font-medium text-neutral-800 break-words">{valor}</p>
    </div>
  );

  return (
    <div
      className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] divide-y divide-neutral-100"
      data-testid="resumo-pedido"
    >
      {linha("Nome", data.nome || "Não informado", "nome")}
      {linha("E-mail", data.email || "Não informado", "email")}
      {linha("Cidade e UF", localLabel, "local")}
      {linha("Áreas de atuação", areasLabel, "areas")}
    </div>
  );
}

export function StepCheckout({ data, update, onBack, onConcluir }: Props) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const plano: Plano = data.plano ?? "mensal";

  const irParaPagamento = async () => {
    setErro("");
    const cpfDigitos = data.cpf.replace(/\D/g, "");
    if (cpfDigitos.length < 11) {
      setErro(
        "Não encontramos um CPF válido do seu cadastro. Volte à primeira etapa.",
      );
      return;
    }
    // Cadastros retomados de antes do telefone ser obrigatório podem chegar
    // aqui sem ele; sem telefone a Asaas não aceita o pré-preenchimento.
    const telDigitos = data.telefone.replace(/\D/g, "");
    if (telDigitos.length < 10 || telDigitos.length > 11) {
      setErro(
        "Não encontramos um telefone válido do seu cadastro. Volte à primeira etapa e informe seu WhatsApp/telefone.",
      );
      return;
    }
    setEnviando(true);
    try {
      const { checkoutUrl } = await iniciarCheckout({
        leadId: data.leadId,
        plano,
        nome: data.nome.trim(),
        email: data.email.trim(),
        cpfCnpj: data.cpf.trim(),
        telefone: data.telefone.trim() || undefined,
      });
      if (!checkoutUrl) {
        throw new Error("Não recebemos o link de pagamento. Tente novamente.");
      }
      // Só marca o lead como concluído (remarketing) e limpa o funil após o
      // checkout ter sido criado com sucesso, imediatamente antes do redirect.
      onConcluir();
      // Redireciona para a página de checkout hospedada do Asaas (cartão).
      window.location.href = checkoutUrl;
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível iniciar o pagamento. Tente novamente.",
      );
      setEnviando(false);
    }
  };

  return (
    <div data-testid="step-checkout">
      <ProvaSocial>{PROVA_SOCIAL.pagamento}</ProvaSocial>
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        Escolha seu plano e finalize
      </h2>
      <p className="text-neutral-600 mb-8">
        Pague com cartão de crédito no ambiente seguro do Asaas. A assinatura é
        recorrente e renova automaticamente a cada ciclo.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        {(Object.keys(PLANOS) as Plano[]).map((p) => {
          const info = PLANOS[p];
          const ativo = plano === p;
          const destaque = p === "anual";
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                update({ plano: p });
                if (erro) setErro("");
              }}
              className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                ativo
                  ? "border-accent-500 bg-accent-50/40 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
                  : "border-neutral-200 bg-white hover:border-primary-300"
              }`}
              data-testid={`card-plano-${p}`}
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

      <ResumoPedido data={data} />

      <div
        className="mb-6 flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-4"
        data-testid="aviso-conta-pos-pagamento"
      >
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" />
        <p className="text-sm text-neutral-700">
          Assim que o pagamento for confirmado, você recebe um e-mail para criar
          sua senha e publicar seu perfil. Sua conta é criada só depois do
          pagamento.
        </p>
      </div>

      {erro && (
        <p
          className="mb-4 text-sm text-[#C0392B]"
          data-testid="erro-checkout"
        >
          {erro}
        </p>
      )}

      <Button
        onClick={irParaPagamento}
        disabled={enviando}
        className="w-full h-12 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium disabled:opacity-60"
        data-testid="button-ir-pagamento"
      >
        {enviando ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando
            pagamento...
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" /> Ir para o pagamento com
            cartão
          </>
        )}
      </Button>

      <div
        className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-500"
        data-testid="selo-seguranca"
      >
        <Lock className="h-4 w-4 text-[#1E7D4F]" />
        Pagamento processado com segurança pela Asaas. Não armazenamos dados do
        seu cartão.
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={enviando}
          className="h-12 px-5 rounded-full text-primary-700 hover:bg-primary-50"
          data-testid="button-voltar"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    </div>
  );
}
