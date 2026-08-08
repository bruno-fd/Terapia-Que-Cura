import { and, eq, inArray, sql } from "drizzle-orm";
import { db, blogPostsTable, blogPostIndexTable } from "@workspace/db";
import {
  embeddingsDisponiveis,
  gerarEmbedding,
  gerarEmbeddings,
  toPgVector,
} from "./embeddings";
import { normalizar } from "./keyword-research";
import { logger } from "./logger";

// ============================================================
// Indice do corpus + anti-canibalizacao + citacao cruzada.
//
// O maior risco num site com muitos posts nao e qualidade, e CANIBALIZACAO:
// publicar algo perto demais de um post que ja ranqueia, fazendo os dois
// competirem pela mesma busca. Dedup por titulo exato nao basta.
//
//   Camada 1 (lexical, pg_trgm): similarity(title_normalized, candidato) > 0.55
//   Camada 2 (semantica, pgvector): cosseno > 0.85
//
// O mesmo indice alimenta a citacao cruzada (faixa semantica intermediaria).
//
// Requer pg_trgm e pgvector + os indices criados por blog-migrate.ts. Degrada
// para so-lexical quando nao ha provider de embeddings.
// ============================================================

const LIMIAR_LEXICAL = 0.55;
const LIMIAR_SEMANTICO = 0.85;
// Faixa de "relacionado mas nao duplicado" para a citacao cruzada.
const RELACIONADO_MIN = 0.35;
const RELACIONADO_MAX = 0.85;

function textoParaEmbedding(title: string, excerpt: string): string {
  return `${title}. ${excerpt}`.replace(/\s+/g, " ").trim();
}

// (Re)indexa um post. Se o post nao existe ou nao esta publicado, remove-o do
// indice (o corpus de canibalizacao e o que ranqueia = publicados). Idempotente.
export async function indexarPost(postId: number): Promise<void> {
  const [post] = await db
    .select({
      id: blogPostsTable.id,
      title: blogPostsTable.title,
      excerpt: blogPostsTable.excerpt,
      published: blogPostsTable.published,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.id, postId));

  if (!post || !post.published) {
    await db
      .delete(blogPostIndexTable)
      .where(eq(blogPostIndexTable.postId, postId));
    return;
  }

  const titleNormalized = normalizar(post.title);
  const embedded = textoParaEmbedding(post.title, post.excerpt);
  const emb = await gerarEmbedding(embedded);

  // Upsert. A coluna vector recebe o literal via SQL bruto (pgvector).
  await db
    .insert(blogPostIndexTable)
    .values({
      postId: post.id,
      titleNormalized,
      embeddedText: embedded,
      embedding: emb ?? null,
    })
    .onConflictDoUpdate({
      target: blogPostIndexTable.postId,
      set: {
        titleNormalized,
        embeddedText: embedded,
        embedding: emb ?? null,
        updatedAt: new Date(),
      },
    });
}

// Reindexa todos os posts publicados. Reconstruivel a qualquer momento.
export async function indexarCorpus(): Promise<{ indexados: number }> {
  const posts = await db
    .select({
      id: blogPostsTable.id,
      title: blogPostsTable.title,
      excerpt: blogPostsTable.excerpt,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true));

  if (posts.length === 0) return { indexados: 0 };

  // Embeddings em lote (um unico ida-e-volta por fatia).
  const textos = posts.map((p) => textoParaEmbedding(p.title, p.excerpt));
  const vetores = embeddingsDisponiveis() ? await gerarEmbeddings(textos) : null;

  let indexados = 0;
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const emb = vetores ? vetores[i] : null;
    await db
      .insert(blogPostIndexTable)
      .values({
        postId: p.id,
        titleNormalized: normalizar(p.title),
        embeddedText: textos[i],
        embedding: emb ?? null,
      })
      .onConflictDoUpdate({
        target: blogPostIndexTable.postId,
        set: {
          titleNormalized: normalizar(p.title),
          embeddedText: textos[i],
          embedding: emb ?? null,
          updatedAt: new Date(),
        },
      });
    indexados++;
  }

  // Remove do indice posts que nao estao mais publicados.
  const idsPublicados = posts.map((p) => p.id);
  await db
    .delete(blogPostIndexTable)
    .where(
      idsPublicados.length > 0
        ? sql`${blogPostIndexTable.postId} NOT IN (${sql.join(
            idsPublicados.map((id) => sql`${id}`),
            sql`, `,
          )})`
        : sql`true`,
    );

  logger.info({ indexados }, "Corpus indexado.");
  return { indexados };
}

// Cobertura LEXICAL (Camada 1) de um texto contra o corpus. Usada no checkpoint
// de ENFILEIRAR (nivel topico): se ja ha post cobrindo a busca, nao enfileira.
// Retorna o postId do mais parecido acima do limiar, ou null.
export async function coberturaLexical(texto: string): Promise<number | null> {
  const cand = normalizar(texto);
  if (!cand) return null;
  const res = await db.execute<{ post_id: number; sim: number }>(
    sql`SELECT post_id, similarity(title_normalized, ${cand}) AS sim
        FROM blog_post_index
        WHERE title_normalized % ${cand}
        ORDER BY sim DESC
        LIMIT 1`,
  );
  const row = res.rows[0];
  if (row && Number(row.sim) > LIMIAR_LEXICAL) return Number(row.post_id);
  return null;
}

export interface ResultadoCanibalizacao {
  duplicado: boolean;
  camada: "lexical" | "semantica" | null;
  postId: number | null;
  similaridade: number | null;
}

// Checagem completa (Camada 1 + Camada 2) antes de publicar (nivel rascunho).
// Se provavel duplicata, quem chama descarta e manda para revisao humana.
export async function verificarCanibalizacao(
  titulo: string,
  resumo: string,
): Promise<ResultadoCanibalizacao> {
  // Camada 1: lexical por titulo.
  const cand = normalizar(titulo);
  if (cand) {
    const res = await db.execute<{ post_id: number; sim: number }>(
      sql`SELECT post_id, similarity(title_normalized, ${cand}) AS sim
          FROM blog_post_index
          WHERE title_normalized % ${cand}
          ORDER BY sim DESC
          LIMIT 1`,
    );
    const row = res.rows[0];
    if (row && Number(row.sim) > LIMIAR_LEXICAL) {
      return {
        duplicado: true,
        camada: "lexical",
        postId: Number(row.post_id),
        similaridade: Number(row.sim),
      };
    }
  }

  // Camada 2: semantica (so com provider de embeddings).
  if (embeddingsDisponiveis()) {
    const emb = await gerarEmbedding(textoParaEmbedding(titulo, resumo));
    if (emb) {
      const vec = toPgVector(emb);
      const res = await db.execute<{ post_id: number; cos: number }>(
        sql`SELECT post_id, 1 - (embedding <=> ${vec}::vector) AS cos
            FROM blog_post_index
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> ${vec}::vector ASC
            LIMIT 1`,
      );
      const row = res.rows[0];
      if (row && Number(row.cos) > LIMIAR_SEMANTICO) {
        return {
          duplicado: true,
          camada: "semantica",
          postId: Number(row.post_id),
          similaridade: Number(row.cos),
        };
      }
    }
  }

  return { duplicado: false, camada: null, postId: null, similaridade: null };
}

export interface PostRelacionado {
  postId: number;
  title: string;
  slug: string;
}

// Posts relacionados mas NAO duplicados (faixa semantica [0.35, 0.85)) para a
// citacao cruzada. So semantico (precisa de "mesmo tema, outras palavras").
// Sem embeddings, retorna vazio (nao ha citacao cruzada).
export async function postsRelacionadosParaCitar(
  texto: string,
  limite = 3,
  excluirPostId?: number,
): Promise<PostRelacionado[]> {
  if (!embeddingsDisponiveis()) return [];
  const emb = await gerarEmbedding(texto);
  if (!emb) return [];
  const vec = toPgVector(emb);

  const res = await db.execute<{ post_id: number; cos: number }>(
    sql`SELECT post_id, 1 - (embedding <=> ${vec}::vector) AS cos
        FROM blog_post_index
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${vec}::vector ASC
        LIMIT 20`,
  );

  const candidatos = res.rows
    .map((r) => ({ postId: Number(r.post_id), cos: Number(r.cos) }))
    .filter(
      (r) =>
        r.cos >= RELACIONADO_MIN &&
        r.cos < RELACIONADO_MAX &&
        r.postId !== excluirPostId,
    )
    .slice(0, limite);

  if (candidatos.length === 0) return [];

  const ids = candidatos.map((c) => c.postId);
  const posts = await db
    .select({
      id: blogPostsTable.id,
      title: blogPostsTable.title,
      slug: blogPostsTable.slug,
    })
    .from(blogPostsTable)
    .where(
      and(inArray(blogPostsTable.id, ids), eq(blogPostsTable.published, true)),
    );

  const porId = new Map(posts.map((p) => [p.id, p]));
  const resultado: PostRelacionado[] = [];
  for (const c of candidatos) {
    const p = porId.get(c.postId);
    if (p) resultado.push({ postId: p.id, title: p.title, slug: p.slug });
  }
  return resultado;
}
