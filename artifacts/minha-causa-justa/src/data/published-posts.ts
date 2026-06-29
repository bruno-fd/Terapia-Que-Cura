import {
  useListPublishedPosts,
  type BlogPost as ApiBlogPost,
} from "@workspace/api-client-react";
import {
  BLOG_CATEGORIES,
  type BlogCategory,
  type BlogPost,
} from "@/data/blog";

const CATEGORY_SET = new Set<string>(BLOG_CATEGORIES);

function formatDatePtBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Converte um post vindo da API para o formato usado pelas páginas do blog.
export function mapApiPost(post: ApiBlogPost): BlogPost {
  const category: BlogCategory = CATEGORY_SET.has(post.category)
    ? (post.category as BlogCategory)
    : BLOG_CATEGORIES[0];

  return {
    slug: post.slug,
    category,
    title: post.title,
    excerpt: post.excerpt,
    date: formatDatePtBr(post.publishedAt || post.createdAt),
    readingMinutes: post.readingMinutes,
    body: post.body.map((section) => ({
      heading: section.heading ?? undefined,
      paragraphs: section.paragraphs,
    })),
    bodyHtml: post.bodyHtml || undefined,
    subtitle: post.subtitle,
    keywords: post.keywords,
    oabClosing: post.oabClosing,
  };
}

// Hook que retorna os posts publicados (gerados no painel /admin) já mapeados.
export function usePublishedPosts(): {
  posts: BlogPost[];
  isLoading: boolean;
} {
  const { data, isLoading } = useListPublishedPosts();
  const posts = (data ?? []).map(mapApiPost);
  return { posts, isLoading };
}
