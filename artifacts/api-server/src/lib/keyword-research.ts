import { logger } from "./logger";

// ============================================================
// Minerador de demanda real do Google Autocomplete (bilingue pt + en).
//
// Fonte publica (a mesma do AnswerThePublic): pedimos sugestoes como um
// navegador, nao e scraping de SERP. Gratis, sem chave. Qualquer falha devolve
// lista vazia (resiliente).
//
// Puro (sem banco). A persistencia/dedup fica em keyword-queue.ts.
//
// PARTE DE DOMINIO: os modificadores de intencao abaixo sao as perguntas
// tipicas do publico leigo de saude mental. Adapte por nicho.
// ============================================================

export type Lang = "pt" | "en";

export interface Sugestao {
  query: string; // normalizada (sem acento, minuscula)
  score: number; // demanda acumulada (frequencia + bonus por posicao)
  isQuestion: boolean;
  lang: Lang;
}

// Prefixos de intencao (o que a pessoa digita antes do tema).
const PREFIXOS: Record<Lang, string[]> = {
  pt: [
    "o que e",
    "o que significa",
    "como saber se tenho",
    "como saber se e",
    "como lidar com",
    "como tratar",
    "como superar",
    "como controlar",
    "como ajudar alguem com",
    "sintomas de",
    "sinais de",
    "causas de",
    "tratamento para",
    "tipos de",
    "diferenca entre",
    "por que sinto",
  ],
  en: [
    "what is",
    "how to deal with",
    "how to overcome",
    "symptoms of",
    "signs of",
    "causes of",
    "types of",
  ],
};

// Sufixos de intencao (o que a pessoa digita depois do tema).
const SUFIXOS: Record<Lang, string[]> = {
  pt: [
    "sintomas",
    "tratamento",
    "tem cura",
    "o que fazer",
    "teste",
    "na infancia",
    "no trabalho",
    "no relacionamento",
  ],
  en: ["symptoms", "test", "treatment", "meaning"],
};

// Palavras iniciais que caracterizam uma pergunta.
const INICIOS_PERGUNTA = [
  "o que",
  "como",
  "por que",
  "porque",
  "quando",
  "qual",
  "quais",
  "quem",
  "what",
  "how",
  "why",
  "when",
  "which",
  "who",
];

const HL_GL: Record<Lang, { hl: string; gl: string }> = {
  pt: { hl: "pt-BR", gl: "br" },
  en: { hl: "en", gl: "us" },
};

export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ehPergunta(q: string): boolean {
  return INICIOS_PERGUNTA.some((i) => q === i || q.startsWith(i + " "));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Consulta o autocomplete para UM termo e devolve as sugestoes cruas (na ordem
// retornada pelo Google, onde a posicao 0 e a mais forte). Resiliente: [] em
// qualquer erro.
async function autocomplete(termo: string, lang: Lang): Promise<string[]> {
  const { hl, gl } = HL_GL[lang];
  const url = new URL("https://suggestqueries.google.com/complete/search");
  url.searchParams.set("client", "firefox");
  url.searchParams.set("hl", hl);
  url.searchParams.set("gl", gl);
  url.searchParams.set("q", termo);

  try {
    const resp = await fetch(url, {
      headers: {
        // Um user-agent de navegador reduz respostas vazias/bloqueios.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!resp.ok) return [];
    // client=firefox devolve JSON limpo: [termo, [sug1, sug2, ...]]
    const data = (await resp.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
    return (data[1] as unknown[]).filter(
      (x): x is string => typeof x === "string",
    );
  } catch {
    return [];
  }
}

// Monta as consultas derivadas de uma semente: a propria semente, prefixo +
// semente, semente + sufixo e a "sopa de letrinhas" (semente + a..z).
function consultasDerivadas(semente: string, lang: Lang): string[] {
  const consultas = new Set<string>();
  consultas.add(semente);
  for (const p of PREFIXOS[lang]) consultas.add(`${p} ${semente}`);
  for (const s of SUFIXOS[lang]) consultas.add(`${semente} ${s}`);
  for (let c = 97; c <= 122; c++) {
    consultas.add(`${semente} ${String.fromCharCode(c)}`);
  }
  return Array.from(consultas);
}

// Minera uma semente inteira (todas as consultas derivadas) num idioma e devolve
// as sugestoes agregadas e pontuadas. `raizes` sao tokens normalizados da
// semente; a sugestao PRECISA conter ao menos um deles para ser relevante
// (evita drift do autocomplete). Lista vazia = sem checagem de raiz.
export async function minerarSemente(
  semente: string,
  lang: Lang,
  raizes: string[],
): Promise<Map<string, Sugestao>> {
  const acumulado = new Map<string, Sugestao>();
  const raizesNorm = raizes.map(normalizar).filter(Boolean);
  const consultas = consultasDerivadas(semente, lang);

  for (const consulta of consultas) {
    const sugestoes = await autocomplete(consulta, lang);
    sugestoes.forEach((bruta, posicao) => {
      const q = normalizar(bruta);
      if (q.length < 8) return; // sopa de letrinhas pura
      // Relevancia: precisa conter ao menos uma raiz da semente.
      if (raizesNorm.length > 0 && !raizesNorm.some((r) => q.includes(r)))
        return;
      // Bonus por posicao no topo (0 -> +5, decai). Frequencia = +1 por
      // aparicao em consultas diferentes.
      const bonus = Math.max(0, 5 - posicao);
      const atual = acumulado.get(q);
      if (atual) {
        atual.score += 1 + bonus * 0.2;
      } else {
        acumulado.set(q, {
          query: q,
          score: 1 + bonus * 0.2,
          isQuestion: ehPergunta(q),
          lang,
        });
      }
    });
    // Gentileza com o endpoint publico.
    await sleep(120);
  }

  logger.info(
    { semente, lang, total: acumulado.size },
    "Semente minerada.",
  );
  return acumulado;
}
