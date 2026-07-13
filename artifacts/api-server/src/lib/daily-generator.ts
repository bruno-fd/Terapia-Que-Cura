import { and, eq, gte } from "drizzle-orm";
import { db, blogPostsTable, blogDailyRunsTable } from "@workspace/db";
import { MACRO_NOMES, subcategoriasDe } from "./categorias";
import {
  generateIdeas,
  generatePost,
  verifyPost,
  correctPost,
} from "./blog-generator";
import { persistGeneratedPost } from "./blog-posts";
import { logger } from "./logger";

// ============================================================
// Gerador diário automático de posts do blog.
//
// Para cada macrocategoria (a lista completa de MACRO_NOMES), publica 1 post
// por dia:
//   gera ideias -> escolhe um tema novo -> escreve o post ->
//   verifica a veracidade (2a passada independente da IA) ->
//   se reprovado, o revisor CORRIGE e reverifica (até 2 rodadas) ->
//   publica a 1a versão aprovada; só DESCARTA se seguir reprovado.
// O número de correções por categoria é registrado para monitorar se o
// escritor precisa de mais reforço no prompt.
//
// Idempotente: se já existe um post criado hoje na categoria (manual ou
// automático), a categoria é pulada. Uma falha isolada não interrompe o lote.
// Cada resultado é registrado em blog_daily_runs para a métrica do /admin.
//
// Executado como comando único (ver package.json "generate-daily-posts"),
// pensado para rodar via Scheduled Deployment 1x por dia.
// ============================================================

export type RunStatus = "published" | "rejected" | "skipped" | "failed";

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
  correctionRounds?: number;
}): Promise<void> {
  await db.insert(blogDailyRunsTable).values({
    runDate: hojeIso(),
    category: entry.category,
    status: entry.status,
    reason: entry.reason ?? null,
    title: entry.title ?? null,
    postId: entry.postId ?? null,
    correctionRounds: entry.correctionRounds ?? 0,
  });
}

// Processa uma macrocategoria de ponta a ponta. Retorna o status registrado.
export async function processarCategoria(category: string): Promise<RunStatus> {
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

  const subcats = subcategoriasDe(category);
  const generated = await generatePost(category, tema, subcats);

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

  // Máximo de rodadas de correção guiada pelo revisor antes de desistir.
  const MAX_CORRECOES = 2;

  // Verificação de veracidade (segunda passada independente da IA). Se reprovar,
  // o revisor corrige o texto e reverificamos, até MAX_CORRECOES rodadas. Só
  // descartamos se continuar reprovado depois disso: nunca publicamos dado
  // jurídico errado, mas damos ao escritor a chance de consertar.
  let atual = generated;
  let verificacao = await verifyPost(category, tema, atual);
  let correcoes = 0;

  while (!verificacao.aprovado && correcoes < MAX_CORRECOES) {
    correcoes += 1;
    logger.info(
      { category, correcao: correcoes, motivos: verificacao.motivos },
      "Post reprovado; tentando correção automática.",
    );
    atual = await correctPost(category, tema, atual, verificacao, subcats);
    verificacao = await verifyPost(category, tema, atual);
  }

  if (!verificacao.aprovado) {
    const reason =
      verificacao.motivos.length > 0
        ? verificacao.motivos.join(" | ")
        : "Reprovado na verificação de veracidade.";
    logger.warn(
      {
        category,
        title: atual.title,
        correcoes,
        motivos: verificacao.motivos,
        checagensLegais: verificacao.checagensLegais,
      },
      "Post reprovado mesmo após correção; descartado.",
    );
    await registrarRun({
      category,
      status: "rejected",
      title: atual.title,
      reason,
      correctionRounds: correcoes,
    });
    return "rejected";
  }

  const created = await persistGeneratedPost(atual, category, {
    publish: true,
  });
  logger.info(
    {
      category,
      title: created.title,
      slug: created.slug,
      postId: created.id,
      correcoes,
    },
    correcoes > 0
      ? "Post publicado automaticamente após correção."
      : "Post publicado automaticamente.",
  );
  await registrarRun({
    category,
    status: "published",
    title: created.title,
    postId: created.id,
    correctionRounds: correcoes,
    reason:
      correcoes > 0
        ? `Publicado após ${correcoes} rodada(s) de correção.`
        : null,
  });
  return "published";
}

// Versão resiliente: nunca lança. Uma falha isolada vira status "failed"
// registrado, para o lote continuar. Usada tanto pelo CLI (loop) quanto pelo
// endpoint de disparo.
export async function processarCategoriaSegura(
  category: string,
): Promise<RunStatus> {
  try {
    return await processarCategoria(category);
  } catch (err) {
    logger.error({ err, category }, "Falha ao processar categoria.");
    try {
      await registrarRun({
        category,
        status: "failed",
        reason: err instanceof Error ? err.message : String(err),
      });
    } catch (logErr) {
      logger.error(
        { err: logErr, category },
        "Falha ao registrar a execução.",
      );
    }
    return "failed";
  }
}

// Macrocategorias que ainda NÃO têm execução registrada hoje (UTC). Depois que
// uma categoria roda (published/rejected/skipped/failed), fica um registro em
// blog_daily_runs, então ela some da lista de pendentes: isso garante no máximo
// uma tentativa por categoria por dia e faz o disparo repetido terminar.
export async function categoriasPendentesHoje(): Promise<string[]> {
  const runs = await db
    .select({ category: blogDailyRunsTable.category })
    .from(blogDailyRunsTable)
    .where(eq(blogDailyRunsTable.runDate, hojeIso()));
  const jaRodou = new Set(runs.map((r) => r.category));
  return Array.from(MACRO_NOMES).filter((c) => !jaRodou.has(c));
}

// Processa UMA categoria pendente e informa quantas ainda faltam. Feito para
// ser chamado repetidamente pelo "despertador" agendado até remaining chegar a
// 0. Se não há pendentes, não consome IA: apenas retorna remaining=0.
export async function rodarProximaCategoria(): Promise<{
  processed: string | null;
  status: RunStatus | null;
  remaining: number;
}> {
  const pendentes = await categoriasPendentesHoje();
  const category = pendentes[0];
  if (!category) {
    return { processed: null, status: null, remaining: 0 };
  }
  const status = await processarCategoriaSegura(category);
  return { processed: category, status, remaining: pendentes.length - 1 };
}
