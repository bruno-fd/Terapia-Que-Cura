import { Router, type IRouter } from "express";
import { requireCronToken } from "../middlewares/requireCronToken";
import { rodarProximaCategoria } from "../lib/daily-generator";
import { minerarPorMacro } from "../lib/mine-runner";
import { enfileirarCandidatos, estatisticasFila } from "../lib/keyword-queue";
import { indexarCorpus } from "../lib/corpus-index";

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
// Mineração de demanda de UMA macrocategoria (Google Autocomplete pt+en ->
// filtros -> fila). É uma operação LONGA (dezenas de segundos a minutos), então
// prefira rodar como um job agendado com timeout alto, não numa requisição de
// usuário. Uma macro por chamada mantém a duração controlada.
//   POST /internal/blog/mine  { "macro": "Ansiedade e Estresse" }
// ---------------------------------------------------------------------------
router.post(
  "/internal/blog/mine",
  requireCronToken,
  async (req, res): Promise<void> => {
    const macro =
      typeof req.body?.macro === "string" ? req.body.macro.trim() : "";
    if (!macro) {
      res.status(400).json({ error: "Informe a macro a minerar." });
      return;
    }
    try {
      const candidatos = await minerarPorMacro(macro);
      const r = await enfileirarCandidatos(candidatos);
      const stats = await estatisticasFila();
      res.json({ macro, minerados: candidatos.length, ...r, fila: stats });
    } catch (err) {
      req.log.error({ err, macro }, "Falha na mineração.");
      res.status(500).json({ error: "Falha ao minerar a macro." });
    }
  },
);

// ---------------------------------------------------------------------------
// (Re)indexa o corpus de posts publicados (anti-canibalização + citação
// cruzada). Rápido; rode após um deploy ou importação de posts.
//   POST /internal/blog/reindex-corpus
// ---------------------------------------------------------------------------
router.post(
  "/internal/blog/reindex-corpus",
  requireCronToken,
  async (req, res): Promise<void> => {
    try {
      const r = await indexarCorpus();
      res.json(r);
    } catch (err) {
      req.log.error({ err }, "Falha ao reindexar o corpus.");
      res.status(500).json({ error: "Falha ao reindexar o corpus." });
    }
  },
);

export default router;
