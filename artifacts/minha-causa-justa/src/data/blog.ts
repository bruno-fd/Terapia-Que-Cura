// ============================================================
// Blog data — posts (conteúdo fictício)
// Fonte única usada por blog.tsx, post.tsx e BlogSidebar.tsx
// As categorias vêm de data/categories.ts (fonte única do site).
// ============================================================

import { CATEGORIA_NOMES, type CategoriaNome } from "@/data/categories";

export const BLOG_CATEGORIES = CATEGORIA_NOMES;

export type BlogCategory = CategoriaNome;

export interface PostSection {
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  category: BlogCategory;
  // Tema específico (subcategoria) do post, quando definido no painel /admin.
  subcategoria?: string;
  title: string;
  excerpt: string;
  date: string;
  readingMinutes: number;
  body: PostSection[];
  // Conteúdo richtext (HTML), presente em posts gerados/editados no painel /admin.
  // Quando presente, tem precedência sobre `body` na renderização.
  bodyHtml?: string;
  // Campos preenchidos apenas em posts gerados pelo painel /admin
  subtitle?: string;
  keywords?: string[];
  crpClosing?: string;
  // Imagem de capa royalty-free (Pexels) escolhida pelo tema do post.
  coverImageUrl?: string;
  coverImageAlt?: string;
  coverImageCredit?: string;
  coverImageCreditUrl?: string;
}

// Sem posts fixos/fictícios: o blog agora exibe apenas os posts oficiais
// criados e publicados pelo painel /admin (armazenados no banco de dados).
export const BLOG_POSTS: BlogPost[] = [];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
