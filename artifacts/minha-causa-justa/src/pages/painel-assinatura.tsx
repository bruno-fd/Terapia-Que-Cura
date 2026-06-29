import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  Lock,
  Clock,
  Loader2,
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
  type SubscriptionState,
} from "@/lib/assinatura";

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
  const [showCancelar, setShowCancelar] = useState(false);
  const [canceling, setCanceling] = useState(false);

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

  async function confirmarCancelamento() {
    setCanceling(true);
    try {
      setState(await cancelAssinatura());
      setShowCancelar(false);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Não foi possível cancelar.",
      );
    } finally {
      setCanceling(false);
    }
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
              {status === "ativa" && (
                <div className="flex items-center gap-2 text-lg font-bold" style={{ color: SUCCESS_COLOR }}>
                  <CheckCircle2 className="h-5 w-5" /> Assinatura Ativa
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
                    Finalize o pagamento para ativar seu perfil. Você pode pagar
                    com PIX, boleto ou cartão.
                  </p>
                )}
                {status === "atrasada" && (
                  <p className="text-sm">
                    Regularize o pagamento para manter seu perfil visível.
                  </p>
                )}
                {state.nextDueDate && (
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
                <button
                  onClick={() => setShowCancelar(true)}
                  className="text-sm hover:underline"
                  style={{ color: ERROR_COLOR }}
                  data-testid="button-cancelar"
                >
                  Cancelar assinatura
                </button>
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
                Minha Causa Justa não armazena dados do seu cartão de crédito.
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
        onCriada={(novo) => {
          setState(novo);
          setShowAssinar(false);
        }}
      />

      {/* Modal cancelar */}
      <Dialog open={showCancelar} onOpenChange={setShowCancelar}>
        <DialogContent
          className="sm:max-w-[440px] bg-white rounded-2xl text-center"
          data-testid="modal-cancelar"
        >
          <DialogHeader>
            <DialogTitle className="sr-only">Cancelar assinatura</DialogTitle>
            <DialogDescription className="sr-only">
              Confirme o cancelamento da assinatura.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-[#B97D00]/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-[#B97D00]" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-neutral-900">
              Tem certeza que deseja cancelar?
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              Ao cancelar, seu perfil será desativado e não aparecerá mais nas
              buscas da plataforma.
            </p>
            <div className="mt-6 flex w-full gap-3">
              <Button
                variant="outline"
                className="flex-1 border-primary-300 text-primary-700 hover:bg-primary-50"
                onClick={() => setShowCancelar(false)}
                data-testid="button-voltar-cancelar"
              >
                Voltar
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ background: ERROR_COLOR }}
                disabled={canceling}
                onClick={confirmarCancelamento}
                data-testid="button-confirmar-cancelar"
              >
                {canceling ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
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
  onCriada,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plano: Plano;
  onCriada: (state: SubscriptionState) => void;
}) {
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
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
    if (!nome.trim() || !cpfCnpj.trim() || !email.trim()) {
      setErro("Preencha nome, CPF/CNPJ e e-mail.");
      return;
    }
    setEnviando(true);
    try {
      const novo = await createAssinatura({
        plano,
        nome: nome.trim(),
        cpfCnpj: cpfCnpj.trim(),
        email: email.trim(),
        telefone: telefone.trim() || undefined,
      });
      onCriada(novo);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível criar a assinatura.",
      );
    } finally {
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
            Informe seus dados para gerar a cobrança. Você escolhe pagar com
            PIX, boleto ou cartão na próxima etapa.
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
              E-mail <span style={{ color: ERROR_COLOR }}>*</span>
            </label>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              data-testid="input-email"
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
            Pagamento processado pelo Asaas. A Minha Causa Justa não armazena
            dados do seu cartão.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
