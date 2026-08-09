import { logger } from "./logger";

// ============================================================
// Provider de embeddings (vetor de 1024 dimensões). FAIL-OPEN: sem provider,
// tudo degrada para a camada lexical (nunca lança).
//
// Resolução do provider (nesta ordem; a chave própria vem ANTES do proxy porque
// o proxy do Replit não roteia embeddings):
//   1. Voyage: BLOG_EMBEDDING_PROVIDER=voyage + BLOG_EMBEDDING_API_KEY.
//   2. OpenAI-compatível com chave própria: BLOG_EMBEDDING_API_KEY (+ opcional
//      BLOG_EMBEDDING_BASE_URL). Default https://api.openai.com/v1. RECOMENDADO.
//   3. Proxy OpenAI do Replit (AI_INTEGRATIONS_OPENAI_*), só como último recurso
//      e com aviso: a API de embeddings NÃO é suportada por ele hoje.
//
// Override do modelo em qualquer caso: BLOG_EMBEDDING_MODEL.
// ============================================================

// Dimensão fixa: precisa casar com a coluna vector(1024) de blog_post_index.
export const EMBEDDING_DIMS = 1024;

// Timeout por tentativa de chamada ao provider. Sem isso, uma conexão pendurada
// só morreria no default do Node (~5 min) segurando o advisory lock da
// categoria; com o timeout, degradamos rápido para a camada lexical.
const EMBEDDING_TIMEOUT_MS = 15000;

interface ProviderConfig {
  kind: "openai" | "voyage";
  url: string;
  key: string;
  model: string;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path}`;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

// Loga uma vez por processo (evita poluir o log, já que resolverProvider é
// chamado a cada gerarEmbeddings/embeddingsDisponiveis).
let avisouProxyReplit = false;

function resolverProvider(): ProviderConfig | null {
  const modelOverride = env("BLOG_EMBEDDING_MODEL");
  const provider = (env("BLOG_EMBEDDING_PROVIDER") ?? "").toLowerCase();
  const key = env("BLOG_EMBEDDING_API_KEY");

  // 1) Voyage (provider explícito + chave própria).
  if (provider === "voyage" && key) {
    return {
      kind: "voyage",
      url: "https://api.voyageai.com/v1/embeddings",
      key,
      model: modelOverride ?? "voyage-3.5",
    };
  }

  // 2) OpenAI-compatível com chave própria. CAMINHO RECOMENDADO neste ambiente:
  // é o que sabidamente funciona (o proxy do Replit não roteia embeddings).
  if (key) {
    const base = env("BLOG_EMBEDDING_BASE_URL") ?? "https://api.openai.com/v1";
    return {
      kind: "openai",
      url: joinUrl(base, "embeddings"),
      key,
      model: modelOverride ?? "text-embedding-3-small",
    };
  }

  // 3) Proxy OpenAI do Replit (sem chave própria) — ÚLTIMO recurso. As AI
  // Integrations do Replit documentam que a API de embeddings NÃO é suportada
  // pelo proxy (só chat/responses/imagens/áudio), então este caminho tende a
  // falhar aqui. Fica por robustez (caso um dia passe a rotear), mas avisamos.
  const proxyBase = env("AI_INTEGRATIONS_OPENAI_BASE_URL");
  const proxyKey = env("AI_INTEGRATIONS_OPENAI_API_KEY");
  if (proxyBase && proxyKey) {
    if (!avisouProxyReplit) {
      avisouProxyReplit = true;
      logger.warn(
        "Embeddings caindo no proxy OpenAI do Replit, que normalmente NAO roteia /embeddings. Se a Camada 2 nao preencher, configure BLOG_EMBEDDING_API_KEY.",
      );
    }
    return {
      kind: "openai",
      url: joinUrl(proxyBase, "embeddings"),
      key: proxyKey,
      model: modelOverride ?? "text-embedding-3-small",
    };
  }

  return null;
}

// Há provider configurado? Barato: usado para pular camadas semânticas sem rede.
export function embeddingsDisponiveis(): boolean {
  return resolverProvider() !== null;
}

function prepararEntradas(textos: string[]): string[] {
  return textos.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 8000));
}

async function chamarProvider(
  cfg: ProviderConfig,
  entradas: string[],
): Promise<number[][]> {
  const body: Record<string, unknown> =
    cfg.kind === "openai"
      ? { model: cfg.model, input: entradas, dimensions: EMBEDDING_DIMS }
      : { model: cfg.model, input: entradas, output_dimension: EMBEDDING_DIMS };

  const resp = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify(body),
    // Aborta a tentativa se o provider pendurar a conexão. O erro cai no
    // retry/backoff de gerarEmbeddings, que devolve null (fail-open) ao esgotar.
    signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
  });

  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => "");
    throw new Error(
      `Embeddings ${cfg.kind} HTTP ${resp.status}: ${detalhe.slice(0, 200)}`,
    );
  }

  const data = (await resp.json()) as {
    data?: { embedding?: number[]; index?: number }[];
  };
  const itens = Array.isArray(data.data) ? data.data : [];
  const vetores: number[][] = new Array(entradas.length);
  itens.forEach((item, i) => {
    const idx = typeof item.index === "number" ? item.index : i;
    if (Array.isArray(item.embedding)) vetores[idx] = item.embedding;
  });
  if (vetores.some((v) => !Array.isArray(v) || v.length !== EMBEDDING_DIMS)) {
    throw new Error(
      `Embeddings ${cfg.kind}: dimensão inesperada (esperado ${EMBEDDING_DIMS}).`,
    );
  }
  return vetores;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gera embeddings em lote. Retorna null (a lista inteira) em qualquer falha
// após 3 tentativas com backoff, ou quando não há provider. Fatia lotes grandes.
export async function gerarEmbeddings(
  textos: string[],
): Promise<number[][] | null> {
  const cfg = resolverProvider();
  if (!cfg) return null;
  if (textos.length === 0) return [];

  const entradas = prepararEntradas(textos);
  const LOTE = 96;
  const resultado: number[][] = [];

  for (let inicio = 0; inicio < entradas.length; inicio += LOTE) {
    const fatia = entradas.slice(inicio, inicio + LOTE);
    let ok = false;
    let ultimoErro: unknown = null;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        resultado.push(...(await chamarProvider(cfg, fatia)));
        ok = true;
        break;
      } catch (err) {
        ultimoErro = err;
        await sleep(500 * Math.pow(2, tentativa));
      }
    }
    if (!ok) {
      logger.warn(
        { err: ultimoErro, kind: cfg.kind },
        "Falha ao gerar embeddings; camada semântica será pulada.",
      );
      return null;
    }
  }
  return resultado;
}

// Embedding de um único texto. null em falha ou sem provider.
export async function gerarEmbedding(texto: string): Promise<number[] | null> {
  const vetores = await gerarEmbeddings([texto]);
  return vetores && vetores[0] ? vetores[0] : null;
}

// Serializa um vetor no literal aceito pelo pgvector ("[0.1,0.2,...]").
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
