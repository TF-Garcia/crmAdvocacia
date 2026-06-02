import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { clientesRouter } from "./routes/clientes.routes";
import { healthRouter } from "./routes/health.routes";

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origem nao permitida pelo CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.use("/health", healthRouter);
app.use("/api/clientes", clientesRouter);

app.use(notFound);
app.use(errorHandler);
