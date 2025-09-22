import main from "./index-db";

main().catch((error) => {
  console.error("❌ Erro na execução do script de banco:", error);
  process.exit(1);
});

