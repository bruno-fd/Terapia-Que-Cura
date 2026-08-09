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
// Camada 1 lexical (pg_trgm): compara a ENTIDADE (título sem o "molde"), não o
// título inteiro. Sem isso, o molde repetido ("... tem cura? o que esperar do
// tratamento", "... o que é e como...", "... sintomas que você precisa
// conhecer") domina o trigrama e faz temas DISTINTOS colidirem (Alcoolismo x
// Bulimia). Ao comparar só a entidade, "alcoolismo" x "bulimia" ~ 0.
// Camada 2 semântica (pgvector, cosseno): pega a reformulação de mesmo tema com
// outras palavras.
//
// Guarda de variante numérica: entidades iguais a menos de um número (Bipolar
// Tipo 1 x Tipo 2, TEA nível 1 x 2) são temas DISTINTOS e nunca bloqueiam.
//
// Limiares configuráveis por env (calibráveis em produção sem redeploy de
// lógica): BLOG_CANIB_LEX (default 0.72), BLOG_CANIB_SEM (default 0.90).
//
// Tudo FAIL-OPEN: sem tabela/extensão/embeddings, degrada (não bloqueia).
// ============================================================

function envNum(name: string, def: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
}

// Camada 1 (lexical sobre a ENTIDADE). Real duplicate após remover o molde fica
// ~1.0; temas distintos ficam baixos. 0.72 mantém "coração acelerado sem motivo"
// x "...sem motivo aparente" e barra "ansiedade" x "ansiedade social".
const LIMIAR_LEXICAL = envNum("BLOG_CANIB_LEX", 0.72);
// Camada 2 (semântica). 0.90: pega os duplicados reais de mesmo tema (0.89-0.90
// no corpus) sem pegar mesma-macro/tema-vizinho.
const LIMIAR_SEMANTICO = envNum("BLOG_CANIB_SEM", 0.9);

// Faixa "relacionado mas não duplicado" para a citação cruzada.
const RELACIONADO_MIN = 0.35;
const RELACIONADO_MAX = 0.85;
// Limiares (mais frouxos) para o RELATÓRIO do passivo já publicado.
const REPORT_LEXICAL = 0.5;
const REPORT_SEMANTICO = 0.82;

// "Moldes" de título: trechos boilerplate que se repetem entre posts de temas
// diferentes. Removidos antes do trigrama para isolar a ENTIDADE. Ordenados por
// tamanho (mais longos primeiro) no uso. Já em forma normalizada (sem acento).
const MOLDES = [
  "o que e e como a psicologia pode ajudar",
  "como a psicologia pode ajudar",
  "o que esperar do tratamento",
  "sintomas que voce precisa conhecer",
  "tudo o que voce precisa saber",
  "sintomas causas e tratamento",
  "causas sintomas e tratamento",
  "o que e e como reconhecer",
  "o que e e como identificar",
  "o que e e como lidar",
  "o que e e como tratar",
  "o que e e o que fazer",
  "o que e e como",
  "sintomas e o que fazer",
  "quando ele vira um problema",
  "quando ela vira um problema",
  "quando vira um problema",
  "sinais e sintomas",
  "causas e tratamento",
  "qual e a diferenca",
  "qual a diferenca",
  "o que pode ser",
  "o que significa",
  "como reconhecer",
  "como identificar",
  "como lidar com",
  "guia completo",
  "o que fazer",
  "como lidar",
  "como tratar",
  "como funciona",
  "como superar",
  "tem cura",
  "o que e",
  "sintomas",
  "tratamento",
  "diferenca",
  "causas",
  "entenda",
].sort((a, b) => b.length - a.length);

// Conectivos/preposições que não carregam tema. Usados para limpar sobras do
// stripMold e para o teste de subtema.
const BORDA_STOP = new Set([
  "de", "do", "da", "dos", "das", "e", "o", "a", "os", "as", "para", "com",
  "no", "na", "em", "que", "por", "ao", "aos",
]);

// Qualificadores "de recheio": aparecem como token extra mas NÃO tornam o tema
// distinto (é reformulação, não subtema). "coração acelerado sem motivo" x
// "...sem motivo aparente" continua sendo o mesmo tema (duplicata).
const FILLER = new Set([
  "aparente", "mesmo", "realmente", "afinal", "comum", "normal", "verdadeiro",
  "verdadeira", "exato", "exata", "simples",
]);

// Limpa sobras do stripMold: descarta "google" inicial, remove conectivos
// soltos nas bordas e runs de conectivos deixados no meio ao remover um molde
// (ex.: "burnout e para melhorar" -> "burnout melhorar"), preservando um
// conectivo único entre palavras de conteúdo ("nao monogamia e poliamor").
function limparEntidade(s: string): string {
  let toks = s.split(" ").filter(Boolean);
  if (toks[0] === "google") toks = toks.slice(1);
  const isStop = (t: string) => BORDA_STOP.has(t);
  const out: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (isStop(t)) {
      const prevStop = i === 0 || isStop(toks[i - 1]);
      const nextStop = i === toks.length - 1 || isStop(toks[i + 1]);
      if (i === 0 || i === toks.length - 1 || prevStop || nextStop) continue;
    }
    out.push(t);
  }
  while (out.length && isStop(out[0])) out.shift();
  while (out.length && isStop(out[out.length - 1])) out.pop();
  return out.join(" ");
}

// Remove o molde do título normalizado e limpa sobras, deixando a entidade/tema.
// Se sobrar vazio (título 100% molde), devolve o normalizado original para não
// comparar string vazia (que casaria com tudo).
export function stripMold(titleNormalized: string): string {
  let s = ` ${titleNormalized} `;
  for (const molde of MOLDES) {
    s = s.split(` ${molde} `).join(" ");
  }
  s = limparEntidade(s.replace(/\s+/g, " ").trim());
  return s || titleNormalized;
}

function numerosDe(s: string): string {
  return (s.match(/\b\d+\b/g) ?? []).sort().join(",");
}

// Iguais exceto por um número (Bipolar Tipo 1 x Tipo 2): temas distintos.
function diferemApenasPorNumero(a: string, b: string): boolean {
  const na = numerosDe(a);
  const nb = numerosDe(b);
  if (!na && !nb) return false;
  const semNum = (x: string) =>
    x.replace(/\b\d+\b/g, " ").replace(/\s+/g, " ").trim();
  return semNum(a) === semNum(b) && na !== nb;
}

// Tokens de conteúdo (sem conectivos).
function conteudo(s: string): Set<string> {
  return new Set(s.split(" ").filter((t) => t && !BORDA_STOP.has(t)));
}

// Subtema qualificado: uma entidade é subconjunto estrito da outra, e o(s)
// token(s) extra(s) são conteúdo significativo (não filler). Ex.: "estresse pos
// traumatico" x "...no trabalho", "avaliacao psicologica para cirurgia" x "...de
// catarata", "transtorno bipolar" x "transtorno bipolar tipo 1". São páginas
// legítimas mais específicas, não duplicatas. NÃO dispara para filler puro
// ("...sem motivo" x "...sem motivo aparente"), que continua duplicata.
function ehSubtemaQualificado(a: string, b: string): boolean {
  const A = conteudo(a);
  const B = conteudo(b);
  const [menor, maior] = A.size <= B.size ? [A, B] : [B, A];
  if (menor.size === 0 || menor.size === maior.size) return false;
  for (const t of menor) if (!maior.has(t)) return false; // menor ⊆ maior
  const extras = [...maior].filter((t) => !menor.has(t));
  const significativos = extras.filter(
    (t) => !FILLER.has(t) && !/^\d+$/.test(t),
  );
  // Precisa de qualificador significativo, mas POUCOS (<=2 extras): muitos
  // tokens extra são resíduo de FRASE ("e quando pode ajudar sua familia"), não
  // subtema. Corta o falso negativo (2) mesmo sem depender do teto.
  return significativos.length >= 1 && extras.length <= 2;
}

// Teto de similaridade acima do qual "subtema" NÃO se aplica: nos dados reais o
// subtema legítimo vive ~0.72-0.80 e a duplicata reformulada vive acima de 0.85
// ("...desse ciclo" x "...do ciclo" = 0.868 é duplicata, não subtema). Só a
// guarda numérica sobrevive ao teto (Tipo 1 x Tipo 2 ~ 0.846).
const TETO_SUBTEMA = envNum("BLOG_CANIB_SUBTEMA_TETO", 0.85);

// Distintos na camada LEXICAL: variante numérica (sempre) ou subtema qualificado
// SÓ abaixo do teto de similaridade.
function distintosLexical(a: string, b: string, sim: number): boolean {
  if (diferemApenasPorNumero(a, b)) return true;
  return sim < TETO_SUBTEMA && ehSubtemaQualificado(a, b);
}

// Distintos na camada SEMÂNTICA: só variante numérica. Cosseno alto é mesmo
// conteúdo independentemente de subconjunto, então NÃO aplicamos subtema aqui.
function distintosSemantico(a: string, b: string): boolean {
  return diferemApenasPorNumero(a, b);
}

function textoParaEmbedding(title: string, excerpt: string): string {
  return `${title}. ${excerpt}`.replace(/\s+/g, " ").trim();
}

// (Re)indexa um post. Post inexistente ou não publicado é removido do índice.
// Idempotente. Nunca lança.
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
    const entityNormalized = stripMold(titleNormalized);
    const embedded = textoParaEmbedding(post.title, post.excerpt);
    const emb = await gerarEmbedding(embedded);

    await db
      .insert(blogPostIndexTable)
      .values({
        postId: post.id,
        titleNormalized,
        entityNormalized,
        embeddedText: embedded,
        embedding: emb ?? null,
      })
      .onConflictDoUpdate({
        target: blogPostIndexTable.postId,
        set: {
          titleNormalized,
          entityNormalized,
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
    const titleNormalized = normalizarQuery(p.title);
    const entityNormalized = stripMold(titleNormalized);
    await db
      .insert(blogPostIndexTable)
      .values({
        postId: p.id,
        titleNormalized,
        entityNormalized,
        embeddedText: textos[i],
        embedding: emb ?? null,
      })
      .onConflictDoUpdate({
        target: blogPostIndexTable.postId,
        set: {
          titleNormalized,
          entityNormalized,
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

// Alerta ÚNICO (por processo) quando o gate falha ao consultar o índice. Isso
// distingue "erro real" (tabela/coluna inexistente por deploy sem /migrate, que
// deixa o gate fail-open e SILENCIOSO) de estado legítimo. Fail-open silencioso
// num gate é caro: já custou um dia inteiro de geração sem checagem.
let avisouGateIndisponivel = false;
function avisarGateIndisponivel(err: unknown): void {
  if (avisouGateIndisponivel) return;
  avisouGateIndisponivel = true;
  logger.warn(
    { err },
    "Gate de canibalização indisponível ao consultar blog_post_index (rode POST /internal/blog/migrate). Operando fail-open, SEM checagem, até resolver.",
  );
}

// Cobertura LEXICAL (Camada 1, por ENTIDADE) de um texto contra o corpus. Usada
// nos checkpoints de enfileirar e de seleção do alvo. Retorna o postId mais
// parecido acima do limiar (ignorando temas distintos), ou null. Fail-open.
export async function coberturaLexical(texto: string): Promise<number | null> {
  const cand = stripMold(normalizarQuery(texto));
  if (!cand) return null;
  try {
    const res = await db.execute<{
      post_id: number;
      entity: string;
      sim: number;
    }>(
      sql`SELECT post_id, entity_normalized AS entity,
                 similarity(entity_normalized, ${cand}) AS sim
          FROM blog_post_index
          WHERE entity_normalized % ${cand}
          ORDER BY sim DESC
          LIMIT 1`,
    );
    const row = res.rows[0];
    if (
      row &&
      Number(row.sim) > LIMIAR_LEXICAL &&
      !distintosLexical(cand, String(row.entity), Number(row.sim))
    ) {
      return Number(row.post_id);
    }
    return null;
  } catch (err) {
    avisarGateIndisponivel(err);
    return null; // tabela/extensão ainda não existe: não bloqueia
  }
}

export interface ResultadoCanibalizacao {
  duplicado: boolean;
  camada: "lexical" | "semantica" | null;
  postId: number | null;
  similaridade: number | null;
}

// Checagem completa (Camada 1 por entidade + Camada 2 semântica) antes de
// publicar. Aplica a guarda de variante numérica nas duas camadas. Fail-open.
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

  const candEntity = stripMold(normalizarQuery(titulo));

  // Camada 1: lexical por entidade.
  try {
    if (candEntity) {
      const res = await db.execute<{
        post_id: number;
        entity: string;
        sim: number;
      }>(
        sql`SELECT post_id, entity_normalized AS entity,
                   similarity(entity_normalized, ${candEntity}) AS sim
            FROM blog_post_index
            WHERE entity_normalized % ${candEntity}
            ORDER BY sim DESC
            LIMIT 1`,
      );
      const row = res.rows[0];
      if (
        row &&
        Number(row.sim) > LIMIAR_LEXICAL &&
        !distintosLexical(candEntity, String(row.entity), Number(row.sim))
      ) {
        return {
          duplicado: true,
          camada: "lexical",
          postId: Number(row.post_id),
          similaridade: Number(row.sim),
        };
      }
    }
  } catch (err) {
    avisarGateIndisponivel(err);
    return naoDuplicado;
  }

  // Camada 2: semântica (só com provider de embeddings).
  if (embeddingsDisponiveis()) {
    try {
      const emb = await gerarEmbedding(textoParaEmbedding(titulo, resumo));
      if (emb) {
        const vec = toPgVector(emb);
        const res = await db.execute<{
          post_id: number;
          entity: string;
          cos: number;
        }>(
          sql`SELECT post_id, entity_normalized AS entity,
                     1 - (embedding <=> ${vec}::vector) AS cos
              FROM blog_post_index
              WHERE embedding IS NOT NULL
              ORDER BY embedding <=> ${vec}::vector ASC
              LIMIT 1`,
        );
        const row = res.rows[0];
        if (
          row &&
          Number(row.cos) > LIMIAR_SEMANTICO &&
          !distintosSemantico(candEntity, String(row.entity))
        ) {
          return {
            duplicado: true,
            camada: "semantica",
            postId: Number(row.post_id),
            similaridade: Number(row.cos),
          };
        }
      }
    } catch (err) {
      avisarGateIndisponivel(err);
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
// READ-ONLY. `bloquearia` mostra se o gate ATUAL barraria aquele par (ajuda a
// validar a precisão da recalibragem contra o corpus real).
// ------------------------------------------------------------------

export interface ParCanibalizacao {
  camada: "lexical" | "semantica";
  similaridade: number;
  bloquearia: boolean;
  // QUAL camada de fato dispararia o bloqueio (o merge por chave usa OR, então um
  // par pode aparecer com `camada`/`similaridade` lexical baixa mas bloquear via
  // cosseno). Estes dois deixam a leitura correta.
  disparoLexical: boolean;
  disparoSemantico: boolean;
  // true quando são temas distintos (variante numérica ou subtema qualificado),
  // por isso NÃO bloqueiam mesmo com similaridade alta.
  temasDistintos: boolean;
  a: { postId: number; title: string; slug: string; entity: string };
  b: { postId: number; title: string; slug: string; entity: string };
}

export async function relatorioCanibalizacao(): Promise<{
  pares: ParCanibalizacao[];
  totalIndexados: number;
  bloqueariaTotal: number;
}> {
  const [{ total } = { total: 0 }] = (
    await db.execute<{ total: number }>(
      sql`SELECT count(*)::int AS total FROM blog_post_index`,
    )
  ).rows;

  // Pares lexicais por ENTIDADE (self-join com pg_trgm).
  const lexicais = await db.execute<{
    a_id: number;
    b_id: number;
    a_entity: string;
    b_entity: string;
    sim: number;
  }>(
    sql`SELECT a.post_id AS a_id, b.post_id AS b_id,
               a.entity_normalized AS a_entity, b.entity_normalized AS b_entity,
               similarity(a.entity_normalized, b.entity_normalized) AS sim
        FROM blog_post_index a
        JOIN blog_post_index b ON a.post_id < b.post_id
        WHERE a.entity_normalized % b.entity_normalized
          AND similarity(a.entity_normalized, b.entity_normalized) >= ${REPORT_LEXICAL}
        ORDER BY sim DESC
        LIMIT 300`,
  );

  // Pares semânticos (self-join com pgvector), só se houver embeddings.
  let semanticos: {
    rows: { a_id: number; b_id: number; a_entity: string; b_entity: string; cos: number }[];
  } = { rows: [] };
  if (embeddingsDisponiveis()) {
    try {
      semanticos = await db.execute<{
        a_id: number;
        b_id: number;
        a_entity: string;
        b_entity: string;
        cos: number;
      }>(
        sql`SELECT a.post_id AS a_id, b.post_id AS b_id,
                   a.entity_normalized AS a_entity, b.entity_normalized AS b_entity,
                   1 - (a.embedding <=> b.embedding) AS cos
            FROM blog_post_index a
            JOIN blog_post_index b ON a.post_id < b.post_id
            WHERE a.embedding IS NOT NULL AND b.embedding IS NOT NULL
              AND 1 - (a.embedding <=> b.embedding) >= ${REPORT_SEMANTICO}
            ORDER BY cos DESC
            LIMIT 300`,
      );
    } catch {
      semanticos = { rows: [] };
    }
  }

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
  const info = (id: number, entity: string) => {
    const p = porId.get(id);
    return {
      postId: id,
      title: p?.title ?? "(?)",
      slug: p?.slug ?? "",
      entity,
    };
  };

  const porChave = new Map<string, ParCanibalizacao>();

  for (const r of lexicais.rows) {
    const chave = `${r.a_id}-${r.b_id}`;
    const sim = Number(Number(r.sim).toFixed(3));
    const temasDistintos = distintosLexical(
      String(r.a_entity),
      String(r.b_entity),
      sim,
    );
    const disparoLexical = sim > LIMIAR_LEXICAL && !temasDistintos;
    porChave.set(chave, {
      camada: "lexical",
      similaridade: sim,
      bloquearia: disparoLexical,
      disparoLexical,
      disparoSemantico: false,
      temasDistintos,
      a: info(Number(r.a_id), String(r.a_entity)),
      b: info(Number(r.b_id), String(r.b_entity)),
    });
  }

  for (const r of semanticos.rows) {
    const chave = `${r.a_id}-${r.b_id}`;
    const cos = Number(Number(r.cos).toFixed(3));
    const temasDistintos = distintosSemantico(
      String(r.a_entity),
      String(r.b_entity),
    );
    const existente = porChave.get(chave);
    const bloqueariaSem = cos > LIMIAR_SEMANTICO && !temasDistintos;
    if (existente) {
      // Par já veio pelo lexical: mantém, mas o gate bloqueia se QUALQUER camada
      // bloquear (OR). Marca a camada semântica como disparo quando for o caso.
      existente.bloquearia = existente.bloquearia || bloqueariaSem;
      existente.disparoSemantico = bloqueariaSem;
    } else {
      porChave.set(chave, {
        camada: "semantica",
        similaridade: cos,
        bloquearia: bloqueariaSem,
        disparoLexical: false,
        disparoSemantico: bloqueariaSem,
        temasDistintos,
        a: info(Number(r.a_id), String(r.a_entity)),
        b: info(Number(r.b_id), String(r.b_entity)),
      });
    }
  }

  const pares = Array.from(porChave.values()).sort(
    (x, y) => y.similaridade - x.similaridade,
  );
  const bloqueariaTotal = pares.filter((p) => p.bloquearia).length;
  return { pares, totalIndexados: Number(total), bloqueariaTotal };
}

// ------------------------------------------------------------------
// Plano de consolidação do PASSIVO (DRY-RUN, READ-ONLY).
//
// Para cada par de posts publicados que o gate atual bloquearia, decide:
//   - tipo "reformulacao": títulos quase idênticos (mesmo post reescrito) ->
//     candidato natural a 301 (despublicar o mais fraco, redirecionar para o
//     mais forte).
//   - tipo "mesma-entidade-intencao-distinta" (grupo B): mesma entidade, mas
//     intenção diferente (sintomas x tem cura x tratamento) -> NÃO despublicar
//     (perde texto útil); sugerir CONSOLIDAR conteúdo ou manter os dois.
//   - tipo "reformulacao-semantica": mesma ideia com outras palavras (disparo
//     semântico) -> revisar; provável 301.
//
// "Mais forte" (para manter): profundidade (readingMinutes) -> mais antigo
// (publishedAt/createdAt, mais tempo indexado) -> tem capa -> tem targetQuery.
//
// NÃO escreve nada. O apply (despublicar + registrar 301) é um passo separado,
// só depois da sua aprovação e da definição do mecanismo de redirect.
// ------------------------------------------------------------------

export type TipoPassivo =
  | "reformulacao"
  | "mesma-entidade-intencao-distinta"
  | "reformulacao-semantica";

interface PostForca {
  postId: number;
  slug: string;
  title: string;
  readingMinutes: number;
  publishedAt: Date | null;
  createdAt: Date;
  temCapa: boolean;
  temTargetQuery: boolean;
}

export interface ParPassivo {
  tipo: TipoPassivo;
  acaoSugerida: "301" | "consolidar-ou-manter" | "revisar";
  simEntidade: number;
  simTitulo: number;
  simSemantica: number | null;
  criterio: string;
  manter: { postId: number; slug: string; title: string };
  // Quem seria despublicado + redirecionado (só nos tipos de 301). Nulo no
  // grupo B (nada é despublicado).
  despublicar: { postId: number; slug: string; title: string } | null;
}

function escolherMaisForte(
  a: PostForca,
  b: PostForca,
): { vencedor: PostForca; perdedor: PostForca; criterio: string } {
  if (a.readingMinutes !== b.readingMinutes) {
    const [v, p] = a.readingMinutes > b.readingMinutes ? [a, b] : [b, a];
    return {
      vencedor: v,
      perdedor: p,
      criterio: `maior profundidade (${v.readingMinutes} vs ${p.readingMinutes} min de leitura)`,
    };
  }
  const da = (a.publishedAt ?? a.createdAt).getTime();
  const db2 = (b.publishedAt ?? b.createdAt).getTime();
  if (da !== db2) {
    const [v, p] = da < db2 ? [a, b] : [b, a];
    return { vencedor: v, perdedor: p, criterio: "mais antigo (mais tempo indexado)" };
  }
  if (a.temCapa !== b.temCapa) {
    const [v, p] = a.temCapa ? [a, b] : [b, a];
    return { vencedor: v, perdedor: p, criterio: "tem imagem de capa" };
  }
  if (a.temTargetQuery !== b.temTargetQuery) {
    const [v, p] = a.temTargetQuery ? [a, b] : [b, a];
    return { vencedor: v, perdedor: p, criterio: "ancorado em busca real (target_query)" };
  }
  const [v, p] = a.postId < b.postId ? [a, b] : [b, a];
  return { vencedor: v, perdedor: p, criterio: "empate; mantido o de id menor (mais antigo)" };
}

// Limiar de "título quase idêntico" = reformulação pura (mesmo post reescrito).
const TITULO_REFORMULACAO = 0.8;

export async function planoConsolidacaoPassivo(): Promise<{
  pares: ParPassivo[];
  resumo: { total: number; reformulacao: number; grupoB: number; semantico: number };
}> {
  // Todos os pares candidatos, com as TRÊS medidas de uma vez.
  const distSemLimite = 1 - REPORT_SEMANTICO;
  const res = await db.execute<{
    a_id: number;
    b_id: number;
    a_ent: string;
    b_ent: string;
    sim_ent: number;
    sim_tit: number;
    cos: number | null;
  }>(
    sql`SELECT a.post_id AS a_id, b.post_id AS b_id,
               a.entity_normalized AS a_ent, b.entity_normalized AS b_ent,
               similarity(a.entity_normalized, b.entity_normalized) AS sim_ent,
               similarity(a.title_normalized, b.title_normalized) AS sim_tit,
               CASE WHEN a.embedding IS NOT NULL AND b.embedding IS NOT NULL
                    THEN 1 - (a.embedding <=> b.embedding) ELSE NULL END AS cos
        FROM blog_post_index a
        JOIN blog_post_index b ON a.post_id < b.post_id
        WHERE a.entity_normalized % b.entity_normalized
           OR (a.embedding IS NOT NULL AND b.embedding IS NOT NULL
               AND (a.embedding <=> b.embedding) <= ${distSemLimite})
        LIMIT 500`,
  );

  // Só os pares que o gate REALMENTE bloquearia.
  const bloqueadores = res.rows.filter((r) => {
    const simEnt = Number(r.sim_ent);
    const cos = r.cos === null ? null : Number(r.cos);
    const bloqLex =
      simEnt > LIMIAR_LEXICAL &&
      !distintosLexical(String(r.a_ent), String(r.b_ent), simEnt);
    const bloqSem =
      cos !== null &&
      cos > LIMIAR_SEMANTICO &&
      !distintosSemantico(String(r.a_ent), String(r.b_ent));
    return bloqLex || bloqSem;
  });

  if (bloqueadores.length === 0) {
    return { pares: [], resumo: { total: 0, reformulacao: 0, grupoB: 0, semantico: 0 } };
  }

  const ids = new Set<number>();
  for (const r of bloqueadores) {
    ids.add(Number(r.a_id));
    ids.add(Number(r.b_id));
  }
  const posts = await db
    .select({
      id: blogPostsTable.id,
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      readingMinutes: blogPostsTable.readingMinutes,
      publishedAt: blogPostsTable.publishedAt,
      createdAt: blogPostsTable.createdAt,
      coverImageUrl: blogPostsTable.coverImageUrl,
      targetQuery: blogPostsTable.targetQuery,
    })
    .from(blogPostsTable)
    .where(inArray(blogPostsTable.id, Array.from(ids)));
  const forcaPorId = new Map<number, PostForca>(
    posts.map((p) => [
      p.id,
      {
        postId: p.id,
        slug: p.slug,
        title: p.title,
        readingMinutes: p.readingMinutes,
        publishedAt: p.publishedAt,
        createdAt: p.createdAt,
        temCapa: !!p.coverImageUrl,
        temTargetQuery: !!p.targetQuery,
      },
    ]),
  );

  const pares: ParPassivo[] = [];
  for (const r of bloqueadores) {
    const a = forcaPorId.get(Number(r.a_id));
    const b = forcaPorId.get(Number(r.b_id));
    if (!a || !b) continue; // algum post não está mais publicado
    const simEnt = Number(Number(r.sim_ent).toFixed(3));
    const simTit = Number(Number(r.sim_tit).toFixed(3));
    const cos = r.cos === null ? null : Number(Number(r.cos).toFixed(3));

    let tipo: TipoPassivo;
    if (simTit >= TITULO_REFORMULACAO) tipo = "reformulacao";
    else if (simEnt >= 0.9) tipo = "mesma-entidade-intencao-distinta";
    else tipo = "reformulacao-semantica";

    const { vencedor, perdedor, criterio } = escolherMaisForte(a, b);
    const acaoSugerida =
      tipo === "mesma-entidade-intencao-distinta"
        ? ("consolidar-ou-manter" as const)
        : tipo === "reformulacao"
          ? ("301" as const)
          : ("revisar" as const);

    pares.push({
      tipo,
      acaoSugerida,
      simEntidade: simEnt,
      simTitulo: simTit,
      simSemantica: cos,
      criterio,
      manter: { postId: vencedor.postId, slug: vencedor.slug, title: vencedor.title },
      despublicar:
        tipo === "mesma-entidade-intencao-distinta"
          ? null
          : { postId: perdedor.postId, slug: perdedor.slug, title: perdedor.title },
    });
  }

  pares.sort((x, y) => y.simTitulo - x.simTitulo);
  const resumo = {
    total: pares.length,
    reformulacao: pares.filter((p) => p.tipo === "reformulacao").length,
    grupoB: pares.filter((p) => p.tipo === "mesma-entidade-intencao-distinta").length,
    semantico: pares.filter((p) => p.tipo === "reformulacao-semantica").length,
  };
  return { pares, resumo };
}
