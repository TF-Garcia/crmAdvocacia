import { PoolClient } from "pg";
import { pool, query } from "../config/db";

export type ClientePayload = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  numeroProcesso: string;
  tipo: "Consultoria" | "Processo" | "Contrato" | "Audiencia" | "Planejamento";
  status: "Conhecimento" | "Prazo a cumprir" | "Execucao";
  honorarios: number;
  arrecadacaoHonorarios: number;
  dataAbertura: string;
  dataAudiencia?: string | null;
  responsavelNome: string;
  proximoPasso: string;
  tarefasPendentes?: string | null;
  observacoes?: string | null;
};

export type ClienteFilters = {
  search?: string;
  status?: string;
  tipo?: string;
  page: number;
  limit: number;
};

type ClienteRow = {
  servico_id: number;
  cliente_id: number;
  cliente: string;
  cpf: string;
  telefone: string;
  email: string;
  numero_processo: string | null;
  tipo: ClientePayload["tipo"];
  status: ClientePayload["status"];
  honorarios: string;
  arrecadacao_honorarios: string;
  data_abertura: string;
  data_audiencia: string | null;
  responsavel: string | null;
  proximo_passo: string;
  tarefas_pendentes: string | null;
  observacoes: string | null;
  total?: string;
};

const mapRecord = (record: ClienteRow) => ({
  id: Number(record.servico_id),
  clienteId: Number(record.cliente_id),
  nome: record.cliente,
  cpf: record.cpf,
  telefone: record.telefone,
  email: record.email,
  numeroProcesso: record.numero_processo ?? "",
  tipo: record.tipo,
  status: record.status,
  honorarios: Number(record.honorarios),
  arrecadacaoHonorarios: Number(record.arrecadacao_honorarios),
  dataAbertura: record.data_abertura,
  dataAudiencia: record.data_audiencia,
  responsavelNome: record.responsavel ?? "",
  proximoPasso: record.proximo_passo,
  tarefasPendentes: record.tarefas_pendentes,
  observacoes: record.observacoes,
});

const buildListQuery = (filters: ClienteFilters) => {
  const params: unknown[] = [];
  const clauses = ["1 = 1"];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const position = params.length;
    clauses.push(`(
      c.nome ILIKE $${position} OR
      c.cpf ILIKE $${position} OR
      c.telefone ILIKE $${position} OR
      c.email ILIKE $${position} OR
      s.numero_processo ILIKE $${position} OR
      s.tipo ILIKE $${position} OR
      s.proximo_passo ILIKE $${position} OR
      r.nome ILIKE $${position}
    )`);
  }

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`s.status = $${params.length}`);
  }

  if (filters.tipo) {
    params.push(filters.tipo);
    clauses.push(`s.tipo = $${params.length}`);
  }

  params.push((filters.page - 1) * filters.limit);
  const offsetPosition = params.length;
  params.push(filters.limit);
  const limitPosition = params.length;

  return {
    params,
    text: `
      SELECT
        s.id AS servico_id,
        c.id AS cliente_id,
        c.nome AS cliente,
        c.cpf,
        c.telefone,
        c.email,
        s.numero_processo,
        s.tipo,
        s.status,
        s.honorarios,
        s.arrecadacao_honorarios,
        s.data_abertura,
        s.data_audiencia,
        r.nome AS responsavel,
        s.proximo_passo,
        s.tarefas_pendentes,
        COALESCE(s.observacoes, c.observacoes) AS observacoes,
        COUNT(*) OVER() AS total
      FROM servicos_juridicos s
      INNER JOIN clientes c ON c.id = s.cliente_id
      LEFT JOIN responsaveis r ON r.id = s.responsavel_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY s.id DESC
      OFFSET $${offsetPosition} LIMIT $${limitPosition};
    `,
  };
};

const findResponsavelId = async (client: PoolClient, nome: string) => {
  const found = await client.query<{ id: number }>("SELECT id FROM responsaveis WHERE nome = $1", [nome]);
  if (found.rows[0]) return found.rows[0].id;

  const created = await client.query<{ id: number }>("INSERT INTO responsaveis (nome) VALUES ($1) RETURNING id", [nome]);
  return created.rows[0].id;
};

export const clientesRepository = {
  async list(filters: ClienteFilters) {
    const builtQuery = buildListQuery(filters);
    const result = await query<ClienteRow>(builtQuery.text, builtQuery.params);
    const total = Number(result.rows[0]?.total ?? 0);

    return {
      data: result.rows.map(mapRecord),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  },

  async findById(id: number) {
    const result = await query<ClienteRow>(
      `
        SELECT
          s.id AS servico_id,
          c.id AS cliente_id,
          c.nome AS cliente,
          c.cpf,
          c.telefone,
          c.email,
          s.numero_processo,
          s.tipo,
          s.status,
          s.honorarios,
          s.arrecadacao_honorarios,
          s.data_abertura,
          s.data_audiencia,
          r.nome AS responsavel,
          s.proximo_passo,
          s.tarefas_pendentes,
          COALESCE(s.observacoes, c.observacoes) AS observacoes
        FROM servicos_juridicos s
        INNER JOIN clientes c ON c.id = s.cliente_id
        LEFT JOIN responsaveis r ON r.id = s.responsavel_id
        WHERE s.id = $1;
      `,
      [id],
    );

    return result.rows[0] ? mapRecord(result.rows[0]) : null;
  },

  async create(payload: ClientePayload) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const responsavelId = await findResponsavelId(client, payload.responsavelNome);

      const createdCliente = await client.query<{ id: number }>(
        `
          INSERT INTO clientes (nome, cpf, telefone, email, observacoes)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (cpf) DO UPDATE
          SET nome = EXCLUDED.nome,
              telefone = EXCLUDED.telefone,
              email = EXCLUDED.email,
              observacoes = COALESCE(EXCLUDED.observacoes, clientes.observacoes),
              atualizado_em = CURRENT_TIMESTAMP
          RETURNING id;
        `,
        [payload.nome, payload.cpf, payload.telefone, payload.email, payload.observacoes ?? null],
      );

      const clienteId = createdCliente.rows[0].id;

      const createdServico = await client.query<{ id: number }>(
        `
          INSERT INTO servicos_juridicos (
            cliente_id,
            responsavel_id,
            numero_processo,
            tipo,
            status,
            honorarios,
            arrecadacao_honorarios,
            data_abertura,
            data_audiencia,
            proximo_passo,
            tarefas_pendentes,
            observacoes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id;
        `,
        [
          clienteId,
          responsavelId,
          payload.numeroProcesso,
          payload.tipo,
          payload.status,
          payload.honorarios,
          payload.arrecadacaoHonorarios,
          payload.dataAbertura,
          payload.dataAudiencia ?? null,
          payload.proximoPasso,
          payload.tarefasPendentes ?? null,
          payload.observacoes ?? null,
        ],
      );

      await client.query("COMMIT");

      return this.findById(createdServico.rows[0].id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async update(id: number, payload: ClientePayload) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const current = await client.query<{ cliente_id: number }>("SELECT cliente_id FROM servicos_juridicos WHERE id = $1", [id]);
      const clienteId = current.rows[0]?.cliente_id;

      if (!clienteId) {
        await client.query("ROLLBACK");
        return null;
      }

      const responsavelId = await findResponsavelId(client, payload.responsavelNome);

      await client.query(
        `
          UPDATE clientes
          SET nome = $1,
              cpf = $2,
              telefone = $3,
              email = $4,
              observacoes = $5,
              atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $6;
        `,
        [payload.nome, payload.cpf, payload.telefone, payload.email, payload.observacoes ?? null, clienteId],
      );

      await client.query(
        `
          UPDATE servicos_juridicos
          SET responsavel_id = $1,
              numero_processo = $2,
              tipo = $3,
              status = $4,
              honorarios = $5,
              arrecadacao_honorarios = $6,
              data_abertura = $7,
              data_audiencia = $8,
              proximo_passo = $9,
              tarefas_pendentes = $10,
              observacoes = $11,
              atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $12;
        `,
        [
          responsavelId,
          payload.numeroProcesso,
          payload.tipo,
          payload.status,
          payload.honorarios,
          payload.arrecadacaoHonorarios,
          payload.dataAbertura,
          payload.dataAudiencia ?? null,
          payload.proximoPasso,
          payload.tarefasPendentes ?? null,
          payload.observacoes ?? null,
          id,
        ],
      );

      await client.query("COMMIT");

      return this.findById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async delete(id: number) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const current = await client.query<{ cliente_id: number }>("SELECT cliente_id FROM servicos_juridicos WHERE id = $1", [id]);
      const clienteId = current.rows[0]?.cliente_id;

      if (!clienteId) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query("DELETE FROM movimentacoes WHERE servico_id = $1", [id]);
      await client.query("DELETE FROM servicos_juridicos WHERE id = $1", [id]);

      const remaining = await client.query<{ total: string }>("SELECT COUNT(*) AS total FROM servicos_juridicos WHERE cliente_id = $1", [
        clienteId,
      ]);

      if (Number(remaining.rows[0].total) === 0) {
        await client.query("DELETE FROM clientes WHERE id = $1", [clienteId]);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
