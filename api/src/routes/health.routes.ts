import { Router } from "express";
import { query } from "../config/db";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response, next) => {
  try {
    const result = await query<{ ok: number }>("SELECT 1 AS ok");

    return response.json({
      status: "ok",
      database: result.rows[0]?.ok === 1 ? "connected" : "unknown",
    });
  } catch (error) {
    next(error);
  }
});
