import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./connection";
import { broadcast } from "../logging";

async function runMigrations() {
  try {
    broadcast("🚀 Iniciando migrações do banco de dados...", "neutral");

    await migrate(db, {
      migrationsFolder: "./drizzle"
    });

    broadcast("✅ Migrações executadas com sucesso!", "success");
  } catch (error) {
    broadcast(`❌ Erro ao executar migrações: ${error}`, "fail");
    throw error;
  }
}

runMigrations().catch((error) => {
  console.error("Erro na migração:", error);
  process.exit(1);
});

