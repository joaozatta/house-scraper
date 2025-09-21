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
import * as fs from "fs";
import * as path from "path";

const SCRIPT_NAME = coloredText("ScrapHouses", "highlight");

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

// Função para salvar dados de um servidor específico
const saveServerData = async (
  serverName: string,
  houses: HouseObject[]
): Promise<void> => {
  const outputDir = path.join(process.cwd(), "Output", "servers");

  // Criar diretório se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Calcular estatísticas
  const stats = {
    total: houses.length,
    rented: houses.filter((h) => h.status === "rented").length,
    auctioned: houses.filter((h) => h.status === "auctioned").length,
    available: houses.filter((h) => h.status === "available").length,
    guildhalls: houses.filter((h) => h.isGuildhall).length
  };

  // Criar estrutura de dados do servidor
  const serverData = {
    server: serverName,
    timestamp: new Date().toISOString(),
    lastUpdate: Date.now(),
    statistics: stats,
    houses: houses.sort((a, b) => a.id - b.id) // Ordenar por ID
  };

  // Salvar arquivo JSON do servidor
  const filePath = path.join(outputDir, `${serverName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(serverData, null, 2));

  broadcast(`📁 Dados salvos: ${filePath}`, "neutral");
};

const main = async (): Promise<void> => {
  const timer = new Timer();
  broadcast(`Iniciando ${SCRIPT_NAME} script`, "success");

  try {
    // Buscar lista de servidores diretamente
    broadcast("Buscando lista de servidores...", "neutral");
    const serversHtml = await fetchServersPage();
    const serverListHelper = new ServerList();
    const partialServers = serverListHelper.servers(serversHtml);

    if (partialServers.length === 0) {
      broadcast("Nenhum servidor encontrado na página do Tibia", "fail");
      return;
    }

    // Converter PartialServerObject para formato com IDs
    const servers = partialServers.map((server) => ({
      serverId: generateServerId(server.serverName),
      ...server
    }));

    broadcast(`${servers.length} servidores encontrados`, "neutral");

    broadcast("Iniciando coleta de dados por servidor", "neutral");

    // Configurar tracking de progresso
    const taskTracking = new TrackETA(
      servers.length,
      coloredText("Coletando houses por servidor", "highlight")
    );

    // Criar tasks para cada servidor
    const serverTasks = servers.map((server) => async () => {
      taskTracking.incTask();
      broadcast(
        `Coletando houses de: ${coloredText(
          server.serverName,
          "highlight"
        )} ${taskTracking.getProgress()}`,
        "neutral"
      );

      try {
        const houses = await fetchAllHousesForServer(server.serverName);

        // Calcular estatísticas detalhadas
        const rented = houses.filter((h) => h.status === "rented").length;
        const auctioned = houses.filter((h) => h.status === "auctioned").length;
        const available = houses.filter((h) => h.status === "available").length;

        broadcast(
          `${houses.length} casas encontradas em ${server.serverName}: ${rented} alugadas, ${auctioned} em leilão, ${available} disponíveis`,
          "neutral"
        );

        // SALVAR DADOS POR SERVIDOR
        if (houses.length > 0) {
          await saveServerData(server.serverName, houses);
        }

        return houses;
      } catch (error) {
        broadcast(
          `Erro ao coletar houses de ${server.serverName}: ${error}`,
          "fail"
        );
        return [];
      }
    });

    // Executar coleta em batches
    const allHousesResults = await batchPromises(serverTasks);
    const allHouses: HouseObject[] = allHousesResults.flat();

    taskTracking.finish();

    // Informar resultados
    if (allHouses.length > 0) {
      // Informar sobre arquivos gerados
      const serversWithData = allHousesResults.filter(
        (houses) => houses.length > 0
      ).length;

      const totalHouses = allHouses.length;
      const totalRented = allHouses.filter((h) => h.status === "rented").length;
      const totalAuctioned = allHouses.filter(
        (h) => h.status === "auctioned"
      ).length;
      const totalAvailable = allHouses.filter(
        (h) => h.status === "available"
      ).length;
      const totalGuildhalls = allHouses.filter((h) => h.isGuildhall).length;

      broadcast(
        `Coleta concluída: ${totalHouses} casas coletadas de ${serversWithData} servidores`,
        "success"
      );

      broadcast(
        `Estatísticas: ${totalHouses} casas | ${totalRented} alugadas | ${totalAuctioned} em leilão | ${totalAvailable} disponíveis | ${totalGuildhalls} guildhalls`,
        "neutral"
      );

      broadcast(
        `${serversWithData} arquivos de servidor gerados em Output/servers/`,
        "success"
      );
    } else {
      broadcast("Nenhuma casa coletada", "fail");
    }

    broadcast(
      `${SCRIPT_NAME} script finalizado em ${timer.elapsedTime()}`,
      "success"
    );
  } catch (error) {
    broadcast(`Erro no ${SCRIPT_NAME}: ${error}`, "fail");
    throw error;
  }
};

export default main;
