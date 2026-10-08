import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

// Unknown API route -> consistent JSON 404 (instead of HTML).
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized error handler: any thrown/rejected error from a route
// (including AI/model failures) returns a consistent JSON payload rather
// than Express's default HTML 500.
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  req.log?.error({ err }, "Unhandled route error");
  if (res.headersSent) {
    next(err);
    return;
  }
  const raw =
    typeof err === "object" && err !== null
      ? ((err as { status?: number; statusCode?: number }).status ??
        (err as { status?: number; statusCode?: number }).statusCode)
      : undefined;
  const status =
    typeof raw === "number" && raw >= 400 && raw <= 599 ? raw : 500;
  const message =
    status >= 500
      ? "Something went wrong. Please try again."
      : ((err as { message?: string }).message ?? "Request error");
  res.status(status).json({ error: message });
});

export default app;
