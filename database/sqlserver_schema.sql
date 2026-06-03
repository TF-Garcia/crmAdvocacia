IF DB_ID(N'crm_thiago_adv') IS NULL
BEGIN
    CREATE DATABASE crm_thiago_adv;
END;
GO

USE crm_thiago_adv;
GO

IF OBJECT_ID(N'dbo.movimentacoes', N'U') IS NOT NULL DROP TABLE dbo.movimentacoes;
IF OBJECT_ID(N'dbo.servicos_juridicos', N'U') IS NOT NULL DROP TABLE dbo.servicos_juridicos;
IF OBJECT_ID(N'dbo.clientes', N'U') IS NOT NULL DROP TABLE dbo.clientes;
IF OBJECT_ID(N'dbo.responsaveis', N'U') IS NOT NULL DROP TABLE dbo.responsaveis;
GO

CREATE TABLE dbo.responsaveis (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nome NVARCHAR(160) NOT NULL,
    oab NVARCHAR(30) NULL,
    email NVARCHAR(160) NULL,
    telefone NVARCHAR(30) NULL,
    ativo BIT NOT NULL CONSTRAINT DF_responsaveis_ativo DEFAULT (1),
    criado_em DATETIME2(0) NOT NULL CONSTRAINT DF_responsaveis_criado_em DEFAULT (SYSDATETIME())
);
GO

CREATE TABLE dbo.clientes (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nome NVARCHAR(180) NOT NULL,
    cpf NVARCHAR(20) NOT NULL,
    telefone NVARCHAR(30) NOT NULL,
    email NVARCHAR(160) NOT NULL,
    observacoes NVARCHAR(MAX) NULL,
    criado_em DATETIME2(0) NOT NULL CONSTRAINT DF_clientes_criado_em DEFAULT (SYSDATETIME()),
    atualizado_em DATETIME2(0) NULL,
    CONSTRAINT UQ_clientes_cpf UNIQUE (cpf)
);
GO

CREATE TABLE dbo.servicos_juridicos (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    cliente_id INT NOT NULL,
    responsavel_id INT NULL,
    numero_processo NVARCHAR(80) NOT NULL CONSTRAINT DF_servicos_numero_processo DEFAULT (N''),
    tipo NVARCHAR(40) NOT NULL,
    status NVARCHAR(30) NOT NULL CONSTRAINT DF_servicos_status DEFAULT (N'Conhecimento'),
    honorarios DECIMAL(12,2) NOT NULL CONSTRAINT DF_servicos_honorarios DEFAULT (0),
    arrecadacao_honorarios DECIMAL(12,2) NOT NULL CONSTRAINT DF_servicos_arrecadacao DEFAULT (0),
    data_abertura DATE NOT NULL CONSTRAINT DF_servicos_data_abertura DEFAULT (CONVERT(date, GETDATE())),
    data_audiencia DATE NULL,
    proximo_passo NVARCHAR(500) NOT NULL,
    tarefas_pendentes NVARCHAR(MAX) NULL,
    observacoes NVARCHAR(MAX) NULL,
    criado_em DATETIME2(0) NOT NULL CONSTRAINT DF_servicos_criado_em DEFAULT (SYSDATETIME()),
    atualizado_em DATETIME2(0) NULL,
    CONSTRAINT FK_servicos_clientes FOREIGN KEY (cliente_id) REFERENCES dbo.clientes(id),
    CONSTRAINT FK_servicos_responsaveis FOREIGN KEY (responsavel_id) REFERENCES dbo.responsaveis(id),
    CONSTRAINT CK_servicos_tipo CHECK (tipo IN (N'Consultoria', N'Processo', N'Contrato', N'Audiencia', N'Planejamento')),
    CONSTRAINT CK_servicos_status CHECK (status IN (N'Conhecimento', N'Prazo a cumprir', N'Execucao')),
    CONSTRAINT CK_servicos_honorarios CHECK (honorarios >= 0),
    CONSTRAINT CK_servicos_arrecadacao CHECK (arrecadacao_honorarios >= 0)
);
GO

CREATE TABLE dbo.movimentacoes (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    servico_id INT NOT NULL,
    titulo NVARCHAR(160) NOT NULL,
    descricao NVARCHAR(MAX) NOT NULL,
    data_movimentacao DATETIME2(0) NOT NULL CONSTRAINT DF_movimentacoes_data DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_movimentacoes_servicos FOREIGN KEY (servico_id) REFERENCES dbo.servicos_juridicos(id)
);
GO

CREATE INDEX IX_clientes_nome ON dbo.clientes(nome);
CREATE INDEX IX_servicos_status ON dbo.servicos_juridicos(status);
CREATE INDEX IX_servicos_tipo ON dbo.servicos_juridicos(tipo);
CREATE INDEX IX_servicos_cliente_id ON dbo.servicos_juridicos(cliente_id);
GO

INSERT INTO dbo.responsaveis (nome, oab, email, telefone)
VALUES
    (N'Dra. Helena Martins', N'OAB/SP 000.001', N'helena@exemplo.com', N'(15) 90000-1001'),
    (N'Dr. Thiago Andrade', N'OAB/SP 000.002', N'thiago@exemplo.com', N'(15) 90000-1002');
GO

INSERT INTO dbo.clientes (nome, cpf, telefone, email, observacoes)
VALUES
    (N'Mariana Lopes', N'123.456.789-10', N'(15) 99124-3321', N'mariana.lopes@email.com', N'Cliente enviou documentos por email. Falta comprovante de vinculo rural.'),
    (N'Carlos Eduardo Silva', N'987.654.321-00', N'(11) 99888-1200', N'carlos.silva@email.com', N'Prazo interno para retorno ao cliente em 7 dias.'),
    (N'Renata Alves', N'321.654.987-42', N'(21) 98765-0098', N'renata.alves@email.com', N'Cliente prefere contato por WhatsApp.'),
    (N'Joao Batista Ferreira', N'456.789.123-80', N'(31) 95555-7812', N'joao.ferreira@email.com', N'Audiencia realizada com acordo homologado.');
GO

INSERT INTO dbo.servicos_juridicos (
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
VALUES
    (1, 1, N'', N'Planejamento', N'Conhecimento', 2400.00, 1200.00, '2026-05-09', NULL, N'Revisar CNIS e simular melhor data de aposentadoria', N'Conferir documentos rurais pendentes.', N'Falta comprovante de vinculo rural.'),
    (2, 2, N'0001234-56.2026.8.26.0001', N'Processo', N'Prazo a cumprir', 5600.00, 1800.00, '2026-05-14', NULL, N'Aguardar decisao administrativa do INSS', NULL, N'Retorno ao cliente em 7 dias.'),
    (3, 1, N'', N'Contrato', N'Conhecimento', 1800.00, 900.00, '2026-05-20', NULL, N'Enviar minuta contratual para aprovacao', NULL, N'Prioridade media.'),
    (4, 2, N'0009876-10.2026.8.26.0001', N'Audiencia', N'Execucao', 3200.00, 3200.00, '2026-04-28', '2026-06-12', N'Arquivar comprovantes e enviar recibo final', NULL, N'Acordo homologado.');
GO

INSERT INTO dbo.movimentacoes (servico_id, titulo, descricao)
VALUES
    (1, N'Documentos recebidos', N'Cliente enviou CNIS, RG, CPF e carteira de trabalho digital.'),
    (2, N'Protocolo administrativo', N'Pedido administrativo protocolado e aguardando analise.'),
    (3, N'Minuta em elaboracao', N'Contrato em fase de revisao antes do envio.'),
    (4, N'Acordo homologado', N'Audiencia concluida com acordo homologado.');
GO

CREATE OR ALTER VIEW dbo.vw_painel_servicos AS
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
    s.observacoes
FROM dbo.servicos_juridicos s
INNER JOIN dbo.clientes c ON c.id = s.cliente_id
LEFT JOIN dbo.responsaveis r ON r.id = s.responsavel_id;
GO
