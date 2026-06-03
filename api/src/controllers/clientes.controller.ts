import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { clientesRepository } from "../repositories/clientes.repository";

const serviceTypes = ["Consultoria", "Processo", "Contrato", "Audiencia", "Planejamento"] as const;
const statusTypes = ["Conhecimento", "Prazo a cumprir", "Execucao"] as const;

const idSchema = z.coerce.number().int().positive();

const querySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(statusTypes).optional(),
  tipo: z.enum(serviceTypes).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const clienteSchema = z.object({
  nome: z.string().trim().min(2),
  cpf: z.string().trim().min(5).max(20),
  telefone: z.string().trim().min(8).max(30),
  email: z.string().trim().email(),
  numeroProcesso: z.string().trim().max(80).default(""),
  tipo: z.enum(serviceTypes),
  status: z.enum(statusTypes),
  honorarios: z.coerce.number().min(0),
  arrecadacaoHonorarios: z.coerce.number().min(0).default(0),
  dataAbertura: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataAudiencia: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  responsavelNome: z.string().trim().min(2).max(160),
  proximoPasso: z.string().trim().min(2).max(500),
  tarefasPendentes: z.string().trim().optional().nullable(),
  observacoes: z.string().trim().optional().nullable(),
});

export const listClientes = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const filters = querySchema.parse(request.query);
    const result = await clientesRepository.list(filters);
    return response.json(result);
  } catch (error) {
    next(error);
  }
};

export const getCliente = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(request.params.id);
    const cliente = await clientesRepository.findById(id);

    if (!cliente) return response.status(404).json({ error: "Cliente nao encontrado" });

    return response.json(cliente);
  } catch (error) {
    next(error);
  }
};

export const createCliente = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const payload = clienteSchema.parse(request.body);
    const cliente = await clientesRepository.create(payload);
    return response.status(201).json(cliente);
  } catch (error) {
    next(error);
  }
};

export const updateCliente = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(request.params.id);
    const payload = clienteSchema.parse(request.body);
    const cliente = await clientesRepository.update(id, payload);

    if (!cliente) return response.status(404).json({ error: "Cliente nao encontrado" });

    return response.json(cliente);
  } catch (error) {
    next(error);
  }
};

export const deleteCliente = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(request.params.id);
    const deleted = await clientesRepository.delete(id);

    if (!deleted) return response.status(404).json({ error: "Cliente nao encontrado" });

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
};
