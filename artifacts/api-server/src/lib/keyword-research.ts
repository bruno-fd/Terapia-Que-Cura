// ============================================================
// Minerador de palavras-chave via Google Autocomplete (Fase 0).
//
// Usa a API pública de sugestões do Google (a mesma fonte sobre a qual o
// AnswerThePublic foi construído). É gratuita, sem chave e legal: pedimos as
// sugestões como qualquer navegador faz ao digitar na barra de busca. NÃO
// fazemos scraping de SERP (isso, sim, viola o ToS).
//
// Ideia central: para cada semente (uma subcategoria como "Ansiedade Social"),
// disparamos a semente combinada com prefixos de intenção ("o que é", "como
// lidar com"...) e com a "sopa de letrinhas" (semente + a, b, c...). Cada
// consulta devolve o que pessoas reais digitam. Juntamos tudo, deduplicamos,
// pontuamos por frequência/posição e marcamos o que é pergunta.
//
// Este módulo é PURO em relação ao banco: só descobre e devolve sugestões. Quem
// grava na fila (blog_keyword_queue) é o keyword-queue.ts. Assim dá para testar
// a mineração isolada, sem tocar em nada do fluxo atual.
// ============================================================

// Endpoint público de Autocomplete. client=firefox devolve JSON limpo no
// formato [termo, [sugestão1, sugestão2, ...]].
const AUTOCOMPLETE_URL = "https://suggestqueries.google.com/complete/search";

// Prefixos e sufixos de intenção em pt-BR. Cobrem as perguntas mais comuns que
// as pessoas fazem sobre um tema de saúde mental. Cada um vira uma consulta
// separada ao Autocomplete, que completa com o que de fato é buscado.
const PREFIXOS_INTENCAO = [
  "o que é",
  "o que significa",
  "como lidar com",
  "como tratar",
  "como superar",
  "como saber se tenho",
  "como ajudar alguém com",
  "sintomas de",
  "sinais de",
  "causas de",
  "tipos de",
  "tratamento para",
  "remédio para",
  "quando procurar ajuda para",
  "por que sinto",
  "vale a pena fazer terapia para",
];

const SUFIXOS_INTENCAO = [
  "tem cura",
  "o que fazer",
  "é doença",
  "na adolescência",
  "no trabalho",
  "e ansiedade",
  "sintomas",
  "causas",
  "tratamento",
];

// Letras da "sopa de letrinhas": semente + " a", " b"... capturam qualquer
// continuação popular que não caiba nos prefixos/sufixos acima.
const ALFABETO = "abcdefghijklmnopqrstuvwxyz".split("");

// Palavras que iniciam perguntas em pt-BR (para classificar isQuestion).
const INICIOS_DE_PERGUNTA = [
  "o que",
  "como",
  "quando",
  "quanto",
  "qual",
  "quais",
  "por que",
  "porque",
  "onde",
  "quem",
  "vale a pena",
  "devo",
  "posso",
];

// Uma sugestão minerada, já classificada e pontuada.
export interface SugestaoMinerada {
  // Texto exato da sugestão do Google.
  query: string;
  // Normalizada para dedup.
  queryNormalized: string;
  // true se for uma pergunta.
  isQuestion: boolean;
  // Prioridade acumulada (frequência + bônus de posição no topo).
  score: number;
}

export function normalizarQuery(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ehPergunta(query: string): boolean {
  const n = normalizarQuery(query);
  if (query.includes("?")) return true;
  if (/\b(tem cura|vale a pena|o que fazer|e doenca|e normal)\b/.test(n)) {
    return true;
  }
  return INICIOS_DE_PERGUNTA.some((p) => n.startsWith(normalizarQuery(p)));
}

// Uma única consulta ao Autocomplete. Resiliente: qualquer falha (rede, formato
// inesperado, host fora do ar) devolve lista vazia em vez de derrubar o lote.
export async function fetchSuggestions(
  termo: string,
  opts: { hl?: string; gl?: string; timeoutMs?: number } = {},
): Promise<string[]> {
  const { hl = "pt-BR", gl = "br", timeoutMs = 8000 } = opts;
  const url = `${AUTOCOMPLETE_URL}?client=firefox&hl=${encodeURIComponent(
    hl,
  )}&gl=${encodeURIComponent(gl)}&q=${encodeURIComponent(termo)}`;

  try {
    const resp = await fetch(url, {
      headers: {
        // Alguns endpoints do Google respondem melhor com um UA de navegador.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return [];
    // Resposta vem como text/javascript; parse manual do JSON [termo, [...]].
    const texto = await resp.text();
    const data = JSON.parse(texto) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
    return (data[1] as unknown[]).filter(
      (s): s is string => typeof s === "string",
    );
  } catch {
    return [];
  }
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Monta a lista de consultas-semente a partir de um termo base.
function montarConsultas(semente: string): string[] {
  const consultas = new Set<string>();
  consultas.add(semente);
  for (const p of PREFIXOS_INTENCAO) consultas.add(`${p} ${semente}`);
  for (const s of SUFIXOS_INTENCAO) consultas.add(`${semente} ${s}`);
  for (const l of ALFABETO) consultas.add(`${semente} ${l}`);
  return Array.from(consultas);
}

// Minera uma única semente (subcategoria ou macro). Dispara todas as consultas
// derivadas, junta as sugestões, deduplica e pontua. Sequencial e com pausa
// curta entre chamadas para ser gentil com o Autocomplete e evitar bloqueio.
export async function minerarSemente(
  semente: string,
  opts: { delayMs?: number; hl?: string; gl?: string } = {},
): Promise<SugestaoMinerada[]> {
  const { delayMs = 200, hl, gl } = opts;
  const consultas = montarConsultas(semente);
  const sementeNorm = normalizarQuery(semente);
  // Guarda a primeira palavra significativa da semente para filtrar ruído.
  const tokenRaiz = sementeNorm.split(" ")[0] ?? "";

  const acumulado = new Map<string, SugestaoMinerada>();

  for (const consulta of consultas) {
    const sugestoes = await fetchSuggestions(consulta, { hl, gl });
    sugestoes.forEach((sug, indice) => {
      const norm = normalizarQuery(sug);
      if (!norm || norm.length < 8) return;
      // Filtro de relevância: a sugestão precisa conter a raiz da semente OU a
      // semente inteira. Evita que "ansiedade a" traga "amazon" e afins.
      if (!norm.includes(tokenRaiz) && !norm.includes(sementeNorm)) return;

      // Bônus de posição: sugestões no topo do Autocomplete são mais buscadas.
      const bonusPosicao = Math.max(0, 10 - indice);
      const existente = acumulado.get(norm);
      if (existente) {
        existente.score += 1 + bonusPosicao;
      } else {
        acumulado.set(norm, {
          query: sug.trim(),
          queryNormalized: norm,
          isQuestion: ehPergunta(sug),
          score: 1 + bonusPosicao,
        });
      }
    });
    if (delayMs > 0) await dormir(delayMs);
  }

  // Remove a própria semente crua (sem valor como tema) e ordena por score.
  acumulado.delete(sementeNorm);
  return Array.from(acumulado.values()).sort((a, b) => b.score - a.score);
}

// Minera uma macrocategoria inteira: percorre todas as suas subcategorias
// (sementes) e junta o resultado num só ranking deduplicado. Cada sugestão
// carrega a subcategoria que a originou (para agrupar em clusters na Fase 1).
export interface SugestaoComOrigem extends SugestaoMinerada {
  subcategoria: string | null;
}

export async function minerarMacro(
  macro: string,
  subcategorias: string[],
  opts: { delayMs?: number; hl?: string; gl?: string } = {},
): Promise<SugestaoComOrigem[]> {
  // As sementes são as subcategorias; se não houver, usa a própria macro.
  const sementes =
    subcategorias.length > 0 ? subcategorias : [macro];
  const porNorm = new Map<string, SugestaoComOrigem>();

  for (const sub of sementes) {
    const sugestoes = await minerarSemente(sub, opts);
    const origem = subcategorias.length > 0 ? sub : null;
    for (const s of sugestoes) {
      const existente = porNorm.get(s.queryNormalized);
      if (existente) {
        existente.score += s.score;
      } else {
        porNorm.set(s.queryNormalized, { ...s, subcategoria: origem });
      }
    }
  }

  return Array.from(porNorm.values()).sort((a, b) => b.score - a.score);
}
