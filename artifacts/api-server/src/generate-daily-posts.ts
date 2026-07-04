import { and, eq, gte } from "drizzle-orm";
import { db, pool, blogPostsTable, blogDailyRunsTable } from "@workspace/db";
import { MACRO_NOMES, subcategoriasDe } from "./lib/categorias";
import {
  generateIdeas,
  generatePost,
  verifyPost,
} from "./lib/blog-generator";
import { persistGeneratedPost } from "./lib/blog-posts";
import { logger } from "./lib/logger";

// ============================================================
// Gerador diário automático de posts do blog.
//
// Para cada macrocategoria (12), publica 1 post por dia:
//   gera ideias -> escolhe um tema novo -> escreve o post ->
//   verifica a veracidade (2a passada independente da IA) ->
//   publica se aprovado, senão DESCARTA e registra o motivo.
//
// Idempotente: se já existe um post criado hoje na categoria (manual ou
// automático), a categoria é pulada. Uma falha isolada não interrompe o lote.
// Cada resultado é registrado em blog_daily_runs para a métrica do /admin.
//
// Executado como comando único (ver package.json "generate-daily-posts"),
// pensado para rodar via Scheduled Deployment 1x por dia.
// ============================================================

type RunStatus = "published" | "rejected" | "skipped" | "failed";

// "Hoje" é sempre o dia em UTC, para o rótulo runDate e o corte de idempotência
// usarem a mesma referência (o deploy roda em UTC). Assim o rótulo do dia e a
// checagem "já criei post hoje?" nunca divergem por causa do fuso do host.
function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function inicioDeHoje(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function registrarRun(entry: {
  category: string;
  status: RunStatus;
  reason?: string | null;
  title?: string | null;
  postId?: number | null;
}): Promise<void> {
  await db.insert(blogDailyRunsTable).values({
    runDate: hojeIso(),
    category: entry.category,
    status: entry.status,
    reason: entry.reason ?? null,
    title: entry.title ?? null,
    postId: entry.postId ?? null,
  });
}

// Processa uma macrocategoria de ponta a ponta. Retorna o status registrado.
async function processarCategoria(category: string): Promise<RunStatus> {
  // Idempotência: pula se já houver post criado hoje nesta categoria.
  const [jaExiste] = await db
    .select({ id: blogPostsTable.id })
    .from(blogPostsTable)
    .where(
      and(
        eq(blogPostsTable.category, category),
        gte(blogPostsTable.createdAt, inicioDeHoje()),
      ),
    )
    .limit(1);

  if (jaExiste) {
    logger.info({ category }, "Categoria pulada: já tem post criado hoje.");
    await registrarRun({ category, status: "skipped" });
    return "skipped";
  }

  // Títulos já existentes na categoria, para evitar repetição de tema.
  const existentes = await db
    .select({ title: blogPostsTable.title })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.category, category));
  const titulosExistentes = new Set(existentes.map((r) => normalizar(r.title)));

  // Gera ideias e escolhe a primeira que ainda não virou post.
  const ideias = await generateIdeas(category);
  const tema =
    ideias.find((i) => !titulosExistentes.has(normalizar(i))) ?? ideias[0];

  const generated = await generatePost(category, tema, subcategoriasDe(category));

  // Também evita publicar um título idêntico a um já existente.
  if (titulosExistentes.has(normalizar(generated.title))) {
    logger.info(
      { category, title: generated.title },
      "Post descartado: título repetido.",
    );
    await registrarRun({
      category,
      status: "rejected",
      title: generated.title,
      reason: "Título repetido de um post já existente na categoria.",
    });
    return "rejected";
  }

  // Verificação de veracidade (segunda passada independente da IA).
  const verificacao = await verifyPost(category, tema, generated);

  if (!verificacao.aprovado) {
    const reason =
      verificacao.motivos.length > 0
        ? verificacao.motivos.join(" | ")
        : "Reprovado na verificação de veracidade.";
    logger.warn(
      {
        category,
        title: generated.title,
        motivos: verificacao.motivos,
        checagensLegais: verificacao.checagensLegais,
      },
      "Post reprovado e descartado.",
    );
    await registrarRun({
      category,
      status: "rejected",
      title: generated.title,
      reason,
    });
    return "rejected";
  }

  const created = await persistGeneratedPost(generated, category, {
    publish: true,
  });
  logger.info(
    { category, title: created.title, slug: created.slug, postId: created.id },
    "Post publicado automaticamente.",
  );
  await registrarRun({
    category,
    status: "published",
    title: created.title,
    postId: created.id,
  });
  return "published";
}

async function main(): Promise<void> {
  const categorias = Array.from(MACRO_NOMES);
  logger.info(
    { total: categorias.length },
    "Iniciando geração diária de posts.",
  );

  const contagem: Record<RunStatus, number> = {
    published: 0,
    rejected: 0,
    skipped: 0,
    failed: 0,
  };

  // Sequencial de propósito: mais gentil com os limites de taxa da IA.
  for (const category of categorias) {
    try {
      const status = await processarCategoria(category);
      contagem[status] += 1;
    } catch (err) {
      contagem.failed += 1;
      logger.error({ err, category }, "Falha ao processar categoria.");
      try {
        await registrarRun({
          category,
          status: "failed",
          reason: err instanceof Error ? err.message : String(err),
        });
      } catch (logErr) {
        logger.error({ err: logErr, category }, "Falha ao registrar a execução.");
      }
    }
  }

  logger.info(
    { ...contagem, total: categorias.length },
    "Geração diária concluída.",
  );
}

main()
  .catch((err) => {
    logger.error({ err }, "Erro fatal no gerador diário.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
