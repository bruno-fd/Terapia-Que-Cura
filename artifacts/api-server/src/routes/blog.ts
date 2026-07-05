import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { db, blogPostsTable, blogDailyRunsTable } from "@workspace/db";
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
  ListBlogDailyRunsResponse,
} from "@workspace/api-zod";
import {
  generateIdeas,
  generatePost,
  sanitizeHtml,
  htmlToPlainText,
  computeReadingMinutesFromText,
} from "../lib/blog-generator";
import { persistGeneratedPost } from "../lib/blog-posts";
import { isMacroValida, subcategoriasDe } from "../lib/categorias";

// Macrocategorias válidas: a fonte é o espelho server-side em
// ../lib/categorias.ts, mantido em sincronia com a fonte única do front-end
// (artifacts/minha-causa-justa/src/data/categories.ts).
const VALID_CATEGORIES = { has: isMacroValida };

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
    generated = await generatePost(category, theme, subcategoriasDe(category));
  } catch (err) {
    req.log.error({ err }, "Falha ao gerar post");
    res.status(502).json({ error: "Não foi possível gerar o post agora." });
    return;
  }

  // Rascunho: o post só vai ao ar quando o admin clicar em "Publicar".
  const created = await persistGeneratedPost(generated, category, {
    publish: false,
  });

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

  // A macrocategoria efetiva (nova, se enviada; senão a persistida) define quais
  // subcategorias são válidas.
  const categoriaEfetiva = input.category ?? existing.category;
  if (
    input.subcategoria !== undefined &&
    input.subcategoria !== null &&
    !subcategoriasDe(categoriaEfetiva).includes(input.subcategoria)
  ) {
    res.status(400).json({ error: "Subcategoria inválida para a categoria." });
    return;
  }

  const updates: Partial<typeof blogPostsTable.$inferInsert> = {};
  if (input.category !== undefined) updates.category = input.category;
  if (input.subcategoria !== undefined) {
    updates.subcategoria = input.subcategoria;
  }
  // Trocar a macrocategoria pode invalidar a subcategoria persistida: se a nova
  // categoria não a contém e o cliente não enviou uma nova, limpa o tema.
  if (
    input.category !== undefined &&
    input.subcategoria === undefined &&
    existing.subcategoria &&
    !subcategoriasDe(input.category).includes(existing.subcategoria)
  ) {
    updates.subcategoria = null;
  }
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

// Métrica de aceitação do gerador diário automático: resumo por dia (quantos
// dos 12 foram publicados x reprovados x pulados x falhas) e o detalhe da
// execução mais recente.
router.get("/admin/blog/daily-runs", async (_req, res): Promise<void> => {
  // Volume baixo (12/dia): trazemos as execuções recentes e agrupamos em JS.
  const runs = await db
    .select()
    .from(blogDailyRunsTable)
    .orderBy(desc(blogDailyRunsTable.createdAt))
    .limit(400);

  type Run = (typeof runs)[number];

  // Uma categoria pode ter mais de um registro no mesmo dia (re-execução manual,
  // agendamento duplicado). Para a métrica valer por dia (máx. 12), mantemos um
  // registro por (dia, categoria), escolhendo o desfecho mais significativo.
  const PRIORIDADE: Record<string, number> = {
    published: 4,
    rejected: 3,
    failed: 2,
    skipped: 1,
  };
  const escolhido = new Map<string, Run>();
  for (const r of runs) {
    const chave = `${r.runDate}::${r.category}`;
    const atual = escolhido.get(chave);
    if (
      !atual ||
      (PRIORIDADE[r.status] ?? 0) > (PRIORIDADE[atual.status] ?? 0)
    ) {
      escolhido.set(chave, r);
    }
  }
  const deduplicados = Array.from(escolhido.values());

  type Day = {
    runDate: string;
    published: number;
    corrected: number;
    rejected: number;
    skipped: number;
    failed: number;
    total: number;
  };
  const porDia = new Map<string, Day>();
  for (const r of deduplicados) {
    let dia = porDia.get(r.runDate);
    if (!dia) {
      dia = {
        runDate: r.runDate,
        published: 0,
        corrected: 0,
        rejected: 0,
        skipped: 0,
        failed: 0,
        total: 0,
      };
      porDia.set(r.runDate, dia);
    }
    if (
      r.status === "published" ||
      r.status === "rejected" ||
      r.status === "skipped" ||
      r.status === "failed"
    ) {
      dia[r.status] += 1;
    }
    // Publicados que só passaram depois de uma ou mais correções do revisor.
    if (r.status === "published" && (r.correctionRounds ?? 0) > 0) {
      dia.corrected += 1;
    }
    dia.total += 1;
  }

  const days = Array.from(porDia.values())
    .sort((a, b) => (a.runDate < b.runDate ? 1 : -1))
    .slice(0, 14);

  const latestDate = days.length > 0 ? days[0].runDate : "";
  const items = deduplicados
    .filter((r) => r.runDate === latestDate)
    .sort((a, b) => a.category.localeCompare(b.category, "pt-BR"))
    .map((r) => ({
      category: r.category,
      status: r.status,
      title: r.title,
      reason: r.reason,
      postId: r.postId,
      correctionRounds: r.correctionRounds ?? 0,
      createdAt: r.createdAt.toISOString(),
    }));

  res.json(
    ListBlogDailyRunsResponse.parse({
      days,
      latest: { runDate: latestDate, items },
    }),
  );
});

export default router;
