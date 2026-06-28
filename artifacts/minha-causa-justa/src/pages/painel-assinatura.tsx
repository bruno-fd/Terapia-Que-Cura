import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Check, Lock } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Status = "ativa" | "atrasada" | "inativa";

interface Charge {
  data: string;
  desc: string;
  valor: string;
  status: "Pago" | "Falhou" | "Pendente";
}

const CHARGES: Charge[] = [
  { data: "01/06/2026", desc: "Plano Mensal", valor: "R$ 49,90", status: "Pago" },
  { data: "01/05/2026", desc: "Plano Mensal", valor: "R$ 49,90", status: "Pago" },
  { data: "01/04/2026", desc: "Plano Mensal", valor: "R$ 49,90", status: "Pago" },
  { data: "01/03/2026", desc: "Plano Mensal", valor: "R$ 49,90", status: "Falhou" },
  { data: "01/03/2026", desc: "Plano Mensal, Retentativa", valor: "R$ 49,90", status: "Pago" },
  { data: "01/02/2026", desc: "Plano Mensal", valor: "R$ 49,90", status: "Pago" },
];

const STATUS_BADGE: Record<Charge["status"], string> = {
  Pago: "bg-[#1E7D4F]/10 text-[#1E7D4F]",
  Falhou: "bg-[#C0392B]/10 text-[#C0392B]",
  Pendente: "bg-[#B97D00]/10 text-[#B97D00]",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-neutral-200 p-6 ${className}`}>{children}</div>;
}

export default function PainelAssinatura() {
  const [status, setStatus] = useState<Status>("ativa");
  const [showPlanos, setShowPlanos] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);

  return (
    <DashboardLayout active="assinatura">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-800">Minha Assinatura</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gerencie seu plano e acompanhe o status da sua assinatura.
        </p>
      </div>

      {/* Toggle de demonstração */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-neutral-500">Demonstração:</span>
        {([
          ["ativa", "Ativa"],
          ["atrasada", "Atrasada"],
          ["inativa", "Inativa"],
        ] as [Status, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`px-3 py-1 rounded-full border transition-colors ${
              status === key
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-white text-neutral-600 border-neutral-300 hover:bg-primary-50"
            }`}
            data-testid={`status-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* Card de status */}
        <Card>
          {status === "ativa" && (
            <div data-testid="card-status-ativa">
              <div className="flex items-center gap-2 text-[#1E7D4F] text-lg font-bold">
                <CheckCircle2 className="h-5 w-5" /> Assinatura Ativa
              </div>
              <div className="mt-4 space-y-1 text-neutral-700">
                <p className="font-medium">Plano Mensal: R$ 49,90/mês</p>
                <p className="text-sm">Próxima cobrança: 28 de julho de 2026</p>
                <p className="text-sm">Membro desde: 1 de junho de 2026</p>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button
                  variant="outline"
                  className="border-primary-300 text-primary-700 hover:bg-primary-50"
                  onClick={() => setShowPlanos(true)}
                  data-testid="button-mudar-plano"
                >
                  Mudar de plano
                </Button>
                <button
                  onClick={() => setShowCancelar(true)}
                  className="text-sm text-[#C0392B] hover:underline"
                  data-testid="button-cancelar"
                >
                  Cancelar assinatura
                </button>
              </div>
            </div>
          )}

          {status === "atrasada" && (
            <div data-testid="card-status-atrasada">
              <div className="flex items-center gap-2 text-[#B97D00] text-lg font-bold">
                <AlertTriangle className="h-5 w-5" /> Pagamento em atraso
              </div>
              <div className="mt-4 space-y-1 text-neutral-700">
                <p>Seu perfil está suspenso temporariamente desde 15 de junho de 2026.</p>
                <p className="text-sm">Atualize seu método de pagamento para reativar automaticamente.</p>
              </div>
              <Button
                className="mt-5 bg-primary-600 hover:bg-primary-700 text-white"
                data-testid="button-regularizar"
              >
                Regularizar pagamento
              </Button>
            </div>
          )}

          {status === "inativa" && (
            <div data-testid="card-status-inativa">
              <div className="flex items-center gap-2 text-[#C0392B] text-lg font-bold">
                <XCircle className="h-5 w-5" /> Assinatura Inativa
              </div>
              <div className="mt-4 space-y-1 text-neutral-700">
                <p>Seu perfil não está visível na plataforma.</p>
                <p className="text-sm">Reative sua assinatura para voltar a aparecer nas buscas.</p>
              </div>
              <Button
                className="mt-5 bg-primary-600 hover:bg-primary-700 text-white"
                onClick={() => setShowPlanos(true)}
                data-testid="button-reativar"
              >
                Reativar assinatura
              </Button>
            </div>
          )}
        </Card>

        {/* Histórico de cobranças */}
        <Card>
          <h2 className="text-lg font-bold text-primary-800 mb-4">Histórico de cobranças</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-200">
                  <th className="text-left font-medium py-2 pr-4">Data</th>
                  <th className="text-left font-medium py-2 pr-4">Descrição</th>
                  <th className="text-right font-medium py-2 pr-4">Valor</th>
                  <th className="text-right font-medium py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {CHARGES.map((c, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0" data-testid={`cobranca-${i}`}>
                    <td className="py-3 pr-4 text-neutral-700">{c.data}</td>
                    <td className="py-3 pr-4 text-neutral-700">{c.desc}</td>
                    <td className="py-3 pr-4 text-right text-neutral-700">{c.valor}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-block mt-4 text-sm text-primary-500 hover:text-primary-600"
            data-testid="link-historico-completo"
          >
            Ver histórico completo →
          </a>
        </Card>

        {/* Nota de segurança */}
        <div className="rounded-lg bg-primary-50 border border-primary-100 p-4">
          <p className="text-sm text-neutral-700 flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 shrink-0 text-primary-600" />
            <span>
              O gerenciamento de pagamentos é processado de forma segura pelo Asaas, instituição de
              pagamento autorizada pelo Banco Central. A Minha Causa Justa não armazena dados do seu
              cartão de crédito.
            </span>
          </p>
        </div>
      </div>

      {/* Modal mudar de plano */}
      <Dialog open={showPlanos} onOpenChange={setShowPlanos}>
        <DialogContent className="sm:max-w-[520px] bg-white rounded-2xl" data-testid="modal-planos">
          <DialogHeader>
            <DialogTitle className="text-primary-800">Escolha seu plano</DialogTitle>
            <DialogDescription className="sr-only">Compare os planos disponíveis.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mensal */}
            <div className="rounded-xl border border-neutral-200 p-5 flex flex-col">
              <p className="font-bold text-primary-800">Plano Mensal</p>
              <p className="mt-2 text-2xl font-bold text-primary-900">R$ 49,90<span className="text-sm font-normal text-neutral-500">/mês</span></p>
              <p className="text-sm text-neutral-500 mt-1">Cancele quando quiser</p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-700 flex-1">
                {["Perfil completo", "Visibilidade por área e estado", "Painel de visualizações", "Atualização a qualquer momento"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#1E7D4F]" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="mt-4 w-full border-primary-300 text-primary-700 hover:bg-primary-50"
                onClick={() => setShowPlanos(false)}
                data-testid="button-selecionar-mensal"
              >
                Selecionar
              </Button>
            </div>

            {/* Anual */}
            <div className="rounded-xl border-2 border-accent-500 p-5 flex flex-col relative">
              <span className="absolute -top-3 left-5 text-xs bg-accent-100 text-accent-600 rounded-full px-2.5 py-0.5 font-medium">
                Mais vantajoso
              </span>
              <p className="font-bold text-primary-800">Plano Anual</p>
              <p className="mt-2 text-2xl font-bold text-primary-900">R$ 39,90<span className="text-sm font-normal text-neutral-500">/mês</span></p>
              <p className="text-sm text-neutral-500 mt-1">Cobrado anualmente. Equivale a 2 meses grátis.</p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-700 flex-1">
                {["Tudo do plano mensal", "Destaque nos resultados", "Selo de perfil verificado"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#1E7D4F]" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white"
                onClick={() => setShowPlanos(false)}
                data-testid="button-selecionar-anual"
              >
                Selecionar
              </Button>
            </div>
          </div>

          <p className="text-xs text-neutral-500 mt-2">
            Pagamento processado pelo Asaas. A Minha Causa Justa não armazena dados do seu cartão.
          </p>
        </DialogContent>
      </Dialog>

      {/* Modal cancelar */}
      <Dialog open={showCancelar} onOpenChange={setShowCancelar}>
        <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl text-center" data-testid="modal-cancelar">
          <DialogHeader>
            <DialogTitle className="sr-only">Cancelar assinatura</DialogTitle>
            <DialogDescription className="sr-only">Confirme o cancelamento da assinatura.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-[#B97D00]/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-[#B97D00]" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-neutral-900">Tem certeza que deseja cancelar?</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Ao cancelar, seu perfil será desativado ao final do período já pago e não aparecerá mais nas
              buscas da plataforma. Essa ação não pode ser desfeita.
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
                className="flex-1 bg-[#C0392B] hover:bg-[#A93226] text-white"
                onClick={() => {
                  setStatus("inativa");
                  setShowCancelar(false);
                }}
                data-testid="button-confirmar-cancelar"
              >
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
