import type { BlogPost } from "@/data/blog";
import { slugDaCategoria } from "@/data/categories";

// ============================================================
// Construção dos dados estruturados (JSON-LD) de um post do blog.
//
// Pura: recebe o post e a origem, devolve os objetos schema.org. Não toca no
// DOM nem depende de React, para poder ser reaproveitada tanto no client-side
// (post.tsx, Fase 2A) quanto no server-side/dynamic rendering (Fase 2B).
//
// Emite:
//   - BlogPosting: entende o artigo (título, data, autor, imagem...).
//   - FAQPage: extraído da seção "Perguntas frequentes" do corpo; é o que
//     habilita o rich result de perguntas do Google.
//   - BreadcrumbList: trilha Início › Blog › Categoria › Post.
// ============================================================

const ORG = "Terapia Que Cura";

// Extrai pares pergunta/resposta da seção "Perguntas frequentes" do corpo.
// Um parágrafo terminando em "?" abre uma pergunta; os parágrafos seguintes
// (até a próxima pergunta) formam a resposta.
function extrairFaq(post: BlogPost): { pergunta: string; resposta: string }[] {
  const secao = post.body?.find(
    (s) => s.heading && /perguntas\s+frequentes/i.test(s.heading),
  );
  if (!secao) return [];

  const pares: { pergunta: string; resposta: string }[] = [];
  let atual: { pergunta: string; respostas: string[] } | null = null;

  const fechar = () => {
    if (atual && atual.respostas.length > 0) {
      pares.push({
        pergunta: atual.pergunta,
        resposta: atual.respostas.join(" "),
      });
    }
  };

  for (const paragrafo of secao.paragraphs) {
    const texto = paragrafo.trim();
    if (!texto) continue;
    if (texto.endsWith("?")) {
      fechar();
      atual = { pergunta: texto, respostas: [] };
    } else if (atual) {
      atual.respostas.push(texto);
    }
  }
  fechar();
  return pares;
}

export function buildStructuredData(post: BlogPost, origin: string): unknown[] {
  const canonical = `${origin}/blog/${post.slug}`;
  const description = post.excerpt ?? post.subtitle ?? "";
  const image = post.coverImageUrl ?? `${origin}/opengraph.webp`;
  const grafo: unknown[] = [];

  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title.slice(0, 110),
    description,
    image: [image],
    inLanguage: "pt-BR",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    author: { "@type": "Organization", name: ORG, url: origin },
    publisher: {
      "@type": "Organization",
      name: ORG,
      logo: { "@type": "ImageObject", url: `${origin}/opengraph.webp` },
    },
    articleSection: post.category,
  };
  if (post.publishedAtIso) {
    article.datePublished = post.publishedAtIso;
    article.dateModified = post.publishedAtIso;
  }
  if (post.keywords && post.keywords.length > 0) {
    article.keywords = post.keywords.join(", ");
  }
  grafo.push(article);

  // FAQPage só quando há pelo menos 2 perguntas válidas (evita marcação frágil).
  const faq = extrairFaq(post);
  if (faq.length >= 2) {
    grafo.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.pergunta,
        acceptedAnswer: { "@type": "Answer", text: f.resposta },
      })),
    });
  }

  const catSlug = slugDaCategoria(post.category);
  const trilha: Record<string, unknown>[] = [
    { "@type": "ListItem", position: 1, name: "Início", item: origin },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${origin}/blog` },
  ];
  if (catSlug) {
    trilha.push({
      "@type": "ListItem",
      position: 3,
      name: post.category,
      item: `${origin}/blog?categoria=${catSlug}`,
    });
  }
  trilha.push({
    "@type": "ListItem",
    position: catSlug ? 4 : 3,
    name: post.title,
    item: canonical,
  });
  grafo.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trilha,
  });

  return grafo;
}
