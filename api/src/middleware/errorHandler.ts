import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return response.status(400).json({
      error: "Dados invalidos",
      details: error.issues,
    });
  }

  if (error instanceof Error && error.message === "Origem nao permitida pelo CORS") {
    return response.status(403).json({ error: error.message });
  }

  console.error(error);

  const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
  if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "3D000", "42P01", "42703"].includes(code ?? "")) {
    return response.status(503).json({
      error: "Banco de dados indisponivel",
    });
  }

  return response.status(500).json({
    error: "Erro interno do servidor",
  });
};
