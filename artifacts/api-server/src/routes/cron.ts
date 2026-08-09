import { Router, type IRouter } from "express";
import { requireCronToken } from "../middlewares/requireCronToken";
import { rodarProximaCategoria } from "../lib/daily-generator";
import { rodarProximaMineracao } from "../lib/keyword-mine-runner";
import { migrarSchemaBlog } from "../lib/blog-schema-migrate";
import { indexarCorpus, relatorioCanibalizacao } from "../lib/corpus-index";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Disparo interno do gerador diário (Opção 3: app no Autoscale + "despertador"
// agendado num projeto separado).
//
// Gera UM post pendente do dia e responde quantas categorias ainda faltam
// ({ processed, status, remaining }). Feito para ser chamado repetidamente pelo
// despertador até remaining chegar a 0. Cada chamada é curta (~1 categoria), o
// que combina com o Autoscale (que não serve para requisições longas).
//
// Idempotente e barato quando não há trabalho: depois que todas as categorias
// já rodaram hoje, retorna remaining=0 sem chamar a IA. Isso limita o custo a,
// no máximo, um lote por dia, mesmo que o endpoint seja chamado à toa.
//
// Protegido por token (Authorization: Bearer <BLOG_CRON_TOKEN>).
// ---------------------------------------------------------------------------
router.post(
  "/internal/blog/generate-next",
  requireCronToken,
  async (req, res): Promise<void> => {
    try {
      const resultado = await rodarProximaCategoria();
      res.json(resultado);
    } catch (err) {
      req.log.error({ err }, "Falha no disparo do gerador diário.");
      res
        .status(500)
        .json({ error: "Falha ao processar a próxima categoria." });
    }
  },
);

// ---------------------------------------------------------------------------
// Mineração de palavras-chave direto no banco de produção (bootstrap e refresh
// da fila). O app minera de dentro de si mesmo, contornando a limitação de
// "banco de produção só-leitura" das ferramentas externas.
//
// Minera UMA macrocategoria por chamada e responde quantas ainda faltam, para
// ser chamado repetidamente até remaining=0 (mesmo padrão do generate-next).
//
//   POST /api/internal/blog/mine-next          -> próxima macro sem fila
//   POST /api/internal/blog/mine-next?category=Ansiedade e Estresse
//                                              -> força/atualiza essa macro
//
// Protegido pelo mesmo BLOG_CRON_TOKEN. Reutiliza o minerador e o filtro de
// curadoria, então a fila já entra limpa.
// ---------------------------------------------------------------------------
router.post(
  "/internal/blog/mine-next",
  requireCronToken,
  async (req, res): Promise<void> => {
    try {
      const raw = req.query.category;
      const category = typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
      const resultado = await rodarProximaMineracao(category);
      res.json(resultado);
    } catch (err) {
      req.log.error({ err }, "Falha na mineração de palavras-chave.");
      res.status(500).json({ error: "Falha ao minerar palavras-chave." });
    }
  },
);

// ---------------------------------------------------------------------------
// Migração idempotente do schema de anti-canibalização (extensões pgvector +
// pg_trgm, tabela blog_post_index e índices). Roda de dentro da produção porque
// o banco é só-leitura para as ferramentas externas e o drizzle-kit push não
// roda aqui (sem TTY). Seguro repetir.
//   POST /api/internal/blog/migrate
// ---------------------------------------------------------------------------
router.post(
  "/internal/blog/migrate",
  requireCronToken,
  async (req, res): Promise<void> => {
    try {
      const resultado = await migrarSchemaBlog();
      res.json(resultado);
    } catch (err) {
      req.log.error({ err }, "Falha na migração do schema do blog.");
      res.status(500).json({ error: "Falha ao migrar o schema do blog." });
    }
  },
);

// ---------------------------------------------------------------------------
// (Re)indexa o corpus de posts publicados em blog_post_index (Passo 0 da
// anti-canibalização + citação cruzada). Rode após o migrate e após importar
// posts. Idempotente.
//   POST /api/internal/blog/reindex-corpus
// ---------------------------------------------------------------------------
router.post(
  "/internal/blog/reindex-corpus",
  requireCronToken,
  async (req, res): Promise<void> => {
    try {
      const resultado = await indexarCorpus();
      res.json(resultado);
    } catch (err) {
      req.log.error({ err }, "Falha ao reindexar o corpus.");
      res.status(500).json({ error: "Falha ao reindexar o corpus." });
    }
  },
);

// ---------------------------------------------------------------------------
// Diagnóstico READ-ONLY do passivo: lista pares de posts publicados que se
// canibalizam (lexical pg_trgm + semântico pgvector). Não altera nada; serve
// para você decidir o que fazer com cada par. Requer o corpus indexado.
//   GET /api/internal/blog/canibalizacao-report
// ---------------------------------------------------------------------------
router.get(
  "/internal/blog/canibalizacao-report",
  requireCronToken,
  async (req, res): Promise<void> => {
    try {
      const resultado = await relatorioCanibalizacao();
      res.json(resultado);
    } catch (err) {
      req.log.error({ err }, "Falha ao gerar o relatório de canibalização.");
      res.status(500).json({ error: "Falha ao gerar o relatório." });
    }
  },
);

export default router;
