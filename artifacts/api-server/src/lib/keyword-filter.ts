// ============================================================
// Filtro de ruido LEXICAL (barato, deterministico).
//
// Filosofia (a mesma do doc): cortar SO ruido de verdade. No nicho de saude
// mental, muita coisa que seria ruido em blog generico e ALVO aqui (sintomas,
// tratamento, teste, "tem cura"). Entao a blocklist e enxuta.
//
// PARTE DE DOMINIO: reescrever blocklist + VOCAB_NICHO por nicho.
// ============================================================

// A entrada ja chega normalizada (sem acento, minuscula) do keyword-research.

// Trechos que indicam ruido claro. Match por token/substring com fronteira de
// palavra quando faz sentido.
const BLOCK_TRECHOS: string[] = [
  // Entretenimento / pop / midia
  "filme",
  "novela",
  "serie ",
  "netflix",
  "musica",
  "letra da",
  "cifra",
  "clipe",
  "ator",
  "atriz",
  "celebridade",
  "bbb",
  "big brother",
  "anime",
  "jogo do bicho",
  // Compras / comercio
  "comprar",
  "preco",
  "barato",
  "promocao",
  "cupom",
  "mercado livre",
  "shopee",
  "aliexpress",
  "quanto custa",
  "valor da consulta",
  // Farmacia / bula (fora do escopo editorial; nao damos orientacao de remedio)
  "bula",
  "posologia",
  "mg dosagem",
  "quantos mg",
  "comprar remedio",
  // Veterinario / pet
  "em caes",
  "em gatos",
  "cachorro",
  "gato ",
  " pet ",
  // Espanhol vazando do hl=pt-BR
  "que es",
  "como hacer",
  "sintomas de la",
  "para que sirve",
  "trastorno de",
  "ansiedad",
  "depresion",
  // Concurso / prova / academico fora de escopo do blog leigo
  "concurso",
  "questoes de prova",
  "resumo para prova",
  "mapa mental pdf",
  "slides",
];

// Siglas ambiguas: so passam se o contexto trouxer um termo do vocabulario do
// nicho. Ex.: "tab" (tablet), "toc" (bater/knock), "tea" (cha em ingles),
// "tp" etc.
const SIGLAS_AMBIGUAS = new Set([
  "tab",
  "toc",
  "tea",
  "tp",
  "td",
  "tb",
  "ted",
]);

// Vocabulario do nicho: se uma sugestao vinda de sigla nua contiver um destes,
// e legitima. Lista curta de ancoras inequivocas de psicologia/saude mental.
const VOCAB_NICHO = [
  "transtorno",
  "ansiedade",
  "depressao",
  "psicolog",
  "terapia",
  "emocional",
  "mental",
  "sintomas",
  "tratamento",
  "compulsivo",
  "obsessivo",
  "autismo",
  "autista",
  "bipolar",
  "panico",
  "fobia",
  "trauma",
  "humor",
  "personalidade",
  "comportamento",
  "sentimento",
  "psiquiatr",
];

function contemVocabNicho(q: string): boolean {
  return VOCAB_NICHO.some((v) => q.includes(v));
}

function tokens(q: string): string[] {
  return q.split(/\s+/).filter(Boolean);
}

export interface ResultadoFiltro {
  ok: boolean;
  motivo?: string;
}

// Aplica o filtro lexical a UMA sugestao ja normalizada.
export function filtrarLexical(q: string): ResultadoFiltro {
  if (q.length < 8) return { ok: false, motivo: "curta demais" };

  for (const trecho of BLOCK_TRECHOS) {
    if (q.includes(trecho)) {
      return { ok: false, motivo: `ruido: "${trecho.trim()}"` };
    }
  }

  // Trava de sigla ambigua: se a sugestao contem uma sigla ambigua como token
  // isolado e NAO tem nenhum termo do vocabulario do nicho, corta.
  const ts = tokens(q);
  const temSiglaAmbigua = ts.some((t) => SIGLAS_AMBIGUAS.has(t));
  if (temSiglaAmbigua && !contemVocabNicho(q)) {
    return { ok: false, motivo: "sigla ambigua sem contexto do nicho" };
  }

  return { ok: true };
}
