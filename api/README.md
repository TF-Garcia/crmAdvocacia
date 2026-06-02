# CRM Advocacia API

API REST separada do front-end para manipular o banco PostgreSQL `crm_thiago_adv`.

## Rodar localmente

```bash
npm install
npm run dev
```

Por padrao a API sobe em `http://localhost:3333` e usa o arquivo `.env`.

## Variaveis principais

```env
PORT=3333
CORS_ORIGIN=https://dominio-do-front.com.br

DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=crm_thiago_adv
DB_USER=crm_api_user
DB_PASSWORD=sua-senha-forte
DB_SSL=false
```

Na VPS, se o Postgres e a API estiverem na mesma maquina, mantenha `DB_HOST=localhost`.

## Endpoints

- `GET /health`: status da API e conexao com o banco
- `GET /api/clientes`: lista clientes/servicos com filtros
- `GET /api/clientes/:id`: detalhes de um servico/cliente
- `POST /api/clientes`: cadastra cliente e servico juridico
- `PUT /api/clientes/:id`: atualiza cliente e servico juridico
- `DELETE /api/clientes/:id`: remove servico e cliente sem outros servicos

Filtros de listagem:

```text
GET /api/clientes?search=mariana&status=Ativo&tipo=Planejamento&page=1&limit=10
```

## Payload de cadastro/edicao

```json
{
  "nome": "Nome do Cliente",
  "cpf": "123.456.789-10",
  "telefone": "(15) 99999-9999",
  "email": "cliente@email.com",
  "tipo": "Consultoria",
  "status": "Ativo",
  "honorarios": 1500,
  "dataAbertura": "2026-06-02",
  "responsavelNome": "Dr. Thiago Andrade",
  "proximoPasso": "Conferir documentos iniciais",
  "observacoes": "Observacoes internas do atendimento."
}
```

## Build para VPS

```bash
npm run build
npm start
```

Na VPS, deixe o PostgreSQL e esta API na mesma maquina. O front-end pode ficar em outro dominio, desde que esse dominio esteja em `CORS_ORIGIN`.
