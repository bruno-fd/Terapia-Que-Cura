import { pool } from "@workspace/db";
import { MACRO_NOMES, subcategoriasDe } from "./lib/categorias";
import { generatePostAncorado, verifyPost } from "./lib/blog-generator";
import { proximasPendentes, perguntasDoCluster } from "./lib/keyword-queue";
import { logger } from "./lib/logger";

// ============================================================
// Preview de post ancorado em busca real (Fase 1 — teste isolado).
//
// Puxa a pergunta pendente mais forte da fila para uma macrocategoria, gera o
// post ancorado nela (H1 responde a busca, irmãs do cluster viram H2/FAQ),
// roda o revisor CFP e IMPRIME tudo na tela. NÃO publica, NÃO grava post, NÃO
// consome a fila (não marca a query como usada). É só para você avaliar a
// qualidade antes de ligar BLOG_USE_KEYWORD_QUEUE=1.
//
// Uso (a partir de artifacts/api-server):
//   pnpm run preview-anchored-post "Ansiedade e Estresse"
// ============================================================

async function main(): Promise<void> {
  const macro = process.argv[2]?.trim();
  if (!macro || !MACRO_NOMES.has(macro)) {
    logger.error(
      { macro, validas: Array.from(MACRO_NOMES) },
      "Passe exatamente uma macrocategoria válida como argumento.",
    );
    return;
  }

  const pendentes = await proximasPendentes(macro, 5);
  if (pendentes.length === 0) {
    console.log(
      `\nA fila de "${macro}" está vazia. Rode antes: pnpm run mine-keywords "${macro}"`,
    );
    return;
  }

  const alvo = pendentes[0];
  const irmas = await perguntasDoCluster(macro, alvo.subcategoria, alvo.id, 5);
  const relacionadas = irmas.map((i) => i.query);

  console.log(`\n===== PREVIEW (nada foi publicado) =====`);
  console.log(`Macrocategoria: ${macro}`);
  console.log(`Subcategoria/cluster: ${alvo.subcategoria ?? "(macro solta)"}`);
  console.log(`Busca-alvo (H1 vai responder): "${alvo.query}" [score ${alvo.score}]`);
  console.log(`Perguntas do cluster (H2/FAQ):`);
  console.log(relacionadas.map((q) => `  - ${q}`).join("\n") || "  (nenhuma)");
  console.log(`\nGerando post... (chamada à IA)\n`);

  const post = await generatePostAncorado(
    macro,
    alvo.query,
    relacionadas,
    subcategoriasDe(macro),
    alvo.subcategoria,
  );

  console.log(`H1: ${post.title}`);
  console.log(`Subtítulo: ${post.subtitle}`);
  console.log(`Subcategoria escolhida: ${post.subcategoria ?? "(nenhuma)"}`);
  console.log(`Keywords: ${post.keywords.join(", ")}`);
  console.log(`\n--- Corpo ---`);
  for (const secao of post.body) {
    if (secao.heading) console.log(`\n## ${secao.heading}`);
    for (const p of secao.paragraphs) console.log(p);
  }
  console.log(`\n--- Encerramento (CFP) ---`);
  console.log(post.crpClosing);

  console.log(`\nRodando o revisor CFP...`);
  const v = await verifyPost(macro, alvo.query, post);
  console.log(`Aprovado pelo revisor: ${v.aprovado ? "SIM" : "NÃO"}`);
  if (!v.aprovado) {
    console.log(`Motivos: ${v.motivos.join(" | ")}`);
    console.log(
      `(No fluxo real, o revisor corrigiria e reverificaria até 2x antes de descartar.)`,
    );
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "Erro no preview de post ancorado.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
