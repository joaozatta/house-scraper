import fetch from "node-fetch";
import UserAgent from "user-agents";
import { HouseFilters } from "types";

const REQUEST_TIMEOUT = 15000;

export default class HttpClient {
  static async getHtml(url: string): Promise<string> {
    const userAgent = new UserAgent();
    const response = await fetch(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        "User-Agent": userAgent.toString(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0"
      }
    });

    if (response.status !== 200) {
      throw new Error(
        `getHtml() recebeu um status code inválido [${response.status}] - URL: ${url}`
      );
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder("ISO-8859-1");
    const content = decoder.decode(buffer);

    // Verificar se recebemos a página de proteção do Cloudflare
    if (
      content.includes("Just a moment...") ||
      content.includes("Enable JavaScript and cookies")
    ) {
      throw new Error(
        "Página bloqueada pelo Cloudflare - necessário usar browser real ou proxy"
      );
    }

    return content;
  }

  static async getJSON<T>(url: string): Promise<T> {
    const response = await fetch(url, { timeout: REQUEST_TIMEOUT });

    if (response.status !== 200) {
      throw new Error(
        `getJSON() recebeu um status code inválido [${response.status}]`
      );
    }

    return response.json();
  }

  static buildHousesUrl(filters: HouseFilters = {}): string {
    const baseUrl = "https://www.tibia.com/community/?subtopic=houses";
    const params = new URLSearchParams();

    if (filters.world) {
      params.append("world", filters.world);
    }

    if (filters.town && filters.town !== "all") {
      params.append("town", filters.town);
    }

    if (filters.status && filters.status !== "all") {
      params.append("state", filters.status);
    }

    if (filters.type && filters.type !== "all") {
      params.append(
        "type",
        filters.type === "guildhalls" ? "guildhalls" : "houses"
      );
    }

    if (filters.order) {
      params.append("order", filters.order);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}&${queryString}` : baseUrl;
  }

  static async getHousesPage(filters: HouseFilters = {}): Promise<string> {
    const url = this.buildHousesUrl(filters);
    return this.getHtml(url);
  }

  static async getServersPage(): Promise<string> {
    return this.getHtml("https://www.tibia.com/community/?subtopic=worlds");
  }

  static async getHouseDetailPage(
    houseId: number,
    world: string
  ): Promise<string> {
    const url = `https://www.tibia.com/community/?subtopic=houses&page=view&houseid=${houseId}&world=${world}`;
    return this.getHtml(url);
  }
}
