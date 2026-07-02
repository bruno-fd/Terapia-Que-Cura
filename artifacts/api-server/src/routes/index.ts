import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import blogRouter from "./blog";
import adminLawyersRouter from "./admin-lawyers";
import subscriptionRouter from "./subscription";
import lawyerRouter from "./lawyer";
import cadastroRouter from "./cadastro";
import oabRouter from "./oab";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(blogRouter);
router.use(adminLawyersRouter);
router.use(subscriptionRouter);
router.use(lawyerRouter);
router.use(cadastroRouter);
router.use(oabRouter);

export default router;
