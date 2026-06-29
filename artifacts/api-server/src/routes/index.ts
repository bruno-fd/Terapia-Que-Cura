import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blogRouter from "./blog";
import subscriptionRouter from "./subscription";
import lawyerRouter from "./lawyer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(blogRouter);
router.use(subscriptionRouter);
router.use(lawyerRouter);

export default router;
