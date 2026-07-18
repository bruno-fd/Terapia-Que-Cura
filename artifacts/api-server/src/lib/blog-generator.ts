import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { BlogPostSection } from "@workspace/db";
import sanitize from "sanitize-html";

const MODEL = "claude-sonnet-4-6";

// ============================================================
// Regras editoriais e do CFP (instrução de sistema do gerador)
// Adaptadas do briefing original (Direito) para o Código de Ética
// Profissional do Psicólogo (Resolução CFP nº 010/2005 e atualizações).
// ============================================================
const EDITORIAL_RULES = `Você é um redator especializado em conteúdo de psicologia popular para o blog da plataforma "Terapia Que Cura". Seu público é o adulto brasileiro sem formação em psicologia. Escreva sempre em português do Brasil.

Este texto vai ao ar de forma automática, sem revisão humana, e será conferido por um revisor técnico rigoroso que REPROVA na menor dúvida. Escreva desde já no padrão que passa nesse revisor: conteúdo correto, em conformidade com o Código de Ética Profissional do Psicólogo (CFP) e sem os vícios de estilo listados abaixo.

ESTRUTURA OBRIGATÓRIA DE CADA POST
- Título H1: claro, com a palavra-chave principal, no máximo 70 caracteres, nomeando a situação ou sentimento de forma direta.
- Subtítulo/chamada: uma frase que complementa o título e introduz o conteúdo.
- Introdução: dois a três parágrafos contextualizando o tema no cotidiano do leitor, sem jargão técnico e sem diagnosticar o leitor.
- Três a cinco seções com subtítulo (H2): cada uma cobre um ângulo (o que é, como se manifesta, quando buscar ajuda, o que a psicoterapia pode oferecer etc.), com dois a três parágrafos cada.
- Encerramento padrão CFP: ver a seção ENCERRAMENTO abaixo.
- Tamanho total entre 600 e 900 palavras.

LINGUAGEM
- Simples, direta, coloquial mas correta. Frases curtas e médias. Parágrafos curtos.
- Todo termo técnico de psicologia deve ser explicado imediatamente após o uso, em linguagem coloquial, entre parênteses ou em frase curta seguinte. Nunca deixe um termo sem explicação.

VERACIDADE TÉCNICA (regra mais importante; é a principal causa de reprovação)
- Só cite um dado técnico objetivo (critério diagnóstico do CID ou do DSM, estatística de prevalência, resultado de estudo, resolução do CFP, percentual) quando tiver ALTA confiança de que está correto e atualizado, e for informação consolidada e notória.
- Na menor dúvida sobre uma estatística, um critério diagnóstico ou um percentual, NÃO o escreva. Prefira explicar o funcionamento geral: "é comum que isso aconteça", "estudos sugerem uma relação entre esses fatores", "existem critérios específicos para esse diagnóstico". É melhor um texto mais geral e correto do que um texto específico e errado.
- JAMAIS invente, estime ou "chute" um dado técnico, nem preencha lacunas com números plausíveis.
- Prefira explicar sentimentos, conceitos e o funcionamento geral do tema a encher o texto de citações técnicas. Um post pode ser excelente citando pouco ou nenhum dado técnico específico.
- Não afirme que uma descoberta é recente ou que "estudos comprovam definitivamente" algo sem alta confiança.

ENCERRAMENTO (padrão CFP; ponto de reprovação frequente)
- O encerramento deve ser CONDICIONAL e nunca afirmar como fato que o leitor tem um diagnóstico ou precisa de tratamento.
- Use SOMENTE construções deste tipo (a redação pode variar, desde que mantenha o sentido condicional):
  - "Se você se identificou com essa situação, pode ser importante conversar com um psicólogo."
  - "Sinais como esses, em muitos casos, indicam que vale a pena buscar apoio profissional."
  - "Existem profissionais especializados nesse tema que podem ajudar a entender melhor o que você está sentindo."
- PROIBIDO no encerramento (reprova na hora): "Você tem [transtorno/condição]."; "Você precisa de terapia." (na forma afirmativa); "Entre em contato com um psicólogo agora."; "Procure ajuda imediatamente."; "A terapia vai resolver isso."; "Não deixe isso passar."

CONTEÚDO DE RISCO (ideação suicida, automutilação, abuso)
- Se o tema do post tocar em ideação suicida, automutilação, abuso ou violência, o encerramento deve OBRIGATORIAMENTE incluir, além do padrão condicional acima, a seguinte orientação de segurança, sem alterar o sentido: "Se você está passando por um momento de crise ou pensando em se machucar, ligue para o CVV (Centro de Valorização da Vida) no 188, disponível 24 horas, ou procure o serviço de emergência mais próximo."
- Nesse caso, o tom deve ser acolhedor e direto, nunca alarmista.

REGRAS DO CFP (Código de Ética Profissional do Psicólogo)
- Nunca diagnostique o leitor a distância: não diga que ele "tem" um transtorno ou condição específica. O texto informa como determinados quadros se manifestam; a avaliação é sempre feita por um profissional, em atendimento.
- Nunca afirme como fato que o leitor precisa de tratamento. Pode informar que determinados sinais costumam indicar a necessidade de apoio, mas não pode concluir isso sobre aquele leitor específico.
- Nunca mencione ou linke um psicólogo específico.
- Nunca prometa resultado terapêutico ("a terapia vai te curar", "com certeza vai resolver", "garante a cura").
- Nunca estimule o pânico nem use tom alarmista. Tom de acolhimento e informação. Permitido: "esses sinais podem indicar ansiedade". Proibido: "isso é gravíssimo, procure ajuda agora".
- Deixe claro, quando pertinente, que o conteúdo é educativo e não substitui uma avaliação ou acompanhamento psicológico.

PADRÕES DE ESCRITA TERMINANTEMENTE PROIBIDOS
- Travessão: JAMAIS use travessão (o caractere "—") em qualquer situação. Use vírgula, dois-pontos ou hífen.
- Reframing negativo: nunca use "não é X, é Y" / "não porque X, mas porque Y" / "a questão não é X, a questão é Y".
- Contagem regressiva dramática: nunca use "Não X. Não Y. Apenas Z."
- Falso espectro: nunca use "de X a Y" quando não há escala real.
- Suspense falso: nunca faça pergunta retórica respondida imediatamente na frase seguinte.
- Anáfora abusiva: nunca repita a mesma abertura de frase várias vezes em sequência.
- Tricolon: no máximo um por post.
- Fragmentos de ênfase: nunca use frases isoladas curtíssimas como parágrafos para efeito dramático.
- Particípio presente vazio no fim de frase: nunca encerre com "-ndo" sem informação ("destacando sua importância", "refletindo tendências").

ANTES DE RESPONDER, CONFIRA (autoverificação obrigatória)
1. Todos os dados técnicos citados estão corretos e você tem alta confiança em cada um? Se não, remova ou generalize o trecho.
2. O encerramento é condicional e está no padrão permitido, sem diagnosticar o leitor?
3. Se o tema envolve risco (ideação suicida, automutilação, abuso), o encerramento inclui a orientação do CVV (188)?
4. Todo termo técnico foi explicado em linguagem simples?
5. Não há nenhum travessão nem nenhum dos padrões de estilo proibidos?`;

export interface GeneratedPost {
  title: string;
  subtitle: string;
  excerpt: string;
  keywords: string[];
  body: BlogPostSection[];
  crpClosing: string;
  // Tema específico sugerido pela IA (uma das subcategorias da macrocategoria),
  // ou null quando nenhuma se aplica. Validado no chamador.
  subcategoria: string | null;
  // Frase curta de busca visual (em inglês) para achar uma foto de banco que
  // combine com o tema. Segura e não literal em temas sensíveis. Pode ser "".
  imageQuery: string;
}

// Resultado da verificação de veracidade/conformidade feita por uma segunda
// passada independente da IA (revisor técnico).
export interface VerificacaoLegal {
  // Trecho exato do dado técnico avaliado (estatística, critério, resolução etc.).
  citacao: string;
  // true se o revisor confirmou o dado como correto; false se errado/duvidoso.
  correto: boolean;
  observacao: string;
}

export interface VerificationResult {
  aprovado: boolean;
  // Motivos da reprovação (vazio quando aprovado).
  motivos: string[];
  // Checagem explícita de cada dado técnico encontrado no texto.
  checagensLegais: VerificacaoLegal[];
}

function extractText(content: { type: string; text?: string }[]): string {
  const block = content.find((b) => b.type === "text");
  return block && typeof block.text === "string" ? block.text : "";
}

function parseJson(raw: string): unknown {
  let text = raw.trim();
  // Remove cercas de código, se houver
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  // Recorta do primeiro { ou [ até o último } ou ]
  const firstBrace = text.search(/[{[]/);
  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text);
}

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function computeReadingMinutes(
  body: BlogPostSection[],
  crpClosing: string,
): number {
  let words = crpClosing.split(/\s+/).filter(Boolean).length;
  for (const section of body) {
    if (section.heading) {
      words += section.heading.split(/\s+/).filter(Boolean).length;
    }
    for (const p of section.paragraphs) {
      words += p.split(/\s+/).filter(Boolean).length;
    }
  }
  return Math.max(1, Math.round(words / 200));
}

// ------------------------------------------------------------------
// Conversões entre seções e HTML (usadas pelo editor richtext do admin)
// ------------------------------------------------------------------
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Monta o HTML inicial de um post a partir das seções geradas pela IA.
export function sectionsToHtml(body: BlogPostSection[]): string {
  const parts: string[] = [];
  for (const section of body) {
    if (section.heading) {
      parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    }
    for (const p of section.paragraphs) {
      parts.push(`<p>${escapeHtml(p)}</p>`);
    }
  }
  return parts.join("\n");
}

// Sanitização do HTML vindo do editor richtext. Allowlist estrita
// (sanitize-html), cobrindo apenas as tags que o editor pode produzir.
// Renderizamos via dangerouslySetInnerHTML no front, então isso é a
// barreira contra XSS armazenado.
export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: [
      "h2",
      "h3",
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    // Apenas protocolos seguros para links
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    disallowedTagsMode: "discard",
    transformTags: {
      // Garante que links externos não vazem o referrer e abram com segurança
      a: sanitize.simpleTransform("a", {
        rel: "noopener noreferrer nofollow",
      }),
    },
  }).trim();
}

// Extrai o texto puro de um HTML para contagem de palavras.
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeReadingMinutesFromText(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function generateIdeas(category: string): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: EDITORIAL_RULES,
    messages: [
      {
        role: "user",
        content: `Gere 10 ideias de título de post para a macrocategoria "${category}" do blog. Cada título deve nomear uma situação ou sentimento concreto do cotidiano do leitor, conter a palavra-chave principal e ter no máximo 70 caracteres. Não use travessão.

Responda APENAS com JSON válido, sem texto extra, no formato:
{"ideas": ["título 1", "título 2", "...", "título 10"]}`,
      },
    ],
  });

  const parsed = parseJson(extractText(message.content)) as {
    ideas?: unknown;
  };
  if (!parsed || !Array.isArray(parsed.ideas)) {
    throw new Error("Resposta da IA em formato inesperado para ideias.");
  }
  const ideas = parsed.ideas
    .filter((i): i is string => typeof i === "string")
    .map((i) => i.replace(/—/g, "-").trim())
    .filter(Boolean);
  if (ideas.length === 0) {
    throw new Error("A IA não retornou nenhuma ideia.");
  }
  return ideas.slice(0, 10);
}

// Constrói um GeneratedPost validado a partir do JSON devolvido pela IA. Usado
// tanto na geração quanto na correção, para aplicar as mesmas validações,
// remoção de travessão e checagem de subcategoria.
function buildGeneratedPost(
  parsed: Partial<GeneratedPost>,
  subcategorias: string[],
): GeneratedPost {
  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.subtitle !== "string" ||
    typeof parsed.excerpt !== "string" ||
    !Array.isArray(parsed.keywords) ||
    !Array.isArray(parsed.body) ||
    typeof parsed.crpClosing !== "string"
  ) {
    throw new Error("Resposta da IA em formato inesperado para o post.");
  }

  const stripDash = (s: string) => s.replace(/—/g, "-").trim();

  const body: BlogPostSection[] = parsed.body
    .filter(
      (s): s is BlogPostSection =>
        !!s && Array.isArray((s as BlogPostSection).paragraphs),
    )
    .map((s) => ({
      heading: s.heading ? stripDash(s.heading) : undefined,
      paragraphs: s.paragraphs
        .filter((p): p is string => typeof p === "string")
        .map(stripDash)
        .filter(Boolean),
    }))
    .filter((s) => s.paragraphs.length > 0);

  if (body.length === 0) {
    throw new Error("A IA não retornou o corpo do post.");
  }

  const keywords = parsed.keywords
    .filter((k): k is string => typeof k === "string")
    .map(stripDash)
    .filter(Boolean)
    .slice(0, 3);

  // Só aceita a subcategoria se for exatamente uma das opções oferecidas.
  const subSugerida =
    typeof parsed.subcategoria === "string"
      ? stripDash(parsed.subcategoria)
      : null;
  const subcategoria =
    subSugerida && subcategorias.includes(subSugerida) ? subSugerida : null;

  const imageQuery =
    typeof parsed.imageQuery === "string"
      ? stripDash(parsed.imageQuery).slice(0, 120)
      : "";

  return {
    title: stripDash(parsed.title).slice(0, 120),
    subtitle: stripDash(parsed.subtitle),
    excerpt: stripDash(parsed.excerpt),
    keywords,
    body,
    crpClosing: stripDash(parsed.crpClosing),
    subcategoria,
    imageQuery,
  };
}

export async function generatePost(
  category: string,
  theme: string,
  subcategorias: string[] = [],
): Promise<GeneratedPost> {
  const subInstrucao =
    subcategorias.length > 0
      ? `\nEscolha o tema específico (subcategoria) mais adequado ao post entre estas opções da macrocategoria: ${subcategorias
          .map((s) => `"${s}"`)
          .join(
            ", ",
          )}. Use exatamente uma dessas opções em "subcategoria", ou null se nenhuma se aplicar.`
      : `\nDefina "subcategoria" como null.`;
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: EDITORIAL_RULES,
    messages: [
      {
        role: "user",
        content: `Escreva um post completo do blog para a macrocategoria "${category}", sobre o tema: "${theme}".

Siga rigorosamente todas as regras editoriais e do CFP. Entre 600 e 900 palavras no total. Nunca use travessão.
${subInstrucao}

IMAGEM DE CAPA: em "imageQuery", escreva uma frase curta em INGLÊS (2 a 5 palavras) para buscar uma foto de banco de imagens que represente o clima do texto. Prefira cenas humanas de acolhimento, natureza, luz ou objetos do cotidiano. Em temas sensíveis (suicídio, automutilação, abuso, violência), use uma imagem simbólica e acolhedora (ex.: "supportive hands warm light", "calm sunrise horizon"), NUNCA literal, gráfica ou perturbadora.

Responda APENAS com JSON válido, sem texto extra, exatamente neste formato:
{
  "title": "título H1, no máximo 70 caracteres",
  "subtitle": "subtítulo/chamada de uma frase",
  "excerpt": "resumo de 1 a 2 frases para o card da listagem",
  "subcategoria": "tema específico da lista, ou null",
  "keywords": ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"],
  "body": [
    { "paragraphs": ["parágrafo de introdução 1", "parágrafo de introdução 2"] },
    { "heading": "Subtítulo H2", "paragraphs": ["parágrafo", "parágrafo"] }
  ],
  "crpClosing": "parágrafo de encerramento no padrão permitido pelo CFP",
  "imageQuery": "frase curta em inglês (2 a 5 palavras) para buscar a foto de capa"
}

O primeiro item de "body" é a introdução e NÃO tem "heading". Em seguida, inclua de 3 a 5 seções, cada uma com "heading" (H2) e seus parágrafos. Não inclua o disclaimer no JSON, ele é adicionado automaticamente.`,
      },
    ],
  });

  const parsed = parseJson(
    extractText(message.content),
  ) as Partial<GeneratedPost>;
  return buildGeneratedPost(parsed, subcategorias);
}

// ------------------------------------------------------------------
// Geração ancorada em demanda real de busca (Fase 1)
// ------------------------------------------------------------------

// Escreve um post a partir de uma PERGUNTA real minerada do Google Autocomplete
// (targetQuery), em vez de um tema inventado pela IA. O H1 responde a busca; as
// perguntas-irmãs do mesmo cluster (relatedQuestions) viram H2 e alimentam uma
// seção final de "Perguntas frequentes". Essa seção vai no próprio corpo (body)
// de propósito: assim passa pelo mesmo revisor CFP e pela correção automática,
// nada de conteúdo escapando da checagem de conformidade.
//
// Reaproveita EDITORIAL_RULES e buildGeneratedPost. Não altera generatePost: o
// fluxo antigo continua idêntico.
export async function generatePostAncorado(
  category: string,
  targetQuery: string,
  relatedQuestions: string[],
  subcategorias: string[] = [],
  subcategoriaSugerida: string | null = null,
): Promise<GeneratedPost> {
  const subInstrucao =
    subcategorias.length > 0
      ? `\nO tema específico (subcategoria) mais provável é ${
          subcategoriaSugerida ? `"${subcategoriaSugerida}"` : "um destes"
        }. Use exatamente uma destas opções em "subcategoria": ${subcategorias
          .map((s) => `"${s}"`)
          .join(", ")}, ou null se nenhuma se aplicar.`
      : `\nDefina "subcategoria" como null.`;

  const listaPerguntas =
    relatedQuestions.length > 0
      ? relatedQuestions.map((q) => `- ${q}`).join("\n")
      : "(nenhuma pergunta relacionada fornecida; crie perguntas frequentes plausíveis e corretas sobre o tema.)";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: EDITORIAL_RULES,
    messages: [
      {
        role: "user",
        content: `Escreva um post completo do blog para a macrocategoria "${category}".

Este post deve responder a uma BUSCA REAL que as pessoas fazem no Google: "${targetQuery}".

DIRETRIZES DE SEO (além de todas as regras editoriais e do CFP):
- O título H1 deve responder ou endereçar diretamente essa busca, de forma natural e correta em português (corrija acentuação e ortografia da busca crua), incluindo a palavra-chave principal, no máximo 70 caracteres.
- Ao longo do texto, use como subtítulos (H2) as perguntas relacionadas abaixo que fizerem sentido, respondendo cada uma de forma clara no(s) parágrafo(s) seguinte(s).
- Ao final, ANTES do encerramento, inclua uma seção com "heading" exatamente igual a "Perguntas frequentes", contendo de 3 a 4 perguntas curtas seguidas de respostas de 1 a 2 frases cada. Cada pergunta é um parágrafo terminando em "?"; a resposta é o parágrafo imediatamente seguinte. As respostas seguem as MESMAS regras do CFP (nada de diagnosticar o leitor, nada de prometer cura, encerramentos condicionais).

PERGUNTAS RELACIONADAS (do mesmo tema, use as pertinentes como H2 e/ou na seção de Perguntas frequentes):
${listaPerguntas}

Siga rigorosamente todas as regras editoriais e do CFP. Entre 600 e 900 palavras no total (a seção de Perguntas frequentes conta). Nunca use travessão.
${subInstrucao}

IMAGEM DE CAPA: em "imageQuery", escreva uma frase curta em INGLÊS (2 a 5 palavras) para buscar uma foto de banco de imagens que represente o clima do texto. Prefira cenas humanas de acolhimento, natureza, luz ou objetos do cotidiano. Em temas sensíveis (suicídio, automutilação, abuso, violência), use uma imagem simbólica e acolhedora, NUNCA literal, gráfica ou perturbadora.

Responda APENAS com JSON válido, sem texto extra, exatamente neste formato:
{
  "title": "título H1, no máximo 70 caracteres, respondendo a busca",
  "subtitle": "subtítulo/chamada de uma frase",
  "excerpt": "resumo de 1 a 2 frases para o card da listagem",
  "subcategoria": "tema específico da lista, ou null",
  "keywords": ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"],
  "body": [
    { "paragraphs": ["parágrafo de introdução 1", "parágrafo de introdução 2"] },
    { "heading": "Subtítulo H2 (pode ser uma pergunta relacionada)", "paragraphs": ["parágrafo", "parágrafo"] },
    { "heading": "Perguntas frequentes", "paragraphs": ["Pergunta 1?", "Resposta 1.", "Pergunta 2?", "Resposta 2.", "Pergunta 3?", "Resposta 3."] }
  ],
  "crpClosing": "parágrafo de encerramento no padrão permitido pelo CFP",
  "imageQuery": "frase curta em inglês (2 a 5 palavras) para buscar a foto de capa"
}

O primeiro item de "body" é a introdução e NÃO tem "heading". Em seguida inclua de 3 a 5 seções com "heading" (H2), sendo a penúltima a seção "Perguntas frequentes". Não inclua o disclaimer no JSON, ele é adicionado automaticamente.`,
      },
    ],
  });

  const parsed = parseJson(
    extractText(message.content),
  ) as Partial<GeneratedPost>;
  return buildGeneratedPost(parsed, subcategorias);
}

// ------------------------------------------------------------------
// Verificação de veracidade (segunda passada independente da IA)
// ------------------------------------------------------------------

// Instrução de sistema do revisor. Independente do gerador: sua única função é
// checar o texto pronto, com viés conservador ("na dúvida, reprova").
const REVIEWER_RULES = `Você é um revisor técnico rigoroso e independente do blog "Terapia Que Cura". Seu trabalho NÃO é escrever nem melhorar o texto, e sim decidir se ele pode ir ao ar sem revisão humana. Você é o último filtro de qualidade antes da publicação automática. Aja com ceticismo profissional.

O QUE VOCÊ DEVE VERIFICAR

1. VERACIDADE TÉCNICA (prioridade máxima). Citar critérios diagnósticos e dados técnicos é permitido e desejável em conteúdo de psicologia, MAS cada dado precisa estar correto. Identifique TODOS os dados técnicos objetivos do texto, um a um:
   - critérios diagnósticos do CID (ex.: "CID-11") ou do DSM (ex.: "DSM-5");
   - estatísticas de prevalência ou incidência (ex.: "1 em cada 5 pessoas");
   - referências a estudos ou pesquisas ("estudos mostram", "pesquisas indicam");
   - resoluções do CFP ou outras normas técnicas;
   - percentuais e números específicos.
   Para CADA dado, decida se está correto conforme o conhecimento técnico consolidado em psicologia. Se um dado estiver errado, desatualizado, ou se você NÃO tiver certeza suficiente para confirmá-lo, marque "correto": false. Na dúvida, reprove: é preferível descartar um post correto a publicar um dado técnico errado.

2. CONFORMIDADE COM O CFP. Reprove se o texto: diagnosticar o leitor a distância (afirmar que ele "tem" uma condição específica); afirmar como fato que o leitor precisa de tratamento; mencionar ou indicar um psicólogo específico; prometer resultado terapêutico ("vai te curar", "com certeza vai resolver"); usar tom alarmista.
   ATENÇÃO ao encerramento: construções CONDICIONAIS são PERMITIDAS e NÃO devem ser reprovadas. Trate como corretas frases como "Se você se identificou com essa situação, pode ser importante conversar com um psicólogo.", "Sinais como esses, em muitos casos, indicam que vale a pena buscar apoio profissional." e "Existem profissionais especializados nesse tema que podem ajudar.". As expressões condicionais "pode ser que", "em muitos casos", "pode" e "talvez" deixam claro que é uma possibilidade, não uma afirmação de fato. Só reprove o encerramento se ele AFIRMAR categoricamente que o leitor tem uma condição (ex.: "Você tem ansiedade.", sem condicional), recomendar procurar/contatar um psicólogo de forma imperativa, ou prometer cura.

3. CONTEÚDO DE RISCO. Se o post tocar em ideação suicida, automutilação, abuso ou violência, verifique se o encerramento inclui a orientação de segurança com o CVV (188). Se o tema é de risco e essa orientação está ausente, reprove.

4. REGRAS EDITORIAIS. Reprove se houver travessão (caractere "—") em qualquer lugar do texto, termo técnico usado sem explicação em linguagem simples, ou promessa de resultado ("com certeza vai resolver", "garante a cura").

DECISÃO
- "aprovado": true SOMENTE se todos os dados técnicos estiverem corretos E não houver nenhuma violação de CFP, de conteúdo de risco ou editorial.
- Se qualquer dado técnico for false, ou houver qualquer violação, "aprovado": false.
- Em "motivos", liste objetivamente cada razão da reprovação (vazio se aprovado).
- Em "checagens_legais", liste CADA dado técnico avaliado com sua citação exata, se está correto e uma observação curta. Se o texto não tiver nenhum dado técnico objetivo, retorne lista vazia.`;

function postParaTextoRevisao(post: GeneratedPost): string {
  const linhas: string[] = [];
  linhas.push(`TÍTULO: ${post.title}`);
  linhas.push(`SUBTÍTULO: ${post.subtitle}`);
  linhas.push(`RESUMO: ${post.excerpt}`);
  linhas.push("");
  for (const section of post.body) {
    if (section.heading) linhas.push(`## ${section.heading}`);
    for (const p of section.paragraphs) linhas.push(p);
    linhas.push("");
  }
  linhas.push(`ENCERRAMENTO: ${post.crpClosing}`);
  return linhas.join("\n");
}

// Marcadores de que o texto faz alguma afirmação técnica concreta (critério
// diagnóstico, estatística, estudo, resolução etc.). Se o texto contém algum
// desses e o revisor devolveu ZERO checagens técnicas, tratamos como falha de
// verificação e reprovamos ("na dúvida, reprova"): não publicamos dado técnico
// sem checagem explícita.
const PADROES_TECNICOS: RegExp[] = [
  /\bCID[-\s]?1[01]?\b/i,
  /\bDSM[-\s]?5\b/i,
  /\bresolu[çc][ãa]o\s+(n[.º°]?\s*)?(do\s+)?CFP\b/i,
  /\bestudos?\s+(mostram|indicam|apontam|revelam|comprovam)\b/i,
  /\bpesquisas?\s+(mostram|indicam|apontam|revelam)\b/i,
  /\bprevalênc[ia]a?\b/i,
  /\bincid[êe]ncia\b/i,
  /\b\d+\s*em\s*cada\s*\d+\b/i,
  /\b\d+\s*%/,
];

function contemDadoTecnico(post: GeneratedPost): boolean {
  const texto = postParaTextoRevisao(post);
  return PADROES_TECNICOS.some((re) => re.test(texto));
}

// Marcadores de conteúdo de risco (ideação suicida, automutilação, abuso),
// usados para exigir a orientação de segurança (CVV 188) no encerramento.
const PADROES_RISCO: RegExp[] = [
  /\bsuic[íi]d[ao]?s?\b/i,
  /\bautomutila[çc][ãa]o\b/i,
  /\bse\s+machucar\b/i,
  /\babuso\s+(sexual|f[íi]sico)\b/i,
  /\bviol[êe]ncia\s+dom[ée]stica\b/i,
];

function ePostDeRisco(post: GeneratedPost): boolean {
  const texto = postParaTextoRevisao(post);
  return PADROES_RISCO.some((re) => re.test(texto));
}

function encerramentoTemOrientacaoDeRisco(post: GeneratedPost): boolean {
  return /\bCVV\b/i.test(post.crpClosing) && /\b188\b/.test(post.crpClosing);
}

// Faz uma segunda passada independente pela IA, no papel de revisor técnico.
// Retorna a decisão de publicação e a checagem explícita de cada dado técnico.
export async function verifyPost(
  category: string,
  theme: string,
  post: GeneratedPost,
): Promise<VerificationResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: REVIEWER_RULES,
    messages: [
      {
        role: "user",
        content: `Revise o post abaixo (macrocategoria "${category}", tema "${theme}") e decida se pode ser publicado automaticamente.

TEXTO DO POST:
"""
${postParaTextoRevisao(post)}
"""

Responda APENAS com JSON válido, sem texto extra, exatamente neste formato:
{
  "aprovado": true,
  "motivos": ["motivo da reprovação 1", "..."],
  "checagens_legais": [
    { "citacao": "trecho exato do dado técnico", "correto": true, "observacao": "por que está correto ou incorreto" }
  ]
}`,
      },
    ],
  });

  const parsed = parseJson(extractText(message.content)) as {
    aprovado?: unknown;
    motivos?: unknown;
    checagens_legais?: unknown;
  };

  if (!parsed || typeof parsed.aprovado !== "boolean") {
    throw new Error("Resposta da IA em formato inesperado para a verificação.");
  }

  const motivos = Array.isArray(parsed.motivos)
    ? parsed.motivos.filter((m): m is string => typeof m === "string")
    : [];

  const checagensLegais: VerificacaoLegal[] = Array.isArray(
    parsed.checagens_legais,
  )
    ? parsed.checagens_legais
        .filter(
          (c): c is { citacao: unknown; correto: unknown; observacao: unknown } =>
            !!c && typeof c === "object",
        )
        .map((c) => ({
          citacao: typeof c.citacao === "string" ? c.citacao : "",
          correto: c.correto === true,
          observacao: typeof c.observacao === "string" ? c.observacao : "",
        }))
    : [];

  // Barreira de segurança determinística: mesmo que o revisor marque "aprovado",
  // qualquer dado técnico marcado como incorreto reprova o post ("na dúvida,
  // reprova").
  const algumDadoIncorreto = checagensLegais.some((c) => !c.correto);
  // Segunda barreira: se o texto tem afirmações técnicas concretas mas o
  // revisor não checou nenhuma, não temos verificação explícita, então
  // reprovamos.
  const faltaChecagem =
    checagensLegais.length === 0 && contemDadoTecnico(post);
  // Terceira barreira: conteúdo de risco (ideação suicida, automutilação,
  // abuso) sempre precisa da orientação de segurança do CVV no encerramento,
  // verificado de forma determinística (não depende do revisor lembrar disso).
  const faltaOrientacaoDeRisco =
    ePostDeRisco(post) && !encerramentoTemOrientacaoDeRisco(post);
  const aprovado =
    parsed.aprovado === true &&
    !algumDadoIncorreto &&
    !faltaChecagem &&
    !faltaOrientacaoDeRisco;

  const motivosFinais = [...motivos];
  if (algumDadoIncorreto && parsed.aprovado === true) {
    motivosFinais.push(
      "Reprovado automaticamente: há dado técnico marcado como incorreto ou não confirmado na checagem.",
    );
  }
  if (faltaChecagem) {
    motivosFinais.push(
      "Reprovado automaticamente: o texto traz dados técnicos, mas o revisor não apresentou a checagem explícita de cada um.",
    );
  }
  if (faltaOrientacaoDeRisco) {
    motivosFinais.push(
      "Reprovado automaticamente: o post toca em tema de risco (ideação suicida, automutilação ou abuso) mas o encerramento não inclui a orientação de segurança do CVV (188).",
    );
  }

  return { aprovado, motivos: motivosFinais, checagensLegais };
}

// ------------------------------------------------------------------
// Correção guiada pelo revisor (terceira passada da IA)
// ------------------------------------------------------------------

// Reescreve um post reprovado corrigindo APENAS os problemas apontados pelo
// revisor, mantendo tema, estrutura e o conteúdo que passou. Dados técnicos
// não confirmados devem ser corrigidos (com alta confiança) ou generalizados,
// nunca inventados. O resultado ainda passa por uma nova verificação no
// chamador; a correção não publica nada por conta própria.
export async function correctPost(
  category: string,
  theme: string,
  post: GeneratedPost,
  verificacao: VerificationResult,
  subcategorias: string[] = [],
): Promise<GeneratedPost> {
  const problemas: string[] = [];
  for (const m of verificacao.motivos) {
    problemas.push(`- ${m}`);
  }
  for (const c of verificacao.checagensLegais) {
    if (!c.correto) {
      problemas.push(
        `- Dado técnico a corrigir: "${c.citacao}". Observação do revisor: ${c.observacao}`,
      );
    }
  }
  const listaProblemas =
    problemas.length > 0
      ? problemas.join("\n")
      : "- O revisor não aprovou o texto para publicação automática. Reforce a conformidade com o CFP e a veracidade dos dados técnicos.";

  const subInstrucao =
    subcategorias.length > 0
      ? `Mantenha "subcategoria" como uma destas opções: ${subcategorias
          .map((s) => `"${s}"`)
          .join(", ")}, ou null.`
      : `Mantenha "subcategoria" como null.`;

  const postAtual = JSON.stringify(
    {
      title: post.title,
      subtitle: post.subtitle,
      excerpt: post.excerpt,
      subcategoria: post.subcategoria,
      keywords: post.keywords,
      body: post.body,
      crpClosing: post.crpClosing,
      imageQuery: post.imageQuery,
    },
    null,
    2,
  );

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: EDITORIAL_RULES,
    messages: [
      {
        role: "user",
        content: `Você escreveu o post abaixo (macrocategoria "${category}", tema "${theme}"), mas o revisor técnico apontou problemas que impedem a publicação automática. Corrija o post resolvendo TODOS os problemas, mantendo o tema, a estrutura e o conteúdo que não foi apontado.

REGRA DE CORREÇÃO (prioridade máxima): a ação PADRÃO para todo dado técnico apontado é GENERALIZAR, não reafirmar. Se o revisor marcou uma estatística, critério diagnóstico, percentual ou referência a estudo como incorreto, controverso ou não confirmável, REMOVA esse dado específico e reescreva o trecho em linguagem geral (ex.: troque "1 em cada 5 pessoas passa por isso" por "é uma situação relativamente comum"; troque "segundo o DSM-5" por "segundo os critérios técnicos usados por profissionais da área"). NUNCA repita o mesmo valor específico que o revisor apontou, mesmo que você acredite que ele está certo, o objetivo é eliminar a controvérsia, não vencê-la. Se o problema for falta de orientação de segurança (CVV/188) em um post sobre tema de risco, inclua essa orientação no "crpClosing" exatamente como especificado nas regras editoriais. Só mantenha um dado numérico/específico se o próprio revisor confirmou explicitamente o valor correto E você tem altíssima confiança nele. Na dúvida, generalize ou remova o trecho. Nunca invente dados. Nunca use travessão. ${subInstrucao}

POST ATUAL (JSON):
"""
${postAtual}
"""

PROBLEMAS APONTADOS PELO REVISOR:
${listaProblemas}

Responda APENAS com JSON válido, sem texto extra, no mesmo formato do post atual (title, subtitle, excerpt, subcategoria, keywords, body, crpClosing, imageQuery). O primeiro item de "body" é a introdução e NÃO tem "heading".`,
      },
    ],
  });

  const parsed = parseJson(
    extractText(message.content),
  ) as Partial<GeneratedPost>;
  const corrigido = buildGeneratedPost(parsed, subcategorias);
  // Preserva a frase de busca da imagem se a correção não a devolveu: o tema
  // não muda numa correção, então a capa original continua válida.
  if (!corrigido.imageQuery) corrigido.imageQuery = post.imageQuery;
  return corrigido;
}
