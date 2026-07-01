import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blogRouter from "./blog";
import subscriptionRouter from "./subscription";
import lawyerRouter from "./lawyer";
import cadastroRouter from "./cadastro";
import oabRouter from "./oab";

const router: IRouter = Router();

router.use(healthRouter);
router.use(blogRouter);
router.use(subscriptionRouter);
router.use(lawyerRouter);
router.use(cadastroRouter);
router.use(oabRouter);

export default router;
