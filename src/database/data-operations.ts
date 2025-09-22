import { db } from "./connection";
import { servers, towns, houses, guildhalls, scrapingRuns } from "./schema";
import { eq, and } from "drizzle-orm";
import { HouseObject, PartialServerObject } from "types";

/**
 * Insere ou busca um servidor no banco de dados
 * @param serverData Dados do servidor
 * @returns ID do servidor no banco
 */
export async function upsertServer(
  serverData: PartialServerObject & { serverId: number }
): Promise<number> {
  try {
    // Primeiro, tenta encontrar o servidor existente
    const existingServer = await db
      .select({ id: servers.id })
      .from(servers)
      .where(eq(servers.serverId, serverData.serverId))
      .limit(1);

    if (existingServer.length > 0) {
      // Atualiza dados do servidor existente
      await db
        .update(servers)
        .set({
          name: serverData.serverName,
          location: serverData.serverLocation.string,
          pvpType: serverData.pvpType.string,
          battleye: serverData.battleye,
          experimental: serverData.experimental,
          updatedAt: new Date()
        })
        .where(eq(servers.serverId, serverData.serverId));

      return existingServer[0].id;
    }

    // Insere novo servidor
    const newServer = await db
      .insert(servers)
      .values({
        serverId: serverData.serverId,
        name: serverData.serverName,
        location: serverData.serverLocation.string,
        pvpType: serverData.pvpType.string,
        battleye: serverData.battleye,
        experimental: serverData.experimental,
        isActive: true
      })
      .returning({ id: servers.id });

    return newServer[0].id;
  } catch (error) {
    console.error(
      `Erro ao processar servidor ${serverData.serverName}:`,
      error
    );
    throw error;
  }
}

/**
 * Insere ou busca uma cidade no banco de dados
 * @param townName Nome da cidade
 * @returns ID da cidade no banco
 */
export async function upsertTown(townName: string): Promise<number> {
  try {
    // Primeiro, tenta encontrar a cidade existente
    const existingTown = await db
      .select({ id: towns.id })
      .from(towns)
      .where(eq(towns.name, townName))
      .limit(1);

    if (existingTown.length > 0) {
      return existingTown[0].id;
    }

    // Insere nova cidade
    const newTown = await db
      .insert(towns)
      .values({
        name: townName
      })
      .returning({ id: towns.id });

    return newTown[0].id;
  } catch (error) {
    console.error(`Erro ao processar cidade ${townName}:`, error);
    throw error;
  }
}

/**
 * Insere ou atualiza uma casa no banco de dados
 * @param houseData Dados da casa
 * @param serverDbId ID do servidor no banco
 * @param townDbId ID da cidade no banco
 */
export async function upsertHouse(
  houseData: HouseObject,
  serverDbId: number,
  townDbId: number
): Promise<void> {
  try {
    const houseValues = {
      houseId: houseData.id,
      name: houseData.name,
      serverId: serverDbId,
      townId: townDbId,
      size: houseData.size,
      rent: houseData.rent,
      status: houseData.status,
      currentBid: houseData.currentBid || null,
      auctionEnd: houseData.auctionEnd ? new Date(houseData.auctionEnd) : null,
      url: houseData.url || null,
      updatedAt: new Date()
    };

    // Verifica se a casa já existe
    const existingHouse = await db
      .select({ id: houses.id })
      .from(houses)
      .where(
        and(eq(houses.houseId, houseData.id), eq(houses.serverId, serverDbId))
      )
      .limit(1);

    if (existingHouse.length > 0) {
      // Atualiza casa existente
      await db
        .update(houses)
        .set(houseValues)
        .where(eq(houses.id, existingHouse[0].id));
    } else {
      // Insere nova casa
      await db.insert(houses).values(houseValues);
    }
  } catch (error) {
    console.error(
      `Erro ao processar casa ${houseData.name} (ID: ${houseData.id}):`,
      error
    );
    throw error;
  }
}

/**
 * Insere ou atualiza uma guildhall no banco de dados
 * @param guildhallData Dados da guildhall
 * @param serverDbId ID do servidor no banco
 * @param townDbId ID da cidade no banco
 */
export async function upsertGuildhall(
  guildhallData: HouseObject,
  serverDbId: number,
  townDbId: number
): Promise<void> {
  try {
    const guildhallValues = {
      guildhallId: guildhallData.id,
      name: guildhallData.name,
      serverId: serverDbId,
      townId: townDbId,
      size: guildhallData.size,
      rent: guildhallData.rent,
      status: guildhallData.status,
      currentBid: guildhallData.currentBid || null,
      auctionEnd: guildhallData.auctionEnd
        ? new Date(guildhallData.auctionEnd)
        : null,
      url: guildhallData.url || null,
      updatedAt: new Date()
    };

    // Verifica se a guildhall já existe
    const existingGuildhall = await db
      .select({ id: guildhalls.id })
      .from(guildhalls)
      .where(
        and(
          eq(guildhalls.guildhallId, guildhallData.id),
          eq(guildhalls.serverId, serverDbId)
        )
      )
      .limit(1);

    if (existingGuildhall.length > 0) {
      // Atualiza guildhall existente
      await db
        .update(guildhalls)
        .set(guildhallValues)
        .where(eq(guildhalls.id, existingGuildhall[0].id));
    } else {
      // Insere nova guildhall
      await db.insert(guildhalls).values(guildhallValues);
    }
  } catch (error) {
    console.error(
      `Erro ao processar guildhall ${guildhallData.name} (ID: ${guildhallData.id}):`,
      error
    );
    throw error;
  }
}

/**
 * Inicia uma nova execução de scraping
 * @returns ID da execução
 */
export async function startScrapingRun(): Promise<number> {
  const newRun = await db
    .insert(scrapingRuns)
    .values({
      status: "running",
      startedAt: new Date()
    })
    .returning({ id: scrapingRuns.id });

  return newRun[0].id;
}

/**
 * Finaliza uma execução de scraping
 * @param runId ID da execução
 * @param stats Estatísticas da execução
 * @param error Mensagem de erro (se houver)
 */
export async function finishScrapingRun(
  runId: number,
  stats: {
    totalHouses: number;
    totalGuildhalls: number;
    totalServers: number;
  },
  error?: string
): Promise<void> {
  await db
    .update(scrapingRuns)
    .set({
      completedAt: new Date(),
      totalHouses: stats.totalHouses,
      totalGuildhalls: stats.totalGuildhalls,
      totalServers: stats.totalServers,
      status: error ? "failed" : "completed",
      errorMessage: error || null
    })
    .where(eq(scrapingRuns.id, runId));
}

/**
 * Processa uma lista de casas/guildhalls de um servidor
 * @param serverData Dados do servidor
 * @param housesData Lista de casas/guildhalls
 */
export async function processServerHouses(
  serverData: PartialServerObject & { serverId: number },
  housesData: HouseObject[]
): Promise<{ housesCount: number; guildhallsCount: number }> {
  // Obter/criar servidor no banco
  const serverDbId = await upsertServer(serverData);

  // Mapear cidades únicas
  const uniqueTowns = [...new Set(housesData.map((house) => house.town))];
  const townIdMap = new Map<string, number>();

  // Processar cidades
  for (const townName of uniqueTowns) {
    const townDbId = await upsertTown(townName);
    townIdMap.set(townName, townDbId);
  }

  // Separar casas de guildhalls
  const regularHouses = housesData.filter((house) => !house.isGuildhall);
  const guildhallsList = housesData.filter((house) => house.isGuildhall);

  // Processar casas regulares
  for (const house of regularHouses) {
    const townDbId = townIdMap.get(house.town);
    if (townDbId) {
      await upsertHouse(house, serverDbId, townDbId);
    }
  }

  // Processar guildhalls
  for (const guildhall of guildhallsList) {
    const townDbId = townIdMap.get(guildhall.town);
    if (townDbId) {
      await upsertGuildhall(guildhall, serverDbId, townDbId);
    }
  }

  return {
    housesCount: regularHouses.length,
    guildhallsCount: guildhallsList.length
  };
}

