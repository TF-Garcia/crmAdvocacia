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

  return response.status(500).json({
    error: "Erro interno do servidor",
  });
};
