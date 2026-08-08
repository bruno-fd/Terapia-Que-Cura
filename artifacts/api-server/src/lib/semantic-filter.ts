import {
  embeddingsDisponiveis,
  gerarEmbeddings,
  cosseno,
} from "./embeddings";
import { logger } from "./logger";

// ============================================================
// Filtro SEMANTICO contrastivo (pega a ambiguidade que a blocklist nao escala).
//
// Para cada sugestao: simDom = max(cosseno com ancoras de DOMINIO + a semente),
// simContra = max(cosseno com ancoras de RUIDO). Mantem se simDom - simContra >=
// corte (default 0.1). Ou seja: a busca precisa estar mais perto do nicho do que
// de viagem/fast-food/jogos/empresas.
//
// FAIL-OPEN: sem provider de embeddings, deixa tudo passar (a camada lexical +
// a relevancia por raiz ja seguram o grosso). Tem regex de resgate para termos
// inequivocos do nicho.
//
// PARTE DE DOMINIO: as ancoras abaixo sao de saude mental. Adapte por nicho.
// ============================================================

const ANCORAS_DOMINIO = [
  "saude mental e psicologia",
  "ansiedade, depressao e transtornos emocionais",
  "psicoterapia e acompanhamento psicologico",
  "sentimentos, comportamento e bem-estar emocional",
  "relacionamentos, familia e desenvolvimento pessoal",
  "sintomas e tratamento de transtornos psicologicos",
];

const ANCORAS_RUIDO = [
  "viagem, turismo e hoteis",
  "receita de comida e restaurante",
  "futebol, esporte e campeonato",
  "filme, novela, musica e celebridades",
  "comprar produto, preco e promocao",
  "empresa, negocios, financas e investimento",
  "jogo de videogame e apostas online",
  "carro, tecnologia e gadgets",
];

// Resgate: termos inequivocos do nicho sobrevivem mesmo na zona cinzenta.
const REGEX_RESGATE =
  /\b(ansiedad|depress|psicolog|terapia|transtorno|panico|fobia|trauma|autism|tdah|bipolar|borderline|burnout|luto|autoestima|compuls|obsessiv|emocional|psiquiatr|suicid|automutil)/;

const CORTE_PADRAO = 0.1;

export interface ItemSemantico {
  query: string;
}

// Filtra uma lista de sugestoes (ja aprovadas no lexical). `sementeContexto` e
// adicionada as ancoras de dominio (a propria semente ancora o tema). Devolve
// apenas as que passam. Fail-open: erro/sem provider -> devolve a lista inteira.
export async function filtrarSemantico<T extends ItemSemantico>(
  itens: T[],
  sementeContexto: string,
  corte = CORTE_PADRAO,
): Promise<T[]> {
  if (itens.length === 0) return itens;
  if (!embeddingsDisponiveis()) return itens;

  const ancorasDom = [...ANCORAS_DOMINIO];
  if (sementeContexto.trim()) {
    ancorasDom.push(`tema: ${sementeContexto.trim()}`);
  }

  // Um unico lote: ancoras de dominio + ancoras de ruido + todas as queries.
  const nDom = ancorasDom.length;
  const nCon = ANCORAS_RUIDO.length;
  const entradas = [
    ...ancorasDom,
    ...ANCORAS_RUIDO,
    ...itens.map((i) => i.query),
  ];

  const vetores = await gerarEmbeddings(entradas);
  if (!vetores) {
    logger.warn("Filtro semantico pulado (embeddings indisponiveis).");
    return itens;
  }

  const vDom = vetores.slice(0, nDom);
  const vCon = vetores.slice(nDom, nDom + nCon);
  const vItens = vetores.slice(nDom + nCon);

  const aprovados: T[] = [];
  itens.forEach((item, i) => {
    if (REGEX_RESGATE.test(item.query)) {
      aprovados.push(item);
      return;
    }
    const v = vItens[i];
    const simDom = Math.max(...vDom.map((a) => cosseno(v, a)));
    const simContra = Math.max(...vCon.map((a) => cosseno(v, a)));
    if (simDom - simContra >= corte) aprovados.push(item);
  });

  logger.info(
    { entrada: itens.length, aprovados: aprovados.length },
    "Filtro semantico aplicado.",
  );
  return aprovados;
}
