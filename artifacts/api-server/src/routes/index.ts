import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import blogRouter from "./blog";
import adminPsicologosRouter from "./admin-psicologos";
import subscriptionRouter from "./subscription";
import psychologistRouter from "./psychologist";
import cadastroRouter from "./cadastro";
import oabRouter from "./oab";
import cronRouter from "./cron";
import sitemapRouter from "./sitemap";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(blogRouter);
router.use(adminPsicologosRouter);
router.use(subscriptionRouter);
router.use(psychologistRouter);
router.use(cadastroRouter);
router.use(oabRouter);
router.use(cronRouter);
router.use(sitemapRouter);

export default router;
