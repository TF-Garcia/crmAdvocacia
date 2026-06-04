# CRM Advocacia

Sistema local de gerenciamento de clientes e servicos para advocacia.

O projeto agora roda como aplicacao desktop local com Electron. A tela e feita em React/Vite, e o processo local do Electron acessa diretamente o SQL Server, sem API HTTP.

## Requisitos locais

- Node.js instalado.
- SQL Server Express rodando na instancia `.\SQLEXPRESS`.
- `sqlcmd` disponivel no PATH.
- ODBC Driver 18 for SQL Server instalado.

## Banco local

Para criar ou recriar o banco `crm_thiago_adv` com dados iniciais:

```bash
npm run db:setup
```

O script usa autenticação Windows integrada e executa `database/sqlserver_schema.sql` na instancia `.\SQLEXPRESS`.

## Rodar o sistema

Para gerar o front e abrir o app desktop:

```bash
npm run local
```

Para desenvolvimento da interface:

```bash
npm run dev
```

E, em outro terminal:

```bash
npm run desktop
```

## Arquitetura local

- `src/`: interface React.
- `electron/main.cjs`: janela desktop.
- `electron/preload.cjs`: ponte segura entre tela e processo local.
- `electron/db.cjs`: acesso direto ao SQL Server.
- `database/sqlserver_schema.sql`: criacao do banco e dados iniciais.

## Proxima etapa

A base ja esta no caminho certo para o instalador: empacotar o Electron, validar requisitos do SQL Server/ODBC e executar o setup do banco durante a instalacao.
