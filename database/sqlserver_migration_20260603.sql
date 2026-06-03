USE crm_thiago_adv;
GO

IF COL_LENGTH('dbo.servicos_juridicos', 'numero_processo') IS NULL
    ALTER TABLE dbo.servicos_juridicos ADD numero_processo NVARCHAR(80) NOT NULL CONSTRAINT DF_servicos_numero_processo DEFAULT (N'');
GO

IF COL_LENGTH('dbo.servicos_juridicos', 'arrecadacao_honorarios') IS NULL
    ALTER TABLE dbo.servicos_juridicos ADD arrecadacao_honorarios DECIMAL(12,2) NOT NULL CONSTRAINT DF_servicos_arrecadacao DEFAULT (0);
GO

IF COL_LENGTH('dbo.servicos_juridicos', 'data_audiencia') IS NULL
    ALTER TABLE dbo.servicos_juridicos ADD data_audiencia DATE NULL;
GO

IF COL_LENGTH('dbo.servicos_juridicos', 'tarefas_pendentes') IS NULL
    ALTER TABLE dbo.servicos_juridicos ADD tarefas_pendentes NVARCHAR(MAX) NULL;
GO

IF OBJECT_ID(N'dbo.CK_servicos_status', N'C') IS NOT NULL
    ALTER TABLE dbo.servicos_juridicos DROP CONSTRAINT CK_servicos_status;
GO

UPDATE dbo.servicos_juridicos
SET status = CASE status
    WHEN N'Ativo' THEN N'Conhecimento'
    WHEN N'Aguardando' THEN N'Prazo a cumprir'
    WHEN N'Concluido' THEN N'Execucao'
    ELSE status
END;
GO

ALTER TABLE dbo.servicos_juridicos
ADD CONSTRAINT CK_servicos_status CHECK (status IN (N'Conhecimento', N'Prazo a cumprir', N'Execucao'));
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
