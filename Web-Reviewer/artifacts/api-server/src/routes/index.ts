import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ccnRouter from "./ccn";
import clanRouter from "./clan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ccnRouter);
router.use(clanRouter);

router.get("/mi-ip", async (_req, res) => { const r = await fetch("https://api.ipify.org?format=json"); const data = await r.json(); res.json(data); });

export default router;
