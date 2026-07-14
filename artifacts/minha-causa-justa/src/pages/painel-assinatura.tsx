import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  Lock,
  Clock,
  Loader2,
  Eye,
  TrendingUp,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getAssinatura,
  createAssinatura,
  cancelAssinatura,
  solicitarReembolso,
  type SubscriptionState,
} from "@/lib/assinatura";
import { useToast } from "@/hooks/use-toast";

const ERROR_COLOR = "#C0392B";
const SUCCESS_COLOR = "#1E7D4F";
const WARNING_COLOR = "#B97D00";

type Plano = "mensal" | "anual";

const PLAN_LABEL: Record<Plano, string> = {
  mensal: "Plano Mensal",
  anual: "Plano Anual",
};

const STATUS_BADGE: Record<string, string> = {
  Pago: "bg-[#1E7D4F]/10 text-[#1E7D4F]",
  Falhou: "bg-[#C0392B]/10 text-[#C0392B]",
  Pendente: "bg-[#B97D00]/10 text-[#B97D00]",
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-neutral-200 p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default function PainelAssinatura() {
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showAssinar, setShowAssinar] = useState(false);
  const [planoEscolhido, setPlanoEscolhido] = useState<Plano>("mensal");
  const [pendingPlano, setPendingPlano] = useState<Plano | null>(null);
  const [cancelMode, setCancelMode] = useState<
    null | "cancelar" | "reembolso"
  >(null);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      setState(await getAssinatura());
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Não foi possível carregar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Retorno do Asaas Checkout: exibe uma mensagem e recarrega o estado algumas
  // vezes, pois o webhook (CHECKOUT_PAID) que ativa a assinatura pode chegar com
  // alguns segundos de atraso após o redirect de volta.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );
    if (checkout === "sucesso") {
      toast({
        title: "Pagamento recebido!",
        description:
          "Estamos ativando sua assinatura. Isso leva alguns instantes.",
      });
      const timers = [3000, 8000, 15000].map((ms) =>
        window.setTimeout(() => void load(), ms),
      );
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
    if (checkout === "cancelado" || checkout === "expirado") {
      toast({
        title:
          checkout === "expirado"
            ? "Checkout expirado"
            : "Pagamento não concluído",
        description: "Você pode tentar assinar novamente quando quiser.",
      });
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lê o plano pré-selecionado no cadastro (vindo da página de planos).
  useEffect(() => {
    let pre: string | null = null;
    try {
      pre = localStorage.getItem("mcj_plano_preselect");
    } catch {
      pre = null;
    }
    if (pre === "mensal" || pre === "anual") {
      try {
        localStorage.removeItem("mcj_plano_preselect");
      } catch {
        // Ignora ambientes sem localStorage.
      }
      setPendingPlano(pre);
    }
  }, []);

  // Abre o plano pré-selecionado só depois de carregar e se ainda não houver
  // assinatura ativa.
  useEffect(() => {
    if (loading || !state || !pendingPlano) return;
    if (!state.hasSubscription) {
      setPlanoEscolhido(pendingPlano);
      setShowAssinar(true);
    }
    setPendingPlano(null);
  }, [loading, state, pendingPlano]);

  function abrirAssinar(plano: Plano) {
    setPlanoEscolhido(plano);
    setShowAssinar(true);
  }

  const status = state?.status ?? null;
  const ativa = state?.hasSubscription === true;

  return (
    <DashboardLayout active="assinatura">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-800">Minha Assinatura</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gerencie seu plano e acompanhe o status da sua assinatura.
        </p>
      </div>

      {loadError && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={{ background: `${ERROR_COLOR}14`, color: ERROR_COLOR }}
          data-testid="erro-assinatura"
        >
          {loadError}
        </div>
      )}

      {loading ? (
        <Card className="flex items-center gap-3 text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando sua
          assinatura...
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Sem assinatura ativa: escolha de plano */}
          {(!ativa || status === "inativa") && (
            <Card data-testid="card-sem-assinatura">
              {status === "inativa" ? (
                <div className="flex items-center gap-2 text-lg font-bold" style={{ color: ERROR_COLOR }}>
                  <XCircle className="h-5 w-5" /> Assinatura Inativa
                </div>
              ) : (
                <h2 className="text-lg font-bold text-primary-800">
                  Escolha seu plano para aparecer na plataforma
                </h2>
              )}
              <p className="mt-1 text-sm text-neutral-500">
                {status === "inativa"
                  ? "Seu perfil não está visível. Reative para voltar a aparecer nas buscas."
                  : "Assine para ter seu perfil visível por área e estado."}
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlanoCard
                  titulo="Plano Mensal"
                  preco="R$ 49,90"
                  periodo="/mês"
                  nota="Cancele quando quiser"
                  itens={[
                    "Perfil completo",
                    "Visibilidade por área e estado",
                    "Painel de visualizações",
                  ]}
                  onSelecionar={() => abrirAssinar("mensal")}
                  testid="button-assinar-mensal"
                />
                <PlanoCard
                  destaque
                  titulo="Plano Anual"
                  preco="R$ 39,90"
                  periodo="/mês"
                  nota="Cobrado anualmente. Equivale a 2 meses grátis."
                  itens={[
                    "Tudo do plano mensal",
                    "Destaque nos resultados",
                    "Selo de perfil verificado",
                  ]}
                  onSelecionar={() => abrirAssinar("anual")}
                  testid="button-assinar-anual"
                />
              </div>
            </Card>
          )}

          {/* Assinatura existente (ativa, pendente ou atrasada) */}
          {ativa && status !== "inativa" && state && (
            <Card data-testid={`card-status-${status}`}>
              {status === "ativa" && !state.canceledAt && (
                <div className="flex items-center gap-2 text-lg font-bold" style={{ color: SUCCESS_COLOR }}>
                  <CheckCircle2 className="h-5 w-5" /> Assinatura Ativa
                </div>
              )}
              {status === "ativa" && state.canceledAt && (
                <div className="flex items-center gap-2 text-lg font-bold" style={{ color: WARNING_COLOR }}>
                  <Clock className="h-5 w-5" /> Renovação cancelada
                </div>
              )}
              {status === "pendente" && (
                <div className="flex items-center gap-2 text-lg font-bold" style={{ color: WARNING_COLOR }}>
                  <Clock className="h-5 w-5" /> Aguardando pagamento
                </div>
              )}
              {status === "atrasada" && (
                <div className="flex items-center gap-2 text-lg font-bold" style={{ color: WARNING_COLOR }}>
                  <AlertTriangle className="h-5 w-5" /> Pagamento em atraso
                </div>
              )}

              <div className="mt-4 space-y-1 text-neutral-700">
                <p className="font-medium">
                  {PLAN_LABEL[state.plan as Plano] ?? "Plano"}:{" "}
                  {state.value != null ? BRL.format(state.value) : ""}
                  {state.cycle === "MONTHLY" ? "/mês" : "/ano"}
                </p>
                {status === "pendente" && (
                  <p className="text-sm">
                    Finalize o pagamento com cartão de crédito para ativar seu
                    perfil. A assinatura é recorrente e renova automaticamente.
                  </p>
                )}
                {status === "atrasada" && (
                  <p className="text-sm">
                    Regularize o pagamento para manter seu perfil visível.
                  </p>
                )}
                {status === "ativa" && state.canceledAt && state.accessUntil && (
                  <p
                    className="text-sm font-medium"
                    style={{ color: WARNING_COLOR }}
                    data-testid="aviso-cancelamento"
                  >
                    A renovação automática foi cancelada. Seu perfil continua
                    ativo e visível até {formatDate(state.accessUntil)}. Depois
                    dessa data, ele deixa de aparecer nas buscas.
                  </p>
                )}
                {state.nextDueDate && !(status === "ativa" && state.canceledAt) && (
                  <p className="text-sm">
                    Próxima cobrança: {formatDate(state.nextDueDate)}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                {state.invoiceUrl && status !== "ativa" && (
                  <a
                    href={state.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-pagar"
                  >
                    <Button className="bg-primary-600 hover:bg-primary-700 text-white">
                      Pagar agora
                    </Button>
                  </a>
                )}
                {!(status === "ativa" && state.canceledAt) && (
                  <button
                    onClick={() => setCancelMode("cancelar")}
                    className="text-sm hover:underline"
                    style={{ color: ERROR_COLOR }}
                    data-testid="button-cancelar"
                  >
                    Cancelar assinatura
                  </button>
                )}
                {state.refundEligible && (
                  <button
                    onClick={() => setCancelMode("reembolso")}
                    className="text-sm text-neutral-500 hover:underline"
                    data-testid="button-reembolso"
                  >
                    Solicitar reembolso
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* Histórico de cobranças */}
          {state && state.payments.length > 0 && (
            <Card>
              <h2 className="text-lg font-bold text-primary-800 mb-4">
                Histórico de cobranças
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-neutral-500 border-b border-neutral-200">
                      <th className="text-left font-medium py-2 pr-4">Data</th>
                      <th className="text-left font-medium py-2 pr-4">
                        Descrição
                      </th>
                      <th className="text-right font-medium py-2 pr-4">Valor</th>
                      <th className="text-right font-medium py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.payments.map((c, i) => (
                      <tr
                        key={c.id}
                        className="border-b border-neutral-100 last:border-0"
                        data-testid={`cobranca-${i}`}
                      >
                        <td className="py-3 pr-4 text-neutral-700">
                          {formatDate(c.date) || "N/D"}
                        </td>
                        <td className="py-3 pr-4 text-neutral-700">
                          {c.description}
                        </td>
                        <td className="py-3 pr-4 text-right text-neutral-700">
                          {BRL.format(c.value)}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Nota de segurança */}
          <div className="rounded-lg bg-primary-50 border border-primary-100 p-4">
            <p className="text-sm text-neutral-700 flex items-start gap-2">
              <Lock className="h-4 w-4 mt-0.5 shrink-0 text-primary-600" />
              <span>
                O gerenciamento de pagamentos é processado de forma segura pelo
                Asaas, instituição de pagamento autorizada pelo Banco Central. A
                Terapia Que Cura não armazena dados do seu cartão de crédito.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Modal de cadastro para assinar */}
      <AssinarDialog
        open={showAssinar}
        onOpenChange={setShowAssinar}
        plano={planoEscolhido}
      />

      {/* Modal cancelar / reembolso (pesquisa de motivo + confirmação) */}
      <CancelarDialog
        modo={cancelMode ?? "cancelar"}
        open={cancelMode !== null}
        onOpenChange={(v) => {
          if (!v) setCancelMode(null);
        }}
        onConcluida={(novo) => {
          setState(novo);
          setCancelMode(null);
        }}
      />
    </DashboardLayout>
  );
}

const MOTIVOS_CANCELAMENTO = [
  "O valor está acima do meu orçamento",
  "Não recebi contatos suficientes",
  "Não estou usando a plataforma",
  "Encontrei outra plataforma melhor",
  "Vou pausar minha atuação por um tempo",
  "Tive problemas técnicos ou dificuldades de uso",
  "As funcionalidades não atenderam minhas expectativas",
  "Prefiro não informar",
];

function CancelarDialog({
  modo,
  open,
  onOpenChange,
  onConcluida,
}: {
  modo: "cancelar" | "reembolso";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConcluida: (state: SubscriptionState) => void;
}) {
  const isReembolso = modo === "reembolso";
  const [etapa, setEtapa] = useState<"motivo" | "visibilidade">("motivo");
  const [motivo, setMotivo] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Reinicia o fluxo sempre que o modal abre.
  useEffect(() => {
    if (open) {
      setEtapa("motivo");
      setMotivo(null);
      setCanceling(false);
      setErro(null);
    }
  }, [open]);

  async function confirmar() {
    setCanceling(true);
    setErro(null);
    try {
      const acao = isReembolso ? solicitarReembolso : cancelAssinatura;
      onConcluida(await acao(motivo ?? undefined));
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : isReembolso
            ? "Não foi possível solicitar o reembolso."
            : "Não foi possível cancelar.",
      );
      setCanceling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[460px] bg-white rounded-2xl"
        data-testid="modal-cancelar"
      >
        <DialogHeader>
          <DialogTitle className="sr-only">
            {isReembolso ? "Solicitar reembolso" : "Cancelar assinatura"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pesquisa de motivo e confirmação.
          </DialogDescription>
        </DialogHeader>

        {etapa === "motivo" ? (
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              {isReembolso
                ? "Antes de solicitar o reembolso, conte pra gente o motivo"
                : "Antes de cancelar, conte pra gente o motivo"}
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Sua resposta nos ajuda a melhorar a plataforma. Leva menos de um
              minuto.
            </p>

            <div className="mt-4 space-y-2">
              {MOTIVOS_CANCELAMENTO.map((m) => {
                const selecionado = motivo === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selecionado
                        ? "border-primary-500 bg-primary-50 text-primary-800"
                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                    data-testid={`motivo-${MOTIVOS_CANCELAMENTO.indexOf(m)}`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selecionado
                          ? "border-primary-600 bg-primary-600"
                          : "border-neutral-300"
                      }`}
                    >
                      {selecionado && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    {m}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-primary-300 text-primary-700 hover:bg-primary-50"
                onClick={() => onOpenChange(false)}
                data-testid="button-voltar-cancelar"
              >
                Voltar
              </Button>
              <Button
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                disabled={!motivo}
                onClick={() => setEtapa("visibilidade")}
                data-testid="button-continuar-cancelar"
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary-50 flex items-center justify-center">
              <Eye className="h-7 w-7 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-neutral-900">
              {isReembolso
                ? "Confirmar solicitação de reembolso?"
                : "Você deseja retirar a visibilidade do seu perfil?"}
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              {isReembolso
                ? "O valor pago será estornado e seu perfil será excluído permanentemente da plataforma. Essa ação não pode ser desfeita."
                : "Ao cancelar, seu perfil deixa de aparecer nas buscas ao fim do período já pago. Você pode estar abrindo mão de novos clientes."}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary-50 border border-primary-100 px-4 py-3">
              <TrendingUp className="h-5 w-5 text-primary-600 shrink-0" />
              <p className="text-sm font-semibold text-primary-800">
                Mais de 7.500 visitações/mês na plataforma
              </p>
            </div>

            {erro && (
              <p
                className="mt-3 text-sm"
                style={{ color: ERROR_COLOR }}
                data-testid="erro-cancelar"
              >
                {erro}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Button
                className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                onClick={() => onOpenChange(false)}
                data-testid="button-manter-perfil"
              >
                Manter meu perfil visível
              </Button>
              <button
                onClick={confirmar}
                disabled={canceling}
                className="text-sm hover:underline disabled:opacity-60"
                style={{ color: ERROR_COLOR }}
                data-testid="button-confirmar-cancelar"
              >
                {isReembolso
                  ? canceling
                    ? "Processando..."
                    : "Sim, solicitar reembolso e excluir meu perfil"
                  : canceling
                    ? "Cancelando..."
                    : "Sim, cancelar assinatura"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanoCard({
  titulo,
  preco,
  periodo,
  nota,
  itens,
  destaque = false,
  onSelecionar,
  testid,
}: {
  titulo: string;
  preco: string;
  periodo: string;
  nota: string;
  itens: string[];
  destaque?: boolean;
  onSelecionar: () => void;
  testid: string;
}) {
  return (
    <div
      className={`rounded-xl p-5 flex flex-col relative ${
        destaque ? "border-2 border-accent-500" : "border border-neutral-200"
      }`}
    >
      {destaque && (
        <span className="absolute -top-3 left-5 text-xs bg-accent-100 text-accent-600 rounded-full px-2.5 py-0.5 font-medium">
          Mais vantajoso
        </span>
      )}
      <p className="font-bold text-primary-800">{titulo}</p>
      <p className="mt-2 text-2xl font-bold text-primary-900">
        {preco}
        <span className="text-sm font-normal text-neutral-500">{periodo}</span>
      </p>
      <p className="text-sm text-neutral-500 mt-1">{nota}</p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-700 flex-1">
        {itens.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#1E7D4F]" /> {f}
          </li>
        ))}
      </ul>
      <Button
        className={`mt-4 w-full ${
          destaque
            ? "bg-primary-600 hover:bg-primary-700 text-white"
            : "border border-primary-300 bg-white text-primary-700 hover:bg-primary-50"
        }`}
        onClick={onSelecionar}
        data-testid={testid}
      >
        Assinar
      </Button>
    </div>
  );
}

function AssinarDialog({
  open,
  onOpenChange,
  plano,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plano: Plano;
}) {
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      setErro(null);
    }
  }, [open]);

  async function submit() {
    setErro(null);
    if (!nome.trim() || !cpfCnpj.trim()) {
      setErro("Preencha nome e CPF/CNPJ.");
      return;
    }
    setEnviando(true);
    try {
      const { checkoutUrl } = await createAssinatura({
        plano,
        nome: nome.trim(),
        cpfCnpj: cpfCnpj.trim(),
        telefone: telefone.trim() || undefined,
      });
      if (!checkoutUrl) {
        throw new Error("Não recebemos o link de pagamento. Tente novamente.");
      }
      // Redireciona para a página de checkout hospedada do Asaas (cartão).
      window.location.href = checkoutUrl;
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível criar a assinatura.",
      );
      setEnviando(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[460px] bg-white rounded-2xl"
        data-testid="modal-assinar"
      >
        <DialogHeader>
          <DialogTitle className="text-primary-800">
            Assinar {PLAN_LABEL[plano]}
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            Informe seus dados para continuar. O pagamento é com cartão de
            crédito, em uma assinatura recorrente, na próxima etapa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nome completo <span style={{ color: ERROR_COLOR }}>*</span>
            </label>
            <input
              className={inputCls}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Dr. Carlos Eduardo Mendes"
              data-testid="input-nome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              CPF ou CNPJ <span style={{ color: ERROR_COLOR }}>*</span>
            </label>
            <input
              className={inputCls}
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="000.000.000-00"
              data-testid="input-cpf"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              WhatsApp / Telefone
            </label>
            <input
              className={inputCls}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              data-testid="input-telefone"
            />
          </div>

          {erro && (
            <p className="text-sm" style={{ color: ERROR_COLOR }} data-testid="erro-form">
              {erro}
            </p>
          )}

          <Button
            className="w-full bg-primary-600 hover:bg-primary-700 text-white"
            disabled={enviando}
            onClick={submit}
            data-testid="button-confirmar-assinatura"
          >
            {enviando ? "Gerando cobrança..." : "Gerar cobrança"}
          </Button>
          <p className="text-xs text-neutral-500">
            Pagamento processado pelo Asaas. A Terapia Que Cura não armazena
            dados do seu cartão.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
