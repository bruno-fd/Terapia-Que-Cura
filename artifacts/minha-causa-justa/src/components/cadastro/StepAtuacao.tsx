import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import {
  contarPsicologos,
  type ConcorrenciaResult,
} from "@workspace/api-client-react";
import { AREAS, PUBLICO_ATENDIDO } from "@/lib/dashboard";
import { iniciarCheckout } from "@/lib/assinatura";
import {
  PLANOS,
  type FunnelData,
  type Plano,
} from "@/lib/cadastro-funnel";
import {
  ArrowLeft,
  X,
  Loader2,
  Users,
  Check,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Video,
} from "lucide-react";
import { ProvaSocial, PROVA_SOCIAL } from "@/components/cadastro/ProvaSocial";

interface Props {
  data: FunnelData;
  update: (patch: Partial<FunnelData>) => void;
  onBack: () => void;
  // Marca o lead como concluído no back-end (best-effort) ao iniciar o checkout.
  onConcluir: () => void;
}

// Mensagem sempre positiva, em faixas, reforçando a demanda sem desmotivar.
function mensagemConcorrencia(
  count: number,
  area: string,
  local: string,
): string {
  if (count <= 0) {
    return `Você pode ser um dos primeiros em ${area} em ${local}. Quem chega cedo aparece primeiro para quem procura.`;
  }
  if (count <= 5) {
    return `Espaço aberto: poucos psicólogos de ${area} aparecem em ${local}. É a hora ideal para garantir destaque.`;
  }
  if (count <= 20) {
    return `A procura por ${area} em ${local} está aquecida. Com um perfil completo, você se destaca dos demais.`;
  }
  return `${area} é muito buscada em ${local}. Há bastante demanda; um perfil bem feito coloca você na frente.`;
}

export function StepAtuacao({ data, update, onBack, onConcluir }: Props) {
  const [selectedUf, setSelectedUf] = useState("");
  const [areaErro, setAreaErro] = useState("");
  const [localErro, setLocalErro] = useState("");
  const [counts, setCounts] = useState<ConcorrenciaResult | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  // Modalidade presencial: derivada de já haver cidades salvas.
  const [presencial, setPresencial] = useState(() => data.cidades.length > 0);
  // Checkout (antes na etapa 3, agora concluído aqui).
  const [checkoutErro, setCheckoutErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const plano: Plano = data.plano ?? "mensal";

  const primeiraArea = data.areas[0] ?? "";
  const primeiraCidade = data.cidades[0];
  // O card só aparece com cidade E ao menos uma área.
  const mostrarCard = !!primeiraArea && !!primeiraCidade;

  // Busca a contagem real quando há cidade + área.
  useEffect(() => {
    if (!mostrarCard || !primeiraCidade) {
      setCounts(null);
      return;
    }
    let ativo = true;
    setLoadingCount(true);
    contarPsicologos({
      area: primeiraArea,
      cidade: primeiraCidade.nome,
      uf: primeiraCidade.uf,
    })
      .then((r) => {
        if (ativo) setCounts(r);
      })
      .catch(() => {
        if (ativo) setCounts(null);
      })
      .finally(() => {
        if (ativo) setLoadingCount(false);
      });
    return () => {
      ativo = false;
    };
  }, [mostrarCard, primeiraArea, primeiraCidade?.nome, primeiraCidade?.uf]);

  const toggleArea = (area: string) => {
    setAreaErro("");
    update({
      areas: data.areas.includes(area)
        ? data.areas.filter((a) => a !== area)
        : [...data.areas, area],
    });
  };

  const togglePublico = (publico: string) => {
    update({
      publicoAtendido: data.publicoAtendido.includes(publico)
        ? data.publicoAtendido.filter((p) => p !== publico)
        : [...data.publicoAtendido, publico],
    });
  };

  const toggleOnline = () => {
    update({ atendeOnline: !data.atendeOnline });
    setLocalErro("");
  };

  const togglePresencial = () => {
    const novo = !presencial;
    setPresencial(novo);
    setLocalErro("");
    if (!novo) {
      // Desmarcou presencial: as cidades deixam de valer.
      update({ cidades: [] });
      setSelectedUf("");
    }
  };

  const addCidade = (nome: string) => {
    if (!selectedUf) return;
    if (data.cidades.some((c) => c.nome === nome && c.uf === selectedUf)) return;
    setLocalErro("");
    update({ cidades: [...data.cidades, { nome, uf: selectedUf }] });
  };

  const removeCidade = (nome: string, uf: string) => {
    update({
      cidades: data.cidades.filter((c) => !(c.nome === nome && c.uf === uf)),
    });
  };

  const validar = () => {
    let ok = true;
    if (data.areas.length === 0) {
      setAreaErro("Selecione ao menos uma área de atuação.");
      ok = false;
    }
    if (!data.atendeOnline && !presencial) {
      setLocalErro(
        "Marque ao menos uma forma de atendimento: online ou presencial.",
      );
      ok = false;
    } else if (presencial && data.cidades.length === 0) {
      setLocalErro("Adicione a cidade onde você atende presencialmente.");
      ok = false;
    }
    return ok;
  };

  // Valida a etapa e vai direto para o pagamento (checkout hospedado do Asaas).
  const irParaPagamento = async () => {
    setCheckoutErro("");
    if (!validar()) return;
    const cpfDigitos = data.cpf.replace(/\D/g, "");
    if (cpfDigitos.length < 11) {
      setCheckoutErro(
        "Não encontramos um CPF válido do seu cadastro. Volte à primeira etapa.",
      );
      return;
    }
    // Cadastros retomados de antes do telefone ser obrigatório podem chegar
    // aqui sem ele.
    const telDigitos = data.telefone.replace(/\D/g, "");
    if (telDigitos.length < 10 || telDigitos.length > 11) {
      setCheckoutErro(
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
      // Navega no topo da janela: no preview do Replit o app roda num iframe
      // e a Asaas bloqueia ser carregada dentro de iframes ("recusou a conexão").
      try {
        if (window.top) {
          window.top.location.href = checkoutUrl;
          return;
        }
      } catch {
        // acesso ao topo negado — segue com a navegação local
      }
      window.location.href = checkoutUrl;
    } catch (e) {
      setCheckoutErro(
        e instanceof Error
          ? e.message
          : "Não foi possível iniciar o pagamento. Tente novamente.",
      );
      setEnviando(false);
    }
  };

  const localLabel = primeiraCidade
    ? `${primeiraCidade.nome}, ${primeiraCidade.uf}`
    : "todo o Brasil";

  const badgeClass = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
      active
        ? "bg-primary-500 text-white border-primary-500"
        : "bg-white text-primary-800 border-primary-300 hover:bg-primary-50"
    }`;

  // Card de modalidade (online/presencial): grande, clicável e claro no mobile.
  const modalidadeCard = (active: boolean) =>
    `relative flex items-start gap-3 rounded-2xl border-2 p-4 sm:p-5 text-left transition-all w-full ${
      active
        ? "border-accent-500 bg-accent-50/50 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
        : "border-neutral-200 bg-white hover:border-primary-300"
    }`;

  return (
    <div data-testid="step-atuacao">
      <ProvaSocial>{PROVA_SOCIAL.atuacao}</ProvaSocial>
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        Onde e em que você atua
      </h2>
      <p className="text-neutral-600 mb-8">
        Isso define para quem o seu perfil aparece nas buscas.
      </p>

      <div>
        <h3 className="text-sm font-bold text-neutral-700 mb-3">
          Como você atende?<span className="text-[#C0392B]"> *</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={toggleOnline}
            className={modalidadeCard(data.atendeOnline)}
            aria-pressed={data.atendeOnline}
            data-testid="toggle-online"
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                data.atendeOnline
                  ? "border-accent-500 bg-accent-500 text-white"
                  : "border-neutral-300 bg-white text-transparent"
              }`}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-bold text-primary-900">
                <Video className="h-4 w-4 text-primary-600" strokeWidth={2} />
                Atendimento online
              </span>
              <span className="mt-1 block text-sm text-neutral-600">
                Seu perfil aparece para todo o Brasil
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={togglePresencial}
            className={modalidadeCard(presencial)}
            aria-pressed={presencial}
            data-testid="toggle-presencial"
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                presencial
                  ? "border-accent-500 bg-accent-500 text-white"
                  : "border-neutral-300 bg-white text-transparent"
              }`}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-bold text-primary-900">
                <MapPin className="h-4 w-4 text-primary-600" strokeWidth={2} />
                Atendimento presencial
              </span>
              <span className="mt-1 block text-sm text-neutral-600">
                Você aparece nas buscas da sua cidade
              </span>
            </span>
          </button>
        </div>

        {presencial && (
          <div
            className="mt-3 rounded-2xl border border-primary-100 bg-primary-50/50 p-4 sm:p-5"
            data-testid="bloco-presencial"
          >
            <p className="mb-3 text-sm font-bold text-neutral-700">
              Em qual cidade você atende presencialmente?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
              <StateAutocomplete
                value={selectedUf}
                onSelect={setSelectedUf}
                placeholder="Estado (UF)"
                inputClassName="w-full bg-white pr-10"
                testId="select-estado"
              />
              {selectedUf ? (
                <CityAutocomplete
                  uf={selectedUf}
                  onSelect={addCidade}
                  testId="autocomplete-cidade"
                />
              ) : (
                <div className="flex h-12 items-center rounded-lg border border-dashed border-neutral-300 bg-white/60 px-4 text-sm text-neutral-400">
                  Escolha o estado para buscar a cidade
                </div>
              )}
            </div>

            {data.cidades.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.cidades.map((c) => (
                  <span
                    key={`${c.nome}-${c.uf}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-sm text-primary-800"
                    data-testid={`tag-cidade-${c.nome}-${c.uf}`}
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary-500" />
                    {c.nome}, {c.uf}
                    <button
                      type="button"
                      onClick={() => removeCidade(c.nome, c.uf)}
                      className="rounded-full p-0.5 text-primary-600 transition-colors hover:bg-primary-100 hover:text-primary-900"
                      aria-label={`Remover ${c.nome}, ${c.uf}`}
                      data-testid={`button-remover-cidade-${c.nome}-${c.uf}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {data.atendeOnline && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#1E7D4F]/30 bg-[#1E7D4F]/10 px-3 py-1.5 text-sm font-medium text-[#1E7D4F]">
            🌐 Online — visível para todo o Brasil
          </p>
        )}

        {localErro && (
          <p className="mt-3 text-sm text-[#C0392B]" data-testid="erro-local">
            {localErro}
          </p>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-neutral-700 mb-3">
          Áreas de atuação<span className="text-[#C0392B]"> *</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={badgeClass(data.areas.includes(area))}
              data-testid={`badge-area-${area}`}
            >
              {area}
            </button>
          ))}
        </div>
        {areaErro && (
          <p className="mt-3 text-sm text-[#C0392B]" data-testid="erro-area">
            {areaErro}
          </p>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-neutral-700 mb-3">
          Público atendido
        </h3>
        <p className="text-sm text-neutral-500 mb-3">
          Opcional. Ajuda quem busca um psicólogo para um perfil específico a
          encontrar você.
        </p>
        <div className="flex flex-wrap gap-2">
          {PUBLICO_ATENDIDO.map((publico) => (
            <button
              key={publico}
              type="button"
              onClick={() => togglePublico(publico)}
              className={badgeClass(data.publicoAtendido.includes(publico))}
              data-testid={`badge-publico-${publico}`}
            >
              {publico}
            </button>
          ))}
        </div>
      </div>

      {mostrarCard && (
        <div
          className="mt-8 rounded-2xl border border-primary-100 bg-[#EEF5FC] p-6"
          data-testid="bloco-concorrencia"
        >
          {loadingCount ? (
            <div
              className="flex items-center gap-2 text-primary-700"
              data-testid="concorrencia-carregando"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando o mercado em{" "}
              {localLabel}...
            </div>
          ) : counts ? (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-bold text-primary-900">
                  {counts.naAreaECidade} psicólogo(s) de {primeiraArea} em{" "}
                  {localLabel}
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {mensagemConcorrencia(
                    counts.naAreaECidade,
                    primeiraArea,
                    localLabel,
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-600">
              Seu perfil tem espaço garantido em {localLabel} assim que
              publicado.
            </p>
          )}
        </div>
      )}

      {/* ---------------- Plano e pagamento (antiga etapa 3) ---------------- */}
      <div className="mt-10 border-t border-neutral-200 pt-8">
        <h3 className="text-xl md:text-2xl font-bold text-primary-900 mb-2">
          Escolha seu plano e finalize
        </h3>
        <p className="text-neutral-600 mb-6">
          Pague com cartão de crédito no ambiente seguro do Asaas. A assinatura
          é recorrente e renova automaticamente a cada ciclo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
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
                  if (checkoutErro) setCheckoutErro("");
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
                  {info.preco}
                  <span className="text-base font-normal text-neutral-500">
                    {info.periodo}
                  </span>
                </p>
                <p className="mt-2 text-sm text-neutral-600">{info.descricao}</p>
              </button>
            );
          })}
        </div>

        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-4"
          data-testid="aviso-conta-pos-pagamento"
        >
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" />
          <p className="text-sm text-neutral-700">
            Assim que o pagamento for confirmado, você recebe um e-mail para
            criar sua senha e publicar seu perfil. Sua conta é criada só depois
            do pagamento.
          </p>
        </div>

        {checkoutErro && (
          <p className="mb-4 text-sm text-[#C0392B]" data-testid="erro-checkout">
            {checkoutErro}
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
          Pagamento processado com segurança pela Asaas. Não armazenamos dados
          do seu cartão.
        </div>
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
