import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blogRouter from "./blog";
import subscriptionRouter from "./subscription";

const router: IRouter = Router();

router.use(healthRouter);
router.use(blogRouter);
router.use(subscriptionRouter);

export default router;
