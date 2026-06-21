import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ccnRouter from "./ccn";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ccnRouter);

export default router;
