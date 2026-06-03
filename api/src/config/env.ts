import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return ["true", "1", "yes", "sim"].includes(value.toLowerCase());
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const corsOrigin = process.env.CORS_ORIGIN;
const dbPassword = process.env.DB_PASSWORD;

if (isProduction && !corsOrigin) {
  throw new Error("Configure CORS_ORIGIN com o dominio do front na Vercel.");
}

if (isProduction && !dbPassword) {
  throw new Error("Configure DB_PASSWORD para conectar ao PostgreSQL real.");
}

export const env = {
  nodeEnv,
  port: toNumber(process.env.PORT, 3333),
  corsOrigins: (corsOrigin ?? "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: toNumber(process.env.DB_PORT, 5432),
    database: process.env.DB_DATABASE ?? "crm_thiago_adv",
    user: process.env.DB_USER ?? "crm_api_user",
    password: dbPassword ?? "",
    ssl: toBoolean(process.env.DB_SSL, false),
  },
};
