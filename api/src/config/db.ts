import { Pool, QueryResultRow } from "pg";
import { env } from "./env";

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
});

export const query = <Row extends QueryResultRow>(text: string, params?: unknown[]) => pool.query<Row>(text, params);
