import * as cheerio from "cheerio";
import { exitIfMaintenance, stringToNumber, parseTimestamp } from "utils";
import { HouseObject } from "types";

export default class HouseList {
  private errorCheck(content: string): boolean {
    const $ = cheerio.load(content);
    const title = $(".TableContainer");
    return title.length === 0;
  }

  private extractHouseData(
    element: cheerio.Element,
    serverName: string,
    serverId: number,
    isGuildhallSearch: boolean = false
  ): HouseObject | null {
    try {
      const $ = cheerio.load(element);

      // Nome da casa (primeira coluna)
      const nameElement = $("td:nth-child(1)");
      const name = nameElement.text().trim();

      // Para obter o ID, precisamos procurar no formulário dentro da última coluna
      const formElement = $("td:last form");
      const houseIdInput = formElement.find('input[name="houseid"]');
      const houseIdValue = houseIdInput.attr("value");
      const id = houseIdValue ? parseInt(houseIdValue, 10) : 0;

      if (!id || !name) {
        return null;
      }

      // Tamanho (segunda coluna) - formato "16 sqm"
      const sizeText = $("td:nth-child(2)").text().trim();
      const size = stringToNumber(sizeText.replace(/\s*sqm.*/, ""));

      // Aluguel (terceira coluna) - formato "50k gold"
      const rentText = $("td:nth-child(3)").text().trim();
      const rent = this.parseRentValue(rentText);

      // Status (quarta coluna)
      const statusText = $("td:nth-child(4)").text().trim().toLowerCase();
      let status: "rented" | "auctioned" | "available" = "available";
      let currentBid: number | undefined;
      let auctionEnd: number | undefined;

      if (statusText.includes("rented")) {
        status = "rented";
      } else if (statusText.includes("auctioned")) {
        status = "auctioned";

        // Extrair lance atual se estiver em leilão
        const bidMatch = statusText.match(/(\d+(?:,\d+)*)\s*gold/);
        if (bidMatch) {
          currentBid = stringToNumber(bidMatch[1]);
        }

        // Extrair data do fim do leilão
        const dateMatch = statusText.match(
          /(\w{3}\s+\d{1,2}\s+\d{4},\s+\d{1,2}:\d{2}:\d{2})/
        );
        if (dateMatch) {
          auctionEnd = parseTimestamp(dateMatch[1]);
        }
      }

      // Extrair cidade do input hidden "town" no formulário
      const townInput = formElement.find('input[name="town"]');
      const town = townInput.attr("value") || "Unknown";

      // Detectar se é guildhall
      // Se estamos fazendo busca específica de guildhalls, todos os resultados são guildhalls
      // Caso contrário, verifica pelo nome
      const isGuildhall =
        isGuildhallSearch ||
        name.toLowerCase().includes("guildhall") ||
        name.toLowerCase().includes("guild");

      // Construir URL
      const worldInput = formElement.find('input[name="world"]');
      const world = worldInput.attr("value") || serverName;
      const url = `https://www.tibia.com/community/?subtopic=houses&page=view&houseid=${id}&world=${world}`;

      return {
        id,
        name,
        serverId,
        serverName,
        town,
        size,
        rent,
        status,
        currentBid,
        auctionEnd,
        isGuildhall,
        url
      };
    } catch (error) {
      console.error("Erro ao extrair dados da casa:", error);
      return null;
    }
  }

  private parseRentValue(rentText: string): number {
    // Converte "50k gold" para 50000, "100 gold" para 100, etc.
    const cleanText = rentText.toLowerCase().replace(/[^\d\w]/g, "");

    if (cleanText.includes("k")) {
      const number = parseFloat(cleanText.replace("k", "").replace("gold", ""));
      return Math.floor(number * 1000);
    }

    return stringToNumber(cleanText.replace("gold", ""));
  }

  houses(
    content: string,
    serverName: string,
    serverId: number,
    isGuildhallSearch: boolean = false
  ): HouseObject[] {
    exitIfMaintenance(() => this.errorCheck(content));

    const $ = cheerio.load(content);

    // Buscar por tabelas de casas - procurar por TR com bgcolor (estrutura do Tibia)
    const houseRows = $(
      '.TableContent tr[bgcolor], tr[bgcolor="#F1E0C6"], tr[bgcolor="#D4C0A1"]'
    );
    const houses: HouseObject[] = [];

    houseRows.each((_, element) => {
      const house = this.extractHouseData(
        element,
        serverName,
        serverId,
        isGuildhallSearch
      );
      if (house) {
        houses.push(house);
      }
    });

    return houses;
  }

  hasNextPage(content: string): boolean {
    const $ = cheerio.load(content);

    // Verificar se existe link para próxima página
    const nextPageLink = $('.PageNavigation a:contains("Next")');
    return nextPageLink.length > 0;
  }

  getNextPageUrl(content: string, currentUrl: string): string | null {
    const $ = cheerio.load(content);

    const nextPageLink = $('.PageNavigation a:contains("Next")');
    if (nextPageLink.length > 0) {
      const href = nextPageLink.attr("href");
      return href ? `https://www.tibia.com${href}` : null;
    }

    return null;
  }

  getTotalPages(content: string): number {
    const $ = cheerio.load(content);

    // Buscar pelo último número de página
    const pageLinks = $(".PageNavigation a");
    let maxPage = 1;

    pageLinks.each((_, element) => {
      const text = $(element).text().trim();
      const pageNum = parseInt(text, 10);
      if (!isNaN(pageNum) && pageNum > maxPage) {
        maxPage = pageNum;
      }
    });

    return maxPage;
  }
}
