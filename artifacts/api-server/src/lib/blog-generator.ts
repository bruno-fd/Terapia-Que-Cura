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

interface GeneratedPost {
  title: string;
  subtitle: string;
  excerpt: string;
  keywords: string[];
  body: BlogPostSection[];
  oabClosing: string;
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
): Promise<GeneratedPost> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: EDITORIAL_RULES,
    messages: [
      {
        role: "user",
        content: `Escreva um post completo do blog para a macrocategoria "${category}", sobre o tema: "${theme}".

Siga rigorosamente todas as regras editoriais e da OAB. Entre 600 e 900 palavras no total. Nunca use travessão.

Responda APENAS com JSON válido, sem texto extra, exatamente neste formato:
{
  "title": "título H1, no máximo 70 caracteres",
  "subtitle": "subtítulo/chamada de uma frase",
  "excerpt": "resumo de 1 a 2 frases para o card da listagem",
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

  return {
    title: stripDash(parsed.title).slice(0, 120),
    subtitle: stripDash(parsed.subtitle),
    excerpt: stripDash(parsed.excerpt),
    keywords,
    body,
    oabClosing: stripDash(parsed.oabClosing),
  };
}
