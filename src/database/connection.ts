import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Configurar pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // Máximo de conexões simultâneas
  idleTimeoutMillis: 30000, // Tempo limite para conexões inativas
  connectionTimeoutMillis: 2000 // Tempo limite para estabelecer conexão
});

// Criar instância do Drizzle com o pool e schema
export const db = drizzle(pool, { schema });

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    console.log("✅ Conexão com banco estabelecida:", result.rows[0]);
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com banco:", error);
    return false;
  }
};

// Função para fechar conexões (útil para testes)
export const closeConnection = async (): Promise<void> => {
  await pool.end();
};
