import { eq } from "drizzle-orm";
import { db, blogPostsTable, type BlogPostRow } from "@workspace/db";
import {
  type GeneratedPost,
  slugify,
  computeReadingMinutes,
  sectionsToHtml,
} from "./blog-generator";
import { subcategoriasDe } from "./categorias";

// Garante um slug único na tabela de posts, adicionando um sufixo numérico
// (ou o timestamp como último recurso) quando já existe.
async function ensureUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugify(title) || "post";
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const [existing] = await db
      .select({ id: blogPostsTable.id })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.slug, slug));
    if (!existing) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
    if (suffix > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }
  return slug;
}

// Persiste um post gerado pela IA. Núcleo compartilhado entre o fluxo manual do
// /admin (rascunho) e o gerador diário automático (publicado). Cuida do slug
// único, do tempo de leitura, da validação da subcategoria e do insert.
export async function persistGeneratedPost(
  generated: GeneratedPost,
  category: string,
  opts: { publish: boolean },
): Promise<BlogPostRow> {
  const slug = await ensureUniqueSlug(generated.title);
  const readingMinutes = computeReadingMinutes(
    generated.body,
    generated.oabClosing,
  );

  // A IA pode sugerir um tema específico (subcategoria); só persistimos se ele
  // pertencer à macrocategoria escolhida.
  const subcategoria =
    generated.subcategoria &&
    subcategoriasDe(category).includes(generated.subcategoria)
      ? generated.subcategoria
      : null;

  const [created] = await db
    .insert(blogPostsTable)
    .values({
      slug,
      category,
      subcategoria,
      title: generated.title,
      subtitle: generated.subtitle,
      excerpt: generated.excerpt,
      keywords: generated.keywords,
      readingMinutes,
      body: generated.body,
      bodyHtml: sectionsToHtml(generated.body),
      oabClosing: generated.oabClosing,
      published: opts.publish,
      // A data de publicação só é registrada quando o post já vai ao ar.
      publishedAt: opts.publish ? new Date() : null,
    })
    .returning();

  return created;
}
