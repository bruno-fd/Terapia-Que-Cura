import { useState } from "react";
import { Link } from "wouter";
import { Eye, Phone, Target, TrendingUp, ArrowUp, Rocket, Check } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useGetPerfil } from "@workspace/api-client-react";

type Period = "mes" | "trimestre" | "total";

// Janela inicial de indexação: nos primeiros 15 dias de cadastro o advogado vê
// a tela de boas-vindas; depois disso as métricas passam a aparecer sozinhas.
const DIAS_INDEXACAO = 15;

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const criado = new Date(iso).getTime();
  if (Number.isNaN(criado)) return null;
  const ms = Date.now() - criado;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Dados fictícios por período (Estado B)
const PERIOD_DATA: Record<Period, { views: number; viewsTrend: number; contacts: number; contactsTrend: number }> = {
  mes: { views: 47, viewsTrend: 31, contacts: 8, contactsTrend: 60 },
  trimestre: { views: 95, viewsTrend: 22, contacts: 17, contactsTrend: 41 },
  total: { views: 134, viewsTrend: 0, contacts: 23, contactsTrend: 0 },
};

const CHART: { mes: string; valor: number; indexing?: boolean }[] = [
  { mes: "Jan", valor: 0, indexing: true },
  { mes: "Fev", valor: 12 },
  { mes: "Mar", valor: 19 },
  { mes: "Abr", valor: 28 },
  { mes: "Mai", valor: 36 },
  { mes: "Jun", valor: 47 },
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-neutral-200 p-6 ${className}`}>{children}</div>;
}

export default function PainelMetricas() {
  const [period, setPeriod] = useState<Period>("mes");
  const { data: profile } = useGetPerfil();
  const hasPhoto = !!profile?.photo;
  const areasCount = profile?.areas.length ?? 0;

  // Ainda dentro dos primeiros 15 dias de cadastro: mostra a tela de indexação.
  // Depois disso, as métricas aparecem automaticamente.
  const dias = diasDesde(profile?.createdAt);
  const indexando = dias !== null && dias < DIAS_INDEXACAO;

  const data = PERIOD_DATA[period];
  const conversion = data.views > 0 ? Math.round((data.contacts / data.views) * 100) : 0;

  // Rótulo de foco: área principal, tema específico (se houver) e estado.
  const areaPrincipal = profile?.areas[0] ?? "sua área";
  const temaPrincipal = profile?.subcategorias[0];
  const ufPrincipal = profile?.cidades[0]?.uf;
  const focoLabel = `${areaPrincipal}${temaPrincipal ? ` (${temaPrincipal})` : ""}${ufPrincipal ? ` em ${ufPrincipal}` : ""}`;

  return (
    <DashboardLayout active="metricas">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Desempenho do Perfil</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Veja como seu perfil está sendo encontrado na plataforma.
          </p>
        </div>
        {!indexando && (
          <div className="flex items-center gap-3 text-sm shrink-0">
            {([
              ["mes", "Este mês"],
              ["trimestre", "Últimos 3 meses"],
              ["total", "Total"],
            ] as [Period, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`transition-colors ${
                  period === key ? "text-primary-500 font-bold" : "text-neutral-500 hover:text-primary-500"
                }`}
                data-testid={`period-${key}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {indexando ? (
        <WelcomeState hasPhoto={hasPhoto} />
      ) : (
        <MetricsState
          data={data}
          conversion={conversion}
          hasPhoto={hasPhoto}
          areasCount={areasCount}
          focoLabel={focoLabel}
        />
      )}
    </DashboardLayout>
  );
}

// Estado A — primeiros quinze dias (indexação)
function WelcomeState({ hasPhoto }: { hasPhoto: boolean }) {
  void hasPhoto;
  return (
    <Card className="bg-primary-50 border-primary-100 text-center max-w-[680px] mx-auto p-8">
      <div className="text-5xl mb-2">
        <Rocket className="h-12 w-12 mx-auto text-primary-500" />
      </div>
      <h2 className="text-xl font-bold text-primary-800">Seu perfil está sendo indexado</h2>
      <p className="mt-2 text-neutral-700">
        Os dados de visualização ficam disponíveis após os primeiros quinze dias. Nesse período, a plataforma está
        distribuindo seu perfil nas buscas e o Google está indexando suas informações.
      </p>

      <div className="mt-6 text-left">
        <p className="text-sm font-medium text-neutral-700 mb-1.5">Indexação do perfil</p>
        <div className="h-2 rounded-full bg-primary-100 overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full" style={{ width: "60%" }} />
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Seu perfil já está visível. Os primeiros dados chegam em breve.
        </p>
      </div>

      <div className="mt-6 text-left">
        <p className="font-bold text-primary-800 mb-3">Enquanto isso, otimize seu perfil:</p>
        <ul className="space-y-3">
          {[
            "Perfis com foto recebem 3x mais visualizações",
            "Advogados com 3 ou mais áreas selecionadas aparecem em mais buscas",
            "Uma descrição clara no 'Sobre mim' aumenta os cliques em contato",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-sm text-neutral-700">
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#1E7D4F]" />
              <span>
                {tip}{" "}
                <Link href="/painel/perfil" className="text-primary-500 hover:text-primary-600 whitespace-nowrap">
                  → Editar perfil
                </Link>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

// Estado B — métricas
function MetricsState({
  data,
  conversion,
  hasPhoto,
  areasCount,
  focoLabel,
}: {
  data: typeof PERIOD_DATA[Period];
  conversion: number;
  hasPhoto: boolean;
  areasCount: number;
  focoLabel: string;
}) {
  const tips: string[] = [];
  if (!hasPhoto)
    tips.push("📷 Adicione uma foto ao seu perfil, perfis com foto recebem 3x mais visualizações.");
  if (areasCount < 3)
    tips.push("✅ Selecione mais áreas de atuação para aparecer em mais buscas.");
  if (conversion < 10)
    tips.push("✏️ Reescreva seu 'Sobre mim' focando no que você resolve, não onde se formou.");

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          icon={<Phone className="h-5 w-5" />}
          iconBg="bg-accent-500"
          iconColor="text-white"
          value={String(data.contacts)}
          valueColor="text-accent-500"
          valueSize="text-4xl"
          label="Cliques em contato"
          trend={data.contactsTrend ? `↑ ${data.contactsTrend}% em relação ao mês anterior` : "Acumulado do período"}
          trendColor={data.contactsTrend ? "text-[#1E7D4F]" : "text-neutral-500"}
          badge="Principal"
          cardClassName="bg-accent-100"
        />
        <MetricCard
          icon={<Eye className="h-5 w-5" />}
          iconBg="bg-primary-100"
          iconColor="text-primary-500"
          value={String(data.views)}
          valueColor="text-primary-500"
          label="Visualizações"
          trend={data.viewsTrend ? `↑ ${data.viewsTrend}% em relação ao mês anterior` : "Acumulado do período"}
          trendColor={data.viewsTrend ? "text-[#1E7D4F]" : "text-neutral-500"}
        />
        <MetricCard
          icon={<Target className="h-5 w-5" />}
          iconBg="bg-[#1E7D4F]/15"
          iconColor="text-[#1E7D4F]"
          value={`${conversion}%`}
          valueColor="text-[#1E7D4F]"
          label="Taxa de conversão"
          sub="Cliques ÷ visualizações"
          trend="Média da plataforma: 14%"
          trendColor="text-neutral-500"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-primary-100"
          iconColor="text-primary-500"
          stacked={["134 visualizações", "23 contatos"]}
          label="Desde o cadastro"
          sub="Membro há 3 meses"
        />
      </div>

      {/* Posição relativa */}
      <Card>
        <h2 className="text-lg font-bold text-primary-800 mb-4">Seu perfil na plataforma</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-neutral-500">Você está entre os</p>
            <p className="text-2xl font-bold text-[#1E7D4F] mt-0.5">Top 30%</p>
            <p className="text-sm text-neutral-500">perfis mais visualizados em {focoLabel}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-3">Visualizações este mês</p>
            <CompareBar label="Você" value={47} max={47} color="bg-primary-500" />
            <div className="h-3" />
            <CompareBar label="Média" value={38} max={47} color="bg-neutral-300" />
          </div>
        </div>
      </Card>

      {/* Gráfico de histórico */}
      <Card>
        <h2 className="text-lg font-bold text-primary-800">Histórico de visualizações</h2>
        <p className="text-sm text-neutral-500 mb-4">De fevereiro a junho</p>
        <HistoryChart />
      </Card>

      {/* Dicas contextuais */}
      <Card className="bg-primary-50 border-primary-100">
        <h2 className="text-base font-bold text-primary-800 mb-3">Como melhorar seu desempenho</h2>
        {tips.length > 0 ? (
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="text-sm text-neutral-700">
                {tip}{" "}
                <Link href="/painel/perfil" className="text-primary-500 hover:text-primary-600 whitespace-nowrap">
                  → Editar perfil
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-700 flex items-center gap-2">
            <span aria-hidden className="text-base">🏆</span> Seu perfil está bem configurado. Continue assim!
          </p>
        )}
      </Card>

      {/* Nota de transparência */}
      <p className="text-xs text-neutral-500 text-center max-w-[680px] mx-auto">
        Os dados são atualizados diariamente. Visualizações correspondem a acessos únicos ao seu perfil.
        Cliques em contato correspondem a cliques no botão de WhatsApp ou e-mail do seu perfil.
      </p>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value?: string;
  valueColor?: string;
  valueSize?: string;
  stacked?: string[];
  label: string;
  sub?: string;
  trend?: string;
  trendColor?: string;
  badge?: string;
  cardClassName?: string;
}

function MetricCard({
  icon,
  iconBg,
  iconColor,
  value,
  valueColor,
  valueSize = "text-3xl",
  stacked,
  label,
  sub,
  trend,
  trendColor,
  badge,
  cardClassName = "",
}: MetricCardProps) {
  const numberSpacing = trend ? "mt-1" : "mt-3";
  return (
    <Card className={`p-5 ${cardClassName}`}>
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        {badge && (
          <span className="text-xs bg-accent-500 text-white rounded-full px-2.5 py-0.5 font-bold">
            {badge}
          </span>
        )}
      </div>
      {trend && <p className={`mt-3 text-sm font-medium ${trendColor}`}>{trend}</p>}
      {stacked ? (
        <div className={`${numberSpacing} space-y-0.5`}>
          {stacked.map((s) => (
            <p key={s} className="text-xl font-bold text-primary-800">{s}</p>
          ))}
        </div>
      ) : (
        <p className={`${numberSpacing} ${valueSize} font-bold ${valueColor}`}>{value}</p>
      )}
      <p className="mt-1 text-sm text-neutral-500">{label}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </Card>
  );
}

function CompareBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm text-neutral-600 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HistoryChart() {
  const [hover, setHover] = useState<number | null>(null);
  const [infoHover, setInfoHover] = useState(false);
  const width = 520;
  const height = 200;
  const padBottom = 28;
  const padTop = 16;
  const dataVals = CHART.filter((d) => !d.indexing).map((d) => d.valor);
  const max = Math.max(...dataVals, 1);
  const avg = dataVals.reduce((s, v) => s + v, 0) / dataVals.length;
  const barW = 40;
  const gap = (width - barW * CHART.length) / (CHART.length + 1);
  const chartH = height - padBottom - padTop;
  const avgY = padTop + chartH - (avg / max) * chartH;
  const janCx = gap + barW / 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[420px]"
        role="img"
        aria-label="Gráfico de visualizações dos últimos meses"
      >
        {/* Linha de média */}
        <line
          x1={0}
          y1={avgY}
          x2={width}
          y2={avgY}
          stroke="var(--neutral-300)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text x={width} y={avgY - 4} textAnchor="end" className="fill-neutral-500" fontSize={10}>
          Média {Math.round(avg)}
        </text>

        {CHART.map((d, i) => {
          const x = gap + i * (barW + gap);
          const cx = x + barW / 2;

          if (d.indexing) {
            return (
              <g
                key={d.mes}
                style={{ cursor: "help" }}
                onMouseEnter={() => setInfoHover(true)}
                onMouseLeave={() => setInfoHover(false)}
              >
                {/* Espaço indicativo: linha vertical tracejada */}
                <line
                  x1={cx}
                  y1={padTop}
                  x2={cx}
                  y2={padTop + chartH}
                  stroke="var(--neutral-300)"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-neutral-400" fontSize={11}>
                  {d.mes} ⓘ
                </text>
              </g>
            );
          }

          const barH = (d.valor / max) * chartH;
          const y = padTop + chartH - barH;
          const isCurrent = i === CHART.length - 1;
          return (
            <g key={d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                className={isCurrent ? "fill-primary-500" : "fill-primary-200"}
              />
              {hover === i && (
                <text x={cx} y={y - 6} textAnchor="middle" className="fill-primary-800 font-bold" fontSize={12}>
                  {d.valor}
                </text>
              )}
              <text x={cx} y={height - 8} textAnchor="middle" className="fill-neutral-500" fontSize={11}>
                {d.mes}
              </text>
            </g>
          );
        })}

        {/* Tooltip do indicador de indexação */}
        {infoHover && (
          <g>
            <rect
              x={Math.min(Math.max(janCx - 16, 4), width - 254)}
              y={padTop}
              width={250}
              height={44}
              rx={6}
              className="fill-primary-800"
            />
            <text
              x={Math.min(Math.max(janCx - 16, 4), width - 254) + 12}
              y={padTop + 18}
              fontSize={11}
              className="fill-white"
            >
              Período de indexação:
            </text>
            <text
              x={Math.min(Math.max(janCx - 16, 4), width - 254) + 12}
              y={padTop + 33}
              fontSize={11}
              className="fill-white"
            >
              dados não disponíveis no primeiro mês.
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
