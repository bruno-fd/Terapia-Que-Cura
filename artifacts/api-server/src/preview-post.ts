import { pool } from "@workspace/db";
import { subcategoriasDe } from "./lib/categorias";
import { proximoCluster } from "./lib/keyword-queue";
import { postsRelacionadosParaCitar } from "./lib/corpus-index";
import {
  gerarEsboco,
  expandirPost,
  verifyPost,
  correctPost,
} from "./lib/blog-generator";
import { logger } from "./lib/logger";

// ============================================================
// CLI: gera + revisa um post a partir do próximo cluster da fila e imprime o
// resultado SEM salvar e SEM consumir a fila. Para calibrar tom e rigor antes
// de ligar a geração real.
//   pnpm --filter @workspace/api-server run preview-post "Ansiedade e Estresse"
//   (sem macro: usa o cluster pendente mais forte de toda a fila)
// ============================================================

async function main(): Promise<void> {
  const macro = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const cluster = await proximoCluster(macro);
  if (!cluster) {
    console.log(
      "Fila vazia (nenhum cluster pendente). Rode `mine-keywords` primeiro.",
    );
    return;
  }

  console.log(`\nCLUSTER: ${cluster.macro} / ${cluster.subcategoria ?? "(sem subcategoria)"}`);
  console.log(`BUSCA-ALVO (H1): ${cluster.buscaAlvo}`);
  console.log(`IRMÃS: ${cluster.irmas.join(" | ") || "(nenhuma)"}`);

  const subcats = subcategoriasDe(cluster.macro);
  const esboco = await gerarEsboco(
    cluster.macro,
    cluster.buscaAlvo,
    cluster.perguntasIrmas,
    subcats,
  );
  const relacionados = await postsRelacionadosParaCitar(
    `${esboco.h1}. ${esboco.subtitulo}`,
    3,
  );
  console.log(
    `\nRELACIONADOS PARA CITAR: ${
      relacionados.map((r) => r.slug).join(", ") || "(nenhum)"
    }`,
  );

  let post = await expandirPost(
    cluster.macro,
    cluster.buscaAlvo,
    esboco,
    cluster.perguntasIrmas,
    relacionados.map((r) => ({ title: r.title, slug: r.slug })),
    subcats,
  );

  let verif = await verifyPost(cluster.macro, cluster.buscaAlvo, post);
  let rodadas = 0;
  while (!verif.aprovado && rodadas < 2) {
    rodadas++;
    post = await correctPost(
      cluster.macro,
      cluster.buscaAlvo,
      post,
      verif,
      subcats,
    );
    verif = await verifyPost(cluster.macro, cluster.buscaAlvo, post);
  }

  console.log("\n==================== POST ====================");
  console.log(`TÍTULO: ${post.title}`);
  console.log(`SUBTÍTULO: ${post.subtitle}`);
  console.log(`RESUMO: ${post.excerpt}`);
  console.log(`SUBCATEGORIA: ${post.subcategoria ?? "(null)"}`);
  console.log(`KEYWORDS: ${post.keywords.join(", ")}`);
  console.log("");
  for (const sec of post.body) {
    if (sec.heading) console.log(`## ${sec.heading}`);
    for (const p of sec.paragraphs) console.log(p + "\n");
  }
  console.log(`ENCERRAMENTO: ${post.crpClosing}`);
  console.log(`IMAGE QUERY: ${post.imageQuery}`);
  console.log("\n==================== REVISÃO ====================");
  console.log(`APROVADO: ${verif.aprovado} (após ${rodadas} correção[ões])`);
  if (verif.motivos.length) console.log(`MOTIVOS: ${verif.motivos.join(" | ")}`);
  for (const c of verif.checagensLegais) {
    console.log(`  [${c.correto ? "ok" : "X"}] ${c.citacao} -> ${c.observacao}`);
  }
  console.log("\n(preview: nada foi salvo nem a fila foi consumida.)");
}

main()
  .catch((err) => {
    logger.error({ err }, "Falha no preview.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
