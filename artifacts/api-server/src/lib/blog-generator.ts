import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { BlogPostSection } from "@workspace/db";
import sanitize from "sanitize-html";

const MODEL = "claude-sonnet-4-6";

// ============================================================
// Regras editoriais e da OAB (instrução de sistema do gerador)
// Derivadas do briefing do projeto "Gerador de Posts".
// ============================================================
const EDITORIAL_RULES = `Você é um redator especializado em conteúdo jurídico popular para o blog da plataforma "Minha Causa Justa". Seu público é o adulto brasileiro com baixo letramento jurídico. Escreva sempre em português do Brasil.

ESTRUTURA OBRIGATÓRIA DE CADA POST
- Título H1: claro, com a palavra-chave principal, no máximo 70 caracteres, nomeando a situação ou problema de forma direta.
- Subtítulo/chamada: uma frase que complementa o título e introduz o conteúdo.
- Introdução: dois a três parágrafos contextualizando o problema no cotidiano do leitor, sem juridiquês e sem afirmar que o leitor foi lesado.
- Três a cinco seções com subtítulo (H2): cada uma cobre um ângulo (o que diz a lei, quais os direitos, prazos relevantes, o que observar primeiro etc.), com dois a três parágrafos cada.
- Encerramento padrão OAB: parágrafo final informando que, se a situação aconteceu com o leitor, pode ser que seus direitos não tenham sido respeitados, e que existem profissionais especializados na área.
- Tamanho total entre 600 e 900 palavras.

LINGUAGEM
- Simples, direta, coloquial mas correta. Frases curtas e médias. Parágrafos curtos.
- Todo termo jurídico deve ser explicado imediatamente após o uso, em linguagem coloquial, entre parênteses ou em frase curta seguinte. Nunca deixe um termo sem explicação.

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

REGRAS DA OAB (Código de Ética e Provimento 205/2021)
- Nunca recomende conduta processual: não diga ao leitor para "entrar com ação", "processar", "recorrer na justiça", "acionar o INSS" ou variações. O texto informa o que a lei prevê; a decisão de agir é sempre do leitor.
- Nunca afirme como fato que o leitor foi lesado. Pode informar que determinada prática é ilegal, mas não pode concluir que aconteceu com aquele leitor.
- Nunca mencione ou linke um advogado específico.
- Nunca estimule o litígio. Tom de esclarecimento e empoderamento informativo, nunca de indignação. Permitido: "um reajuste pode ser ilegal". Proibido: "não aceite isso", "exija seus direitos".
- Vocabulário PERMITIDO no encerramento: "Se isso aconteceu com você, pode ser que seus direitos não tenham sido respeitados."; "Situações como essa, em muitos casos, têm respaldo na legislação brasileira."; "Existem profissionais especializados nessa área que podem avaliar sua situação."
- Vocabulário PROIBIDO no encerramento: "Você foi lesado."; "Entre em contato com um advogado."; "Procure um advogado agora."; "Você tem direito de processar."; "Não deixe isso passar."`;

export interface GeneratedPost {
  title: string;
  subtitle: string;
  excerpt: string;
  keywords: string[];
  body: BlogPostSection[];
  oabClosing: string;
  // Tema específico sugerido pela IA (uma das subcategorias da macrocategoria),
  // ou null quando nenhuma se aplica. Validado no chamador.
  subcategoria: string | null;
}

// Resultado da verificação de veracidade/conformidade feita por uma segunda
// passada independente da IA (revisor jurídico).
export interface VerificacaoLegal {
  // Trecho exato do dado jurídico avaliado (lei, artigo, prazo, valor etc.).
  citacao: string;
  // true se o revisor confirmou o dado como correto; false se errado/duvidoso.
  correto: boolean;
  observacao: string;
}

export interface VerificationResult {
  aprovado: boolean;
  // Motivos da reprovação (vazio quando aprovado).
  motivos: string[];
  // Checagem explícita de cada dado jurídico encontrado no texto.
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
  oabClosing: string,
): number {
  let words = oabClosing.split(/\s+/).filter(Boolean).length;
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
        content: `Gere 10 ideias de título de post para a macrocategoria "${category}" do blog. Cada título deve nomear uma situação ou problema concreto do cotidiano do leitor, conter a palavra-chave principal e ter no máximo 70 caracteres. Não use travessão.

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

Siga rigorosamente todas as regras editoriais e da OAB. Entre 600 e 900 palavras no total. Nunca use travessão.
${subInstrucao}

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
  "oabClosing": "parágrafo de encerramento no padrão permitido pela OAB"
}

O primeiro item de "body" é a introdução e NÃO tem "heading". Em seguida, inclua de 3 a 5 seções, cada uma com "heading" (H2) e seus parágrafos. Não inclua o disclaimer no JSON, ele é adicionado automaticamente.`,
      },
    ],
  });

  const parsed = parseJson(extractText(message.content)) as Partial<GeneratedPost>;

  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.subtitle !== "string" ||
    typeof parsed.excerpt !== "string" ||
    !Array.isArray(parsed.keywords) ||
    !Array.isArray(parsed.body) ||
    typeof parsed.oabClosing !== "string"
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

  return {
    title: stripDash(parsed.title).slice(0, 120),
    subtitle: stripDash(parsed.subtitle),
    excerpt: stripDash(parsed.excerpt),
    keywords,
    body,
    oabClosing: stripDash(parsed.oabClosing),
    subcategoria,
  };
}

// ------------------------------------------------------------------
// Verificação de veracidade (segunda passada independente da IA)
// ------------------------------------------------------------------

// Instrução de sistema do revisor. Independente do gerador: sua única função é
// checar o texto pronto, com viés conservador ("na dúvida, reprova").
const REVIEWER_RULES = `Você é um revisor jurídico rigoroso e independente do blog "Minha Causa Justa". Seu trabalho NÃO é escrever nem melhorar o texto, e sim decidir se ele pode ir ao ar sem revisão humana. Você é o último filtro de qualidade antes da publicação automática. Aja com ceticismo profissional.

O QUE VOCÊ DEVE VERIFICAR

1. VERACIDADE JURÍDICA (prioridade máxima). Citar leis e artigos é permitido e desejável em conteúdo jurídico, MAS cada dado precisa estar correto. Identifique TODOS os dados jurídicos objetivos do texto, um a um:
   - número de lei, decreto, súmula ou medida provisória (ex.: "Lei 8.078/1990", "CLT art. 477");
   - número de artigo, inciso ou parágrafo;
   - prazos (ex.: "prazo de 5 anos", "30 dias");
   - valores em reais, percentuais, multas, alíquotas, índices;
   - datas e vigências.
   Para CADA dado, decida se está correto conforme a legislação brasileira vigente. Se um dado estiver errado, desatualizado, ou se você NÃO tiver certeza suficiente para confirmá-lo, marque "correto": false. Na dúvida, reprove: é preferível descartar um post correto a publicar um dado jurídico errado.

2. CONFORMIDADE COM A OAB. Reprove se o texto: recomendar conduta processual ("entre com ação", "processe", "recorra", "acione o INSS"); afirmar como fato que o leitor foi lesado; mencionar ou indicar um advogado específico; estimular o litígio ou usar tom de indignação.

3. REGRAS EDITORIAIS. Reprove se houver travessão (caractere "—") em qualquer lugar do texto, termo jurídico usado sem explicação em linguagem simples, ou promessa de resultado ("você vai ganhar", "com certeza receberá").

DECISÃO
- "aprovado": true SOMENTE se todos os dados jurídicos estiverem corretos E não houver nenhuma violação de OAB ou editorial.
- Se qualquer dado jurídico for false, ou houver qualquer violação, "aprovado": false.
- Em "motivos", liste objetivamente cada razão da reprovação (vazio se aprovado).
- Em "checagens_legais", liste CADA dado jurídico avaliado com sua citação exata, se está correto e uma observação curta. Se o texto não tiver nenhum dado jurídico objetivo, retorne lista vazia.`;

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
  linhas.push(`ENCERRAMENTO: ${post.oabClosing}`);
  return linhas.join("\n");
}

// Marcadores de que o texto faz alguma afirmação jurídica concreta (lei, artigo,
// prazo, valor, percentual etc.). Se o texto contém algum desses e o revisor
// devolveu ZERO checagens legais, tratamos como falha de verificação e
// reprovamos ("na dúvida, reprova"): não publicamos dado jurídico sem checagem
// explícita.
const PADROES_JURIDICOS: RegExp[] = [
  /\bartigos?\b/i,
  /\bart\.?\s*\d/i,
  /§/,
  /\bincisos?\b/i,
  /\bleis?\s+(n[.º°]?\s*)?\d/i,
  /\blei\s+complementar\b/i,
  /\bc[óo]digo\b/i,
  /\bCLT\b/,
  /\bCF\b/,
  /\bconstitui[çc][ãa]o\b/i,
  /\bs[úu]mula\b/i,
  /\bdecreto\b/i,
  /\bmedida provis[óo]ria\b/i,
  /\bjurisprud[êe]ncia\b/i,
  /\bprazo\b/i,
  /\b\d+\s*(dias?|meses|m[êe]s|anos?)\b/i,
  /R\$\s*\d/,
  /\b\d+\s*%/,
];

function contemDadoJuridico(post: GeneratedPost): boolean {
  const texto = postParaTextoRevisao(post);
  return PADROES_JURIDICOS.some((re) => re.test(texto));
}

// Faz uma segunda passada independente pela IA, no papel de revisor jurídico.
// Retorna a decisão de publicação e a checagem explícita de cada dado legal.
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
    { "citacao": "trecho exato do dado jurídico", "correto": true, "observacao": "por que está correto ou incorreto" }
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
  // qualquer dado legal marcado como incorreto reprova o post ("na dúvida,
  // reprova").
  const algumDadoIncorreto = checagensLegais.some((c) => !c.correto);
  // Segunda barreira: se o texto tem afirmações jurídicas concretas mas o revisor
  // não checou nenhuma, não temos verificação explícita, então reprovamos.
  const faltaChecagem =
    checagensLegais.length === 0 && contemDadoJuridico(post);
  const aprovado =
    parsed.aprovado === true && !algumDadoIncorreto && !faltaChecagem;

  const motivosFinais = [...motivos];
  if (algumDadoIncorreto && parsed.aprovado === true) {
    motivosFinais.push(
      "Reprovado automaticamente: há dado jurídico marcado como incorreto ou não confirmado na checagem.",
    );
  }
  if (faltaChecagem) {
    motivosFinais.push(
      "Reprovado automaticamente: o texto traz dados jurídicos, mas o revisor não apresentou a checagem explícita de cada um.",
    );
  }

  return { aprovado, motivos: motivosFinais, checagensLegais };
}
