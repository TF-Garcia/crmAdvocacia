\connect crm_thiago_adv

ALTER TABLE servicos_juridicos
    ADD COLUMN IF NOT EXISTS numero_processo VARCHAR(80) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS arrecadacao_honorarios NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS data_audiencia DATE,
    ADD COLUMN IF NOT EXISTS tarefas_pendentes TEXT;

ALTER TABLE servicos_juridicos
    DROP CONSTRAINT IF EXISTS ck_servicos_status,
    DROP CONSTRAINT IF EXISTS ck_servicos_arrecadacao;

UPDATE servicos_juridicos
SET status = CASE status
    WHEN 'Ativo' THEN 'Conhecimento'
    WHEN 'Aguardando' THEN 'Prazo a cumprir'
    WHEN 'Concluido' THEN 'Execucao'
    ELSE status
END;

ALTER TABLE servicos_juridicos
    ALTER COLUMN status SET DEFAULT 'Conhecimento',
    ADD CONSTRAINT ck_servicos_status CHECK (status IN ('Conhecimento', 'Prazo a cumprir', 'Execucao')),
    ADD CONSTRAINT ck_servicos_arrecadacao CHECK (arrecadacao_honorarios >= 0);

CREATE OR REPLACE VIEW vw_painel_servicos AS
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
FROM servicos_juridicos s
INNER JOIN clientes c ON c.id = s.cliente_id
LEFT JOIN responsaveis r ON r.id = s.responsavel_id;
