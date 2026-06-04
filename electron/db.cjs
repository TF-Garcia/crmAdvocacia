const sql = require("mssql/msnodesqlv8");

const config = {
  driver: process.env.DB_DRIVER || "ODBC Driver 18 for SQL Server",
  server: process.env.DB_SERVER || "localhost\\SQLEXPRESS",
  database: process.env.DB_DATABASE || "crm_thiago_adv",
  trustedConnection: (process.env.DB_TRUSTED_CONNECTION || "true").toLowerCase() !== "false",
  encrypt: (process.env.DB_ENCRYPT || "false").toLowerCase() === "true",
  trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE || "true").toLowerCase() !== "false",
};

const connectionString = [
  `Driver={${config.driver}}`,
  `Server=${config.server}`,
  `Database=${config.database}`,
  config.trustedConnection
    ? "Trusted_Connection=Yes"
    : `UID=${process.env.DB_USER || ""};PWD=${process.env.DB_PASSWORD || ""}`,
  `Encrypt=${config.encrypt ? "Yes" : "No"}`,
  `TrustServerCertificate=${config.trustServerCertificate ? "Yes" : "No"}`,
].join(";");

const pool = new sql.ConnectionPool({ connectionString });

const getPool = () => pool.connect();

const toDateString = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const mapRecord = (record) => ({
  id: Number(record.servico_id),
  clienteId: Number(record.cliente_id),
  nome: record.cliente,
  cpf: record.cpf,
  telefone: record.telefone,
  email: record.email,
  numeroProcesso: record.numero_processo || "",
  tipo: record.tipo,
  status: record.status,
  honorarios: Number(record.honorarios),
  arrecadacaoHonorarios: Number(record.arrecadacao_honorarios),
  dataAbertura: toDateString(record.data_abertura) || "",
  dataAudiencia: toDateString(record.data_audiencia),
  responsavelNome: record.responsavel || "",
  proximoPasso: record.proximo_passo,
  tarefasPendentes: record.tarefas_pendentes,
  observacoes: record.observacoes,
});

const selectColumns = `
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
`;

const fromClause = `
  FROM dbo.servicos_juridicos s
  INNER JOIN dbo.clientes c ON c.id = s.cliente_id
  LEFT JOIN dbo.responsaveis r ON r.id = s.responsavel_id
`;

const bindPayload = (request, payload) => {
  request.input("nome", sql.NVarChar(180), payload.nome);
  request.input("cpf", sql.NVarChar(20), payload.cpf);
  request.input("telefone", sql.NVarChar(30), payload.telefone);
  request.input("email", sql.NVarChar(160), payload.email);
  request.input("observacoes", sql.NVarChar(sql.MAX), payload.observacoes || null);
  request.input("numeroProcesso", sql.NVarChar(80), payload.numeroProcesso || "");
  request.input("tipo", sql.NVarChar(40), payload.tipo);
  request.input("status", sql.NVarChar(30), payload.status);
  request.input("honorarios", sql.Decimal(12, 2), payload.honorarios);
  request.input("arrecadacaoHonorarios", sql.Decimal(12, 2), payload.arrecadacaoHonorarios);
  request.input("dataAbertura", sql.Date, payload.dataAbertura);
  request.input("dataAudiencia", sql.Date, payload.dataAudiencia || null);
  request.input("responsavelNome", sql.NVarChar(160), payload.responsavelNome);
  request.input("proximoPasso", sql.NVarChar(500), payload.proximoPasso);
  request.input("tarefasPendentes", sql.NVarChar(sql.MAX), payload.tarefasPendentes || null);
};

const findResponsavelId = async (request, nome) => {
  request.input("responsavelNomeLookup", sql.NVarChar(160), nome);
  const found = await request.query("SELECT id FROM dbo.responsaveis WHERE nome = @responsavelNomeLookup;");
  if (found.recordset[0]) return found.recordset[0].id;

  const created = await request.query(`
    INSERT INTO dbo.responsaveis (nome)
    OUTPUT INSERTED.id
    VALUES (@responsavelNomeLookup);
  `);
  return created.recordset[0].id;
};

async function listClientes(filters = {}) {
  const connection = await getPool();
  const request = connection.request();
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 10);
  const clauses = ["1 = 1"];

  if (filters.search) {
    request.input("search", sql.NVarChar(220), `%${filters.search}%`);
    clauses.push(`(
      c.nome COLLATE Latin1_General_CI_AI LIKE @search OR
      c.cpf COLLATE Latin1_General_CI_AI LIKE @search OR
      c.telefone COLLATE Latin1_General_CI_AI LIKE @search OR
      c.email COLLATE Latin1_General_CI_AI LIKE @search OR
      s.numero_processo COLLATE Latin1_General_CI_AI LIKE @search OR
      s.tipo COLLATE Latin1_General_CI_AI LIKE @search OR
      s.proximo_passo COLLATE Latin1_General_CI_AI LIKE @search OR
      r.nome COLLATE Latin1_General_CI_AI LIKE @search
    )`);
  }

  if (filters.status && filters.status !== "Todos") {
    request.input("status", sql.NVarChar(30), filters.status);
    clauses.push("s.status = @status");
  }

  if (filters.tipo && filters.tipo !== "Todos") {
    request.input("tipo", sql.NVarChar(40), filters.tipo);
    clauses.push("s.tipo = @tipo");
  }

  request.input("offset", sql.Int, (page - 1) * limit);
  request.input("limit", sql.Int, limit);

  const result = await request.query(`
    SELECT
      ${selectColumns},
      COUNT(*) OVER() AS total
    ${fromClause}
    WHERE ${clauses.join(" AND ")}
    ORDER BY s.id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
  `);
  const total = Number(result.recordset[0]?.total || 0);

  return {
    data: result.recordset.map(mapRecord),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function findCliente(id) {
  const connection = await getPool();
  const result = await connection
    .request()
    .input("id", sql.Int, id)
    .query(`
      SELECT ${selectColumns}
      ${fromClause}
      WHERE s.id = @id;
    `);

  return result.recordset[0] ? mapRecord(result.recordset[0]) : null;
}

async function createCliente(payload) {
  const connection = await getPool();
  const transaction = new sql.Transaction(connection);
  await transaction.begin();

  try {
    const request = new sql.Request(transaction);
    bindPayload(request, payload);
    const responsavelId = await findResponsavelId(request, payload.responsavelNome);
    request.input("responsavelId", sql.Int, responsavelId);

    const clienteResult = await request.query(`
      DECLARE @clienteId INT;
      SELECT @clienteId = id FROM dbo.clientes WHERE cpf = @cpf;

      IF @clienteId IS NULL
      BEGIN
        INSERT INTO dbo.clientes (nome, cpf, telefone, email, observacoes)
        OUTPUT INSERTED.id
        VALUES (@nome, @cpf, @telefone, @email, @observacoes);
      END
      ELSE
      BEGIN
        UPDATE dbo.clientes
        SET nome = @nome,
            telefone = @telefone,
            email = @email,
            observacoes = COALESCE(@observacoes, observacoes),
            atualizado_em = SYSDATETIME()
        OUTPUT INSERTED.id
        WHERE id = @clienteId;
      END;
    `);

    request.input("clienteId", sql.Int, clienteResult.recordset[0].id);
    const servicoResult = await request.query(`
      INSERT INTO dbo.servicos_juridicos (
        cliente_id, responsavel_id, numero_processo, tipo, status, honorarios,
        arrecadacao_honorarios, data_abertura, data_audiencia, proximo_passo,
        tarefas_pendentes, observacoes
      )
      OUTPUT INSERTED.id
      VALUES (
        @clienteId, @responsavelId, @numeroProcesso, @tipo, @status, @honorarios,
        @arrecadacaoHonorarios, @dataAbertura, @dataAudiencia, @proximoPasso,
        @tarefasPendentes, @observacoes
      );
    `);

    await transaction.commit();
    return findCliente(servicoResult.recordset[0].id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function updateCliente(id, payload) {
  const connection = await getPool();
  const transaction = new sql.Transaction(connection);
  await transaction.begin();

  try {
    const request = new sql.Request(transaction);
    request.input("id", sql.Int, id);
    bindPayload(request, payload);

    const current = await request.query("SELECT cliente_id FROM dbo.servicos_juridicos WHERE id = @id;");
    const clienteId = current.recordset[0]?.cliente_id;
    if (!clienteId) {
      await transaction.rollback();
      return null;
    }

    const responsavelId = await findResponsavelId(request, payload.responsavelNome);
    request.input("clienteId", sql.Int, clienteId);
    request.input("responsavelId", sql.Int, responsavelId);

    await request.query(`
      UPDATE dbo.clientes
      SET nome = @nome,
          cpf = @cpf,
          telefone = @telefone,
          email = @email,
          observacoes = @observacoes,
          atualizado_em = SYSDATETIME()
      WHERE id = @clienteId;

      UPDATE dbo.servicos_juridicos
      SET responsavel_id = @responsavelId,
          numero_processo = @numeroProcesso,
          tipo = @tipo,
          status = @status,
          honorarios = @honorarios,
          arrecadacao_honorarios = @arrecadacaoHonorarios,
          data_abertura = @dataAbertura,
          data_audiencia = @dataAudiencia,
          proximo_passo = @proximoPasso,
          tarefas_pendentes = @tarefasPendentes,
          observacoes = @observacoes,
          atualizado_em = SYSDATETIME()
      WHERE id = @id;
    `);

    await transaction.commit();
    return findCliente(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function deleteCliente(id) {
  const connection = await getPool();
  const transaction = new sql.Transaction(connection);
  await transaction.begin();

  try {
    const request = new sql.Request(transaction);
    request.input("id", sql.Int, id);
    const current = await request.query("SELECT cliente_id FROM dbo.servicos_juridicos WHERE id = @id;");
    const clienteId = current.recordset[0]?.cliente_id;
    if (!clienteId) {
      await transaction.rollback();
      return false;
    }

    request.input("clienteId", sql.Int, clienteId);
    await request.query(`
      DELETE FROM dbo.movimentacoes WHERE servico_id = @id;
      DELETE FROM dbo.servicos_juridicos WHERE id = @id;

      IF NOT EXISTS (SELECT 1 FROM dbo.servicos_juridicos WHERE cliente_id = @clienteId)
      BEGIN
        DELETE FROM dbo.clientes WHERE id = @clienteId;
      END;
    `);

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  listClientes,
  findCliente,
  createCliente,
  updateCliente,
  deleteCliente,
};
