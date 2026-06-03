# CRM Advocacia

Sistema simples de gerenciamento de clientes e servicos para advogados.

O projeto usa React, Vite, Tailwind e os estilos herdados do modelo de advocacia.

O front consome uma API separada em `api/`, e a API persiste os dados em PostgreSQL usando os scripts em `database/postgres_schema.sql` e `database/postgres_app_user.sql`.

## Producao

Arquitetura esperada:

- Front-end: Vercel
- API: VPS
- Banco: PostgreSQL na VPS

No front da Vercel, configure a variavel:

```env
VITE_API_URL=https://api.seu-dominio.com.br
```

Na API da VPS, configure `api/.env`:

```env
PORT=3333
NODE_ENV=production
CORS_ORIGIN=https://seu-front.vercel.app,https://www.seu-dominio.com.br

DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=crm_thiago_adv
DB_USER=crm_api_user
DB_PASSWORD=sua-senha-forte
DB_SSL=false
```

A API usa apenas o PostgreSQL real. Se o banco estiver indisponivel, as rotas retornam erro em vez de usar dados simulados.
