import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production, serve the built frontend (CCN Tracker) static files.
// The frontend is built to artifacts/ccn-tracker/dist/public relative to repo root.
if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(process.cwd(), "artifacts/ccn-tracker/dist/public");
  if (existsSync(staticDir)) {
    logger.info({ staticDir }, "Serving static frontend");
    app.use(express.static(staticDir));
    // SPA fallback — send index.html for any non-API route
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  } else {
    logger.warn({ staticDir }, "Static frontend directory not found — skipping static serving");
  }
}

export default app;
