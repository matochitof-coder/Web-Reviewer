import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ccnRouter from "./ccn";
import clanRouter from "./clan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ccnRouter);
router.use(clanRouter);

export default router;
