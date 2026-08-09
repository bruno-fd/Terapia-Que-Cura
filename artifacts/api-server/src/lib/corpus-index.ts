import { and, eq, inArray, sql } from "drizzle-orm";
import { db, blogPostsTable, blogPostIndexTable } from "@workspace/db";
import {
  embeddingsDisponiveis,
  gerarEmbedding,
  gerarEmbeddings,
  toPgVector,
} from "./embeddings";
import { normalizarQuery } from "./keyword-research";
import { logger } from "./logger";

// ============================================================
// Índice do corpus + anti-canibalização + citação cruzada + diagnóstico.
//
// A única trava de duplicidade que existia era comparação de TÍTULO EXATO
// normalizado. Isto acrescenta:
//   Camada 1 lexical (pg_trgm): similarity(title_normalized, candidato) > 0.55
//   Camada 2 semântica (pgvector, cosseno): > 0.85
//
// Tudo é FAIL-OPEN: se a tabela/extensão ainda não existir, ou não houver
// provider de embeddings, as funções degradam (retornam "não é duplicado" /
// lista vazia) em vez de quebrar a geração. Requer o migrate para valer.
// ============================================================

const LIMIAR_LEXICAL = 0.55;
const LIMIAR_SEMANTICO = 0.85;
// Faixa "relacionado mas não duplicado" para a citação cruzada.
const RELACIONADO_MIN = 0.35;
const RELACIONADO_MAX = 0.85;
// Limiares (mais frouxos) para o RELATÓRIO do passivo já publicado.
const REPORT_LEXICAL = 0.5;
const REPORT_SEMANTICO = 0.82;

function textoParaEmbedding(title: string, excerpt: string): string {
  return `${title}. ${excerpt}`.replace(/\s+/g, " ").trim();
}

// (Re)indexa um post. Post inexistente ou não publicado é removido do índice
// (o corpus de canibalização é o que está no ar). Idempotente. Nunca lança.
export async function indexarPost(postId: number): Promise<void> {
  try {
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

    const titleNormalized = normalizarQuery(post.title);
    const embedded = textoParaEmbedding(post.title, post.excerpt);
    const emb = await gerarEmbedding(embedded);

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
  } catch (err) {
    logger.warn({ err, postId }, "Falha ao indexar post (ignorado).");
  }
}

// Reconstrói o índice a partir dos posts publicados. Idempotente.
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
        titleNormalized: normalizarQuery(p.title),
        embeddedText: textos[i],
        embedding: emb ?? null,
      })
      .onConflictDoUpdate({
        target: blogPostIndexTable.postId,
        set: {
          titleNormalized: normalizarQuery(p.title),
          embeddedText: textos[i],
          embedding: emb ?? null,
          updatedAt: new Date(),
        },
      });
    indexados++;
  }

  // Remove do índice o que não está mais publicado.
  const ids = posts.map((p) => p.id);
  await db
    .delete(blogPostIndexTable)
    .where(
      sql`${blogPostIndexTable.postId} NOT IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );

  logger.info({ indexados }, "Corpus indexado.");
  return { indexados };
}

// Cobertura LEXICAL (Camada 1) de um texto contra o corpus. Usada nos dois
// checkpoints (enfileirar e antes de publicar). Retorna o postId mais parecido
// acima do limiar, ou null. Fail-open (null) se a tabela/extensão não existir.
export async function coberturaLexical(texto: string): Promise<number | null> {
  const cand = normalizarQuery(texto);
  if (!cand) return null;
  try {
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
  } catch {
    return null; // tabela/extensão ainda não existe: não bloqueia
  }
}

export interface ResultadoCanibalizacao {
  duplicado: boolean;
  camada: "lexical" | "semantica" | null;
  postId: number | null;
  similaridade: number | null;
}

// Checagem completa (Camada 1 + Camada 2) antes de publicar. Fail-open.
export async function verificarCanibalizacao(
  titulo: string,
  resumo: string,
): Promise<ResultadoCanibalizacao> {
  const naoDuplicado: ResultadoCanibalizacao = {
    duplicado: false,
    camada: null,
    postId: null,
    similaridade: null,
  };

  const cand = normalizarQuery(titulo);
  try {
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
  } catch {
    return naoDuplicado;
  }

  if (embeddingsDisponiveis()) {
    try {
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
    } catch {
      return naoDuplicado;
    }
  }

  return naoDuplicado;
}

export interface PostRelacionado {
  postId: number;
  title: string;
  slug: string;
}

// Posts relacionados mas NÃO duplicados (faixa semântica [0.35, 0.85)) para a
// citação cruzada. Só semântico. Sem embeddings, retorna vazio. Fail-open.
export async function postsRelacionadosParaCitar(
  texto: string,
  limite = 3,
  excluirPostId?: number,
): Promise<PostRelacionado[]> {
  if (!embeddingsDisponiveis()) return [];
  try {
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
    const out: PostRelacionado[] = [];
    for (const c of candidatos) {
      const p = porId.get(c.postId);
      if (p) out.push({ postId: p.id, title: p.title, slug: p.slug });
    }
    return out;
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------
// Diagnóstico do PASSIVO (posts já publicados que se canibalizam).
// READ-ONLY: só lista pares quase-gêmeos, não altera nada. O usuário decide o
// que fazer (despublicar o mais fraco, fundir + 301, ou deixar).
// ------------------------------------------------------------------

export interface ParCanibalizacao {
  camada: "lexical" | "semantica";
  similaridade: number;
  a: { postId: number; title: string; slug: string };
  b: { postId: number; title: string; slug: string };
}

export async function relatorioCanibalizacao(): Promise<{
  pares: ParCanibalizacao[];
  totalIndexados: number;
}> {
  const [{ total } = { total: 0 }] = (
    await db.execute<{ total: number }>(
      sql`SELECT count(*)::int AS total FROM blog_post_index`,
    )
  ).rows;

  // Pares lexicais (self-join com pg_trgm).
  const lexicais = await db.execute<{
    a_id: number;
    b_id: number;
    sim: number;
  }>(
    sql`SELECT a.post_id AS a_id, b.post_id AS b_id,
               similarity(a.title_normalized, b.title_normalized) AS sim
        FROM blog_post_index a
        JOIN blog_post_index b ON a.post_id < b.post_id
        WHERE a.title_normalized % b.title_normalized
          AND similarity(a.title_normalized, b.title_normalized) >= ${REPORT_LEXICAL}
        ORDER BY sim DESC
        LIMIT 200`,
  );

  // Pares semânticos (self-join com pgvector), só se houver embeddings.
  let semanticos: { rows: { a_id: number; b_id: number; cos: number }[] } = {
    rows: [],
  };
  if (embeddingsDisponiveis()) {
    try {
      semanticos = await db.execute<{ a_id: number; b_id: number; cos: number }>(
        sql`SELECT a.post_id AS a_id, b.post_id AS b_id,
                   1 - (a.embedding <=> b.embedding) AS cos
            FROM blog_post_index a
            JOIN blog_post_index b ON a.post_id < b.post_id
            WHERE a.embedding IS NOT NULL AND b.embedding IS NOT NULL
              AND 1 - (a.embedding <=> b.embedding) >= ${REPORT_SEMANTICO}
            ORDER BY cos DESC
            LIMIT 200`,
      );
    } catch {
      semanticos = { rows: [] };
    }
  }

  // Junta títulos/slugs.
  const ids = new Set<number>();
  for (const r of lexicais.rows) {
    ids.add(Number(r.a_id));
    ids.add(Number(r.b_id));
  }
  for (const r of semanticos.rows) {
    ids.add(Number(r.a_id));
    ids.add(Number(r.b_id));
  }
  const posts =
    ids.size > 0
      ? await db
          .select({
            id: blogPostsTable.id,
            title: blogPostsTable.title,
            slug: blogPostsTable.slug,
          })
          .from(blogPostsTable)
          .where(inArray(blogPostsTable.id, Array.from(ids)))
      : [];
  const porId = new Map(posts.map((p) => [p.id, p]));
  const info = (id: number) => {
    const p = porId.get(id);
    return { postId: id, title: p?.title ?? "(?)", slug: p?.slug ?? "" };
  };

  // Dedup por par (a<b): mantém o maior sinal; marca a camada.
  const porChave = new Map<string, ParCanibalizacao>();
  for (const r of lexicais.rows) {
    const chave = `${r.a_id}-${r.b_id}`;
    porChave.set(chave, {
      camada: "lexical",
      similaridade: Number(Number(r.sim).toFixed(3)),
      a: info(Number(r.a_id)),
      b: info(Number(r.b_id)),
    });
  }
  for (const r of semanticos.rows) {
    const chave = `${r.a_id}-${r.b_id}`;
    const existente = porChave.get(chave);
    const cos = Number(Number(r.cos).toFixed(3));
    // Se já veio pelo lexical, não sobrescreve, mas se o semântico é mais forte
    // e o par ainda não existe, adiciona.
    if (!existente) {
      porChave.set(chave, {
        camada: "semantica",
        similaridade: cos,
        a: info(Number(r.a_id)),
        b: info(Number(r.b_id)),
      });
    }
  }

  const pares = Array.from(porChave.values()).sort(
    (x, y) => y.similaridade - x.similaridade,
  );
  return { pares, totalIndexados: Number(total) };
}
