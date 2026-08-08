import { logger } from "./logger";

// ============================================================
// Provider de embeddings (vetor de 1024 dimensoes), selecionado por env.
//
//   BLOG_EMBEDDING_PROVIDER = "openai" | "voyage"
//   BLOG_EMBEDDING_API_KEY  = chave do provider
//   BLOG_EMBEDDING_MODEL    = (opcional) override do modelo
//
// Usado em tres lugares (todos degradam sem quebrar quando nao ha provider):
//   - filtro semantico contrastivo da mineracao (semantic-filter.ts);
//   - anti-canibalizacao Camada 2 (corpus-index.ts);
//   - citacao cruzada / posts relacionados (corpus-index.ts).
//
// FAIL-OPEN: sem chave, todas as funcoes retornam null e quem chama decide o
// fallback (deixa passar / usa so a camada lexical). Nunca lanca.
// ============================================================

// Dimensao fixa: precisa casar com a coluna vector(1024) de blog_post_index.
export const EMBEDDING_DIMS = 1024;

type Provider = "openai" | "voyage";

function getProvider(): Provider | null {
  const p = (process.env.BLOG_EMBEDDING_PROVIDER ?? "").toLowerCase().trim();
  if (p === "openai" || p === "voyage") return p;
  return null;
}

function getApiKey(): string | null {
  const k = (process.env.BLOG_EMBEDDING_API_KEY ?? "").trim();
  return k || null;
}

// Ha provider E chave configurados? Barato: usado para pular camadas semanticas
// sem tentar rede.
export function embeddingsDisponiveis(): boolean {
  return getProvider() !== null && getApiKey() !== null;
}

function modeloPadrao(provider: Provider): string {
  const override = (process.env.BLOG_EMBEDDING_MODEL ?? "").trim();
  if (override) return override;
  // Ambos multilingues e capazes de emitir 1024 dims.
  return provider === "openai" ? "text-embedding-3-small" : "voyage-3.5";
}

const ENDPOINTS: Record<Provider, string> = {
  openai: "https://api.openai.com/v1/embeddings",
  voyage: "https://api.voyageai.com/v1/embeddings",
};

// Trunca entradas muito longas (protege contra estouro de tokens; titulo+resumo
// nunca chega perto, mas a mineracao manda frases curtas em lote).
function prepararEntradas(textos: string[]): string[] {
  return textos.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 8000));
}

async function chamarProvider(
  provider: Provider,
  apiKey: string,
  entradas: string[],
): Promise<number[][]> {
  const model = modeloPadrao(provider);
  const body: Record<string, unknown> =
    provider === "openai"
      ? { model, input: entradas, dimensions: EMBEDDING_DIMS }
      : { model, input: entradas, output_dimension: EMBEDDING_DIMS };

  const resp = await fetch(ENDPOINTS[provider], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => "");
    throw new Error(
      `Embeddings ${provider} HTTP ${resp.status}: ${detalhe.slice(0, 200)}`,
    );
  }

  const data = (await resp.json()) as {
    data?: { embedding?: number[]; index?: number }[];
  };
  const itens = Array.isArray(data.data) ? data.data : [];
  // A ordem pode nao ser garantida; reordena por index quando presente.
  const vetores: number[][] = new Array(entradas.length);
  itens.forEach((item, i) => {
    const idx = typeof item.index === "number" ? item.index : i;
    if (Array.isArray(item.embedding)) vetores[idx] = item.embedding;
  });
  if (vetores.some((v) => !Array.isArray(v) || v.length !== EMBEDDING_DIMS)) {
    throw new Error(
      `Embeddings ${provider}: resposta com dimensao inesperada (esperado ${EMBEDDING_DIMS}).`,
    );
  }
  return vetores;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gera embeddings em lote. Retorna null (a lista inteira) em qualquer falha,
// depois de ate 3 tentativas com backoff. Lotes grandes sao fatiados.
export async function gerarEmbeddings(
  textos: string[],
): Promise<number[][] | null> {
  const provider = getProvider();
  const apiKey = getApiKey();
  if (!provider || !apiKey) return null;
  if (textos.length === 0) return [];

  const entradas = prepararEntradas(textos);
  const LOTE = 96;
  const resultado: number[][] = [];

  for (let inicio = 0; inicio < entradas.length; inicio += LOTE) {
    const fatia = entradas.slice(inicio, inicio + LOTE);
    let ultimoErro: unknown = null;
    let ok = false;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        const vetores = await chamarProvider(provider, apiKey, fatia);
        resultado.push(...vetores);
        ok = true;
        break;
      } catch (err) {
        ultimoErro = err;
        await sleep(500 * Math.pow(2, tentativa));
      }
    }
    if (!ok) {
      logger.warn(
        { err: ultimoErro, provider },
        "Falha ao gerar embeddings; camada semantica sera pulada.",
      );
      return null;
    }
  }
  return resultado;
}

// Gera o embedding de um unico texto. null em falha ou sem provider.
export async function gerarEmbedding(texto: string): Promise<number[] | null> {
  const vetores = await gerarEmbeddings([texto]);
  return vetores && vetores[0] ? vetores[0] : null;
}

// Cosseno entre dois vetores de mesma dimensao. Usado no filtro semantico
// (comparacoes em memoria contra as ancoras); as comparacoes contra o corpus
// usam o operador <=> do pgvector direto no banco.
export function cosseno(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Serializa um vetor no literal aceito pelo pgvector ("[0.1,0.2,...]").
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
