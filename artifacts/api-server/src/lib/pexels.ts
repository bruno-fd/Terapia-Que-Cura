import { logger } from "./logger";

// ============================================================
// Imagem de capa royalty-free via API do Pexels (gratuita).
// A imagem é OPCIONAL: qualquer falha (sem chave, sem resultado, erro de rede)
// retorna null e o post segue sem capa. Nunca lança exceção, para não impedir
// a publicação de um post por causa da imagem.
// ============================================================

export interface ThemedImage {
  url: string;
  alt: string;
  credit: string; // nome do fotógrafo
  creditUrl: string; // link para o autor/foto no Pexels
}

interface PexelsPhoto {
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  url?: string;
  src?: {
    landscape?: string;
    large?: string;
    large2x?: string;
    original?: string;
  };
}

// Consulta de reserva por macrocategoria (em inglês, que rende melhores
// resultados no Pexels), usada quando o redator não sugeriu uma frase própria.
const QUERY_POR_CATEGORIA: Record<string, string> = {
  "Ansiedade e Estresse": "calm breathing relief",
  "Depressão e Transtornos de Humor": "quiet window light hope",
  "Relacionamentos e Casais": "couple conversation connection",
  "Família e Parentalidade": "family together home",
  "Infância e Adolescência": "teenager outdoors thoughtful",
  "Luto, Envelhecimento e Cuidados Paliativos": "comforting hands support",
  "Autoconhecimento e Desenvolvimento Pessoal": "person reflection nature",
  "Traumas e Violência": "person peaceful sunlight resilience",
  "Dependências e Compulsões": "person recovery hope path",
  "Transtornos Alimentares": "healthy mindful eating calm",
  "Sexualidade e Identidade de Gênero": "diverse people acceptance",
  "Saúde Mental e Transtornos Psiquiátricos": "mental wellbeing calm mind",
  "Avaliações e Perícias Psicológicas": "psychologist notes desk",
  "Carreira e Vida Profissional": "professional workplace balance",
};

export function queryDeReserva(category: string): string {
  return QUERY_POR_CATEGORIA[category] ?? "mental health wellbeing calm";
}

// Guarda determinística: mesmo com a instrução no prompt, o modelo pode gerar
// uma frase de busca literal/gráfica em temas sensíveis. Se a frase contiver
// qualquer termo de risco, ela é descartada em favor da consulta de reserva
// (curada e segura) da categoria. Termos em inglês porque a imageQuery é em
// inglês; incluímos raízes para pegar variações (ex.: "suicid" pega
// "suicide"/"suicidal").
const TERMOS_BLOQUEADOS = [
  "suicid",
  "self-harm",
  "self harm",
  "selfharm",
  "self injury",
  "cutting wrist",
  "blood",
  "gore",
  "corpse",
  "dead body",
  "death",
  "hanging",
  "noose",
  "weapon",
  "gun",
  "knife",
  "violence",
  "violent",
  "abuse",
  "assault",
  "rape",
  "nude",
  "naked",
  "sexual",
  "porn",
  "drug",
  "cocaine",
  "heroin",
  "overdose",
  "wound",
  "starving",
];

export function imageQuerySegura(query: string): boolean {
  const q = query.toLowerCase();
  return !TERMOS_BLOQUEADOS.some((t) => q.includes(t));
}

// Escolhe a consulta final: usa a sugestão da IA só se for segura; senão cai na
// consulta de reserva da categoria (sempre segura).
export function resolverQueryDeImagem(
  sugerida: string | undefined,
  category: string,
): string {
  const s = (sugerida ?? "").trim();
  if (s && imageQuerySegura(s)) return s;
  return queryDeReserva(category);
}

// Só confia em URLs https de domínios do Pexels (a origem dos dados). Barra
// qualquer coisa fora disso antes de persistir/renderizar (defesa contra
// injeção de URL em href/src).
function urlHttpsPexels(u: string | undefined): string | null {
  if (!u) return null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (host === "pexels.com" || host.endsWith(".pexels.com")) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search";

// Busca uma foto de banco que combine com o termo. Retorna null em qualquer
// falha, sem lançar.
export async function fetchThemedImage(
  query: string,
): Promise<ThemedImage | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    logger.warn("PEXELS_API_KEY ausente; post seguirá sem imagem de capa.");
    return null;
  }
  const termo = query.trim();
  if (!termo) return null;

  try {
    const url = new URL(PEXELS_ENDPOINT);
    url.searchParams.set("query", termo);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("per_page", "12");

    const resp = await fetch(url, { headers: { Authorization: apiKey } });
    if (!resp.ok) {
      logger.warn(
        { status: resp.status, termo },
        "Busca de imagem no Pexels falhou.",
      );
      return null;
    }
    const data = (await resp.json()) as { photos?: PexelsPhoto[] };
    const photos = Array.isArray(data.photos) ? data.photos : [];
    if (photos.length === 0) {
      logger.info({ termo }, "Pexels não retornou imagens para o termo.");
      return null;
    }

    // Escolha determinística pelo termo, para que dois posts com o mesmo tema
    // não caiam sempre na mesma foto.
    let hash = 0;
    for (let i = 0; i < termo.length; i++) {
      hash = (hash + termo.charCodeAt(i)) % photos.length;
    }
    const photo = photos[hash] ?? photos[0];

    const src = urlHttpsPexels(
      photo.src?.landscape ??
        photo.src?.large ??
        photo.src?.large2x ??
        photo.src?.original,
    );
    if (!src) return null;

    return {
      url: src,
      alt: (photo.alt ?? "").slice(0, 300),
      credit: photo.photographer ?? "Pexels",
      creditUrl:
        urlHttpsPexels(photo.photographer_url) ??
        urlHttpsPexels(photo.url) ??
        "https://www.pexels.com",
    };
  } catch (err) {
    logger.warn({ err, termo }, "Erro ao buscar imagem no Pexels.");
    return null;
  }
}
