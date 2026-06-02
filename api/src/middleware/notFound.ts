import type { Request, Response } from "express";

export const notFound = (request: Request, response: Response) => {
  return response.status(404).json({
    error: "Rota nao encontrada",
    path: request.originalUrl,
  });
};
