import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { db, blogPostsTable } from "@workspace/db";
import {
  ListPublishedPostsResponse,
  GenerateBlogIdeasBody,
  GenerateBlogIdeasResponse,
  ListAdminPostsResponse,
  CreateBlogPostBody,
  CreateBlogPostResponse,
  DeleteBlogPostParams,
  UpdateBlogPostParams,
  UpdateBlogPostBody,
  UpdateBlogPostResponse,
} from "@workspace/api-zod";
import {
  generateIdeas,
  generatePost,
  slugify,
  computeReadingMinutes,
  sectionsToHtml,
  sanitizeHtml,
  htmlToPlainText,
  computeReadingMinutesFromText,
} from "../lib/blog-generator";

// Macrocategorias válidas: devem ser idênticas às categorias do blog público,
// garantindo que todo post gerado caia na categoria correta do site.
// IMPORTANTE: manter em sincronia com a fonte única do front-end em
// artifacts/minha-causa-justa/src/data/categories.ts (campo `nome`).
const VALID_CATEGORIES = new Set<string>([
  "INSS e Previdência",
  "Trabalho e Emprego",
  "Família",
  "Herança e Inventário",
  "Plano de Saúde",
  "Dívidas e Nome Negativado",
  "Imóveis e Moradia",
  "Direito do Consumidor",
  "Acidentes e Indenizações",
  "Crimes e Defesa Criminal",
  "Servidor Público",
  "Empresarial",
]);

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Público: lista de posts publicados (consumido pelo blog)
// ---------------------------------------------------------------------------
router.get("/blog/posts", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true))
    .orderBy(desc(blogPostsTable.createdAt));
  res.json(ListPublishedPostsResponse.parse(posts));
});

router.use("/admin/blog", requireAdmin);

// Gera 10 ideias de título para uma macrocategoria
router.post("/admin/blog/ideas", async (req, res): Promise<void> => {
  const parsed = GenerateBlogIdeasBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!VALID_CATEGORIES.has(parsed.data.category)) {
    res.status(400).json({ error: "Macrocategoria inválida." });
    return;
  }
  try {
    const ideas = await generateIdeas(parsed.data.category);
    res.json(GenerateBlogIdeasResponse.parse({ ideas }));
  } catch (err) {
    req.log.error({ err }, "Falha ao gerar ideias de post");
    res.status(502).json({ error: "Não foi possível gerar as ideias agora." });
  }
});

// Lista todos os posts gerados (gestão no admin)
router.get("/admin/blog/posts", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(blogPostsTable)
    .orderBy(desc(blogPostsTable.createdAt));
  res.json(ListAdminPostsResponse.parse(posts));
});

// Gera e publica um post completo na categoria escolhida
router.post("/admin/blog/posts", async (req, res): Promise<void> => {
  const parsed = CreateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, theme } = parsed.data;

  if (!VALID_CATEGORIES.has(category)) {
    res.status(400).json({ error: "Macrocategoria inválida." });
    return;
  }

  let generated;
  try {
    generated = await generatePost(category, theme);
  } catch (err) {
    req.log.error({ err }, "Falha ao gerar post");
    res.status(502).json({ error: "Não foi possível gerar o post agora." });
    return;
  }

  // Garante slug único
  const baseSlug = slugify(generated.title) || "post";
  let slug = baseSlug;
  let suffix = 2;
  // Loop limitado para evitar colisões de slug
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

  const readingMinutes = computeReadingMinutes(
    generated.body,
    generated.oabClosing,
  );

  const [created] = await db
    .insert(blogPostsTable)
    .values({
      slug,
      category,
      title: generated.title,
      subtitle: generated.subtitle,
      excerpt: generated.excerpt,
      keywords: generated.keywords,
      readingMinutes,
      body: generated.body,
      bodyHtml: sectionsToHtml(generated.body),
      oabClosing: generated.oabClosing,
      // Rascunho: o post só vai ao ar quando o admin clicar em "Publicar".
      published: false,
    })
    .returning();

  res.status(201).json(CreateBlogPostResponse.parse(created));
});

// Atualiza um post: edição de conteúdo (richtext) e publicação/despublicação
router.patch("/admin/blog/posts/:id", async (req, res): Promise<void> => {
  const params = UpdateBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;

  if (input.category !== undefined && !VALID_CATEGORIES.has(input.category)) {
    res.status(400).json({ error: "Macrocategoria inválida." });
    return;
  }

  const [existing] = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Post não encontrado." });
    return;
  }

  const updates: Partial<typeof blogPostsTable.$inferInsert> = {};
  if (input.category !== undefined) updates.category = input.category;
  if (input.title !== undefined) updates.title = input.title;
  if (input.subtitle !== undefined) updates.subtitle = input.subtitle;
  if (input.excerpt !== undefined) updates.excerpt = input.excerpt;
  if (input.oabClosing !== undefined) updates.oabClosing = input.oabClosing;
  if (input.published !== undefined) {
    updates.published = input.published;
    // Registra a data da primeira publicação (filtro por data de publicação).
    if (input.published && existing.publishedAt === null) {
      updates.publishedAt = new Date();
    }
  }

  if (input.bodyHtml !== undefined) {
    const cleanHtml = sanitizeHtml(input.bodyHtml);
    updates.bodyHtml = cleanHtml;
    const oab =
      input.oabClosing !== undefined ? input.oabClosing : existing.oabClosing;
    const text = `${htmlToPlainText(cleanHtml)} ${oab}`;
    updates.readingMinutes = computeReadingMinutesFromText(text);
  }

  if (Object.keys(updates).length === 0) {
    res.json(UpdateBlogPostResponse.parse(existing));
    return;
  }

  const [updated] = await db
    .update(blogPostsTable)
    .set(updates)
    .where(eq(blogPostsTable.id, params.data.id))
    .returning();

  res.json(UpdateBlogPostResponse.parse(updated));
});

// Remove um post gerado
router.delete("/admin/blog/posts/:id", async (req, res): Promise<void> => {
  const params = DeleteBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(blogPostsTable)
    .where(eq(blogPostsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Post não encontrado." });
    return;
  }

  res.sendStatus(204);
});

export default router;
