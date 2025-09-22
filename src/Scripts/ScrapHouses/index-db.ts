import { HouseList, ServerList } from "Helpers";
import { HttpClient } from "services";
import { broadcast, coloredText, Timer, TrackETA } from "../../logging";
import { retryWrapper, batchPromises } from "utils";
import {
  HouseObject,
  PartialServerObject,
  TIBIA_CITIES,
  TibiaTown
} from "types";
import {
  startScrapingRun,
  finishScrapingRun,
  processServerHouses
} from "../../database/data-operations";
import { testConnection } from "../../database/connection";

const SCRIPT_NAME = coloredText("ScrapHouses-DB", "highlight");

const fetchHousesPageForCity = retryWrapper(
  async (
    serverName: string,
    city: TibiaTown,
    type: "houses" | "guildhalls" | "all" = "all"
  ) => {
    return HttpClient.getHousesPage({ world: serverName, town: city, type });
  }
);

const fetchAllHousesForServer = async (
  serverName: string
): Promise<HouseObject[]> => {
  broadcast(
    `🏘️ Coletando casas de todas as cidades em ${serverName}...`,
    "neutral"
  );

  const allHouses: HouseObject[] = [];
  const helper = new HouseList();

  // Buscar casas e guildhalls de cada cidade
  for (const city of TIBIA_CITIES) {
    try {
      // Buscar casas regulares
      const housesHtml = await fetchHousesPageForCity(
        serverName,
        city,
        "houses"
      );
      const cityHouses = helper.houses(
        housesHtml,
        serverName,
        generateServerId(serverName),
        false // não é busca específica de guildhalls
      );

      // Pequeno delay entre as requisições de casas e guildhalls
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Buscar guildhalls
      const guildhallsHtml = await fetchHousesPageForCity(
        serverName,
        city,
        "guildhalls"
      );
      const cityGuildhalls = helper.houses(
        guildhallsHtml,
        serverName,
        generateServerId(serverName),
        true // é busca específica de guildhalls
      );

      const totalFound = cityHouses.length + cityGuildhalls.length;

      if (totalFound > 0) {
        allHouses.push(...cityHouses, ...cityGuildhalls);
        broadcast(
          `  📍 ${city}: ${cityHouses.length} casas + ${cityGuildhalls.length} guildhalls = ${totalFound} total`,
          "neutral"
        );
      }

      // Pequeno delay entre cidades para não sobrecarregar o servidor
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      broadcast(`  ❌ Erro em ${city}: ${error}`, "fail");
    }
  }

  return allHouses;
};

const fetchServersPage = retryWrapper(async () => {
  return HttpClient.getServersPage();
});

// Função para gerar ID baseado no nome do servidor
const generateServerId = (serverName: string): number => {
  let hash = 0;
  for (let i = 0; i < serverName.length; i++) {
    const char = serverName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Função para processar e salvar dados de um servidor no banco
const processAndSaveServerData = async (
  serverData: PartialServerObject & { serverId: number },
  houses: HouseObject[]
): Promise<{ housesCount: number; guildhallsCount: number }> => {
  try {
    const result = await processServerHouses(serverData, houses);

    broadcast(
      `💾 Dados salvos no banco: ${result.housesCount} casas + ${result.guildhallsCount} guildhalls`,
      "success"
    );

    return result;
  } catch (error) {
    broadcast(`❌ Erro ao salvar no banco: ${error}`, "fail");
    throw error;
  }
};

const main = async (): Promise<void> => {
  const timer = new Timer();
  broadcast(`Iniciando ${SCRIPT_NAME} script`, "success");

  // Testar conexão com o banco antes de começar
  broadcast("🔌 Testando conexão com banco de dados...", "neutral");
  const isConnected = await testConnection();
  if (!isConnected) {
    broadcast("❌ Falha na conexão com banco de dados. Abortando.", "fail");
    return;
  }

  let scrapingRunId: number | null = null;
  let totalHouses = 0;
  let totalGuildhalls = 0;
  let totalServers = 0;

  try {
    // Iniciar controle de execução
    scrapingRunId = await startScrapingRun();
    broadcast(`📊 Execução iniciada (ID: ${scrapingRunId})`, "neutral");

    // Buscar lista de servidores diretamente
    broadcast("🌐 Buscando lista de servidores...", "neutral");
    const serversHtml = await fetchServersPage();
    const serverListHelper = new ServerList();
    const partialServers = serverListHelper.servers(serversHtml);

    if (partialServers.length === 0) {
      broadcast("❌ Nenhum servidor encontrado na página do Tibia", "fail");
      return;
    }

    // Converter PartialServerObject para formato com IDs
    const servers = partialServers.map((server) => ({
      serverId: generateServerId(server.serverName),
      ...server
    }));

    totalServers = servers.length;
    broadcast(`✅ ${servers.length} servidores encontrados`, "neutral");

    broadcast("🏠 Iniciando coleta de dados por servidor", "neutral");

    // Configurar tracking de progresso
    const taskTracking = new TrackETA(
      servers.length,
      coloredText("Coletando houses por servidor", "highlight")
    );

    // Criar tasks para cada servidor
    const serverTasks = servers.map((server) => async () => {
      taskTracking.incTask();
      broadcast(
        `🏗️ Processando: ${coloredText(
          server.serverName,
          "highlight"
        )} ${taskTracking.getProgress()}`,
        "neutral"
      );

      try {
        const houses = await fetchAllHousesForServer(server.serverName);

        if (houses.length > 0) {
          // Processar e salvar no banco
          const result = await processAndSaveServerData(server, houses);

          // Calcular estatísticas detalhadas
          const rented = houses.filter((h) => h.status === "rented").length;
          const auctioned = houses.filter(
            (h) => h.status === "auctioned"
          ).length;
          const available = houses.filter(
            (h) => h.status === "available"
          ).length;

          broadcast(
            `✅ ${server.serverName}: ${houses.length} propriedades (${rented} alugadas, ${auctioned} leilão, ${available} disponíveis) → ${result.housesCount} casas + ${result.guildhallsCount} guildhalls no banco`,
            "success"
          );

          return {
            houses: result.housesCount,
            guildhalls: result.guildhallsCount
          };
        } else {
          broadcast(
            `⚠️ Nenhuma propriedade encontrada em ${server.serverName}`,
            "neutral"
          );
          return { houses: 0, guildhalls: 0 };
        }
      } catch (error) {
        broadcast(
          `❌ Erro ao processar ${server.serverName}: ${error}`,
          "fail"
        );
        return { houses: 0, guildhalls: 0 };
      }
    });

    // Executar coleta em batches
    const results = await batchPromises(serverTasks);

    // Somar totais
    totalHouses = results.reduce((sum, result) => sum + result.houses, 0);
    totalGuildhalls = results.reduce(
      (sum, result) => sum + result.guildhalls,
      0
    );

    taskTracking.finish();

    // Informar resultados finais
    const successfulServers = results.filter(
      (r) => r.houses > 0 || r.guildhalls > 0
    ).length;

    broadcast(`🎉 Coleta concluída com sucesso!`, "success");

    broadcast(`📊 Estatísticas finais:`, "neutral");
    broadcast(`   • ${totalServers} servidores processados`, "neutral");
    broadcast(`   • ${successfulServers} servidores com dados`, "neutral");
    broadcast(`   • ${totalHouses} casas salvas no banco`, "neutral");
    broadcast(`   • ${totalGuildhalls} guildhalls salvas no banco`, "neutral");
    broadcast(
      `   • ${totalHouses + totalGuildhalls} propriedades totais`,
      "neutral"
    );

    // Finalizar controle de execução
    if (scrapingRunId) {
      await finishScrapingRun(scrapingRunId, {
        totalHouses,
        totalGuildhalls,
        totalServers
      });
      broadcast(`✅ Execução finalizada (ID: ${scrapingRunId})`, "success");
    }

    broadcast(
      `⏱️ ${SCRIPT_NAME} finalizado em ${timer.elapsedTime()}`,
      "success"
    );
  } catch (error) {
    const errorMessage = `Erro no ${SCRIPT_NAME}: ${error}`;
    broadcast(errorMessage, "fail");

    // Finalizar controle de execução com erro
    if (scrapingRunId) {
      await finishScrapingRun(
        scrapingRunId,
        {
          totalHouses,
          totalGuildhalls,
          totalServers
        },
        errorMessage
      );
    }

    throw error;
  }
};

export default main;

