import * as cheerio from "cheerio";
import { exitIfMaintenance, sanitizeHtmlString } from "utils";
import { PartialServerObject, ServerLocation, PvpType } from "types";

export default class ServerList {
  private errorCheck(content: string): boolean {
    const $ = cheerio.load(content);
    const title = $('.Text:contains("Game World Overview")').html();
    return !title;
  }

  private name(element: cheerio.Element): string {
    return cheerio.load(element)("td:nth-child(1)").text();
  }

  private location(element: cheerio.Element): ServerLocation {
    const locationText = cheerio.load(element)("td:nth-child(3)").text();
    return this.parseServerLocation(locationText);
  }

  private pvpType(element: cheerio.Element): PvpType {
    const pvpTypeText = cheerio.load(element)("td:nth-child(4)").text();
    return this.parsePvpType(pvpTypeText);
  }

  private battleye(element: cheerio.Element): boolean {
    const battleyeImageSrc = cheerio
      .load(element)("td:nth-child(5) img")
      .attr("src");

    if (!battleyeImageSrc) {
      return false;
    }

    const BATTLEYE_PROTECTED_URL =
      "https://static.tibia.com/images/global/content/icon_battleyeinitial.gif";

    return battleyeImageSrc === BATTLEYE_PROTECTED_URL;
  }

  private experimental(element: cheerio.Element): boolean {
    const serverInfoText = cheerio
      .load(element)("td:nth-child(6)")
      .text()
      .toLowerCase();

    return serverInfoText.includes("experimental");
  }

  private parseServerLocation(locationText: string): ServerLocation {
    const cleanText = sanitizeHtmlString(locationText).toLowerCase();

    if (cleanText.includes("north america")) {
      return { string: "North America", type: 0 };
    }
    if (cleanText.includes("south america")) {
      return { string: "South America", type: 1 };
    }
    if (cleanText.includes("europe")) {
      return { string: "Europe", type: 2 };
    }

    return { string: locationText, type: -1 };
  }

  private parsePvpType(pvpTypeText: string): PvpType {
    const cleanText = sanitizeHtmlString(pvpTypeText).toLowerCase();

    if (cleanText.includes("optional pvp")) {
      return { string: "Optional PvP", type: 0 };
    }
    if (cleanText.includes("open pvp")) {
      return { string: "Open PvP", type: 1 };
    }
    if (cleanText.includes("retro open pvp")) {
      return { string: "Retro Open PvP", type: 2 };
    }
    if (cleanText.includes("hardcore pvp")) {
      return { string: "Hardcore PvP", type: 3 };
    }
    if (cleanText.includes("retro hardcore pvp")) {
      return { string: "Retro Hardcore PvP", type: 4 };
    }

    return { string: pvpTypeText, type: -1 };
  }

  servers(content: string): PartialServerObject[] {
    exitIfMaintenance(() => this.errorCheck(content));

    const $ = cheerio.load(content);

    const serverElements = $(".Odd, .Even");
    const serverArray: PartialServerObject[] = [];

    serverElements.each((_, element) => {
      const serverName = this.name(element);

      // Pula servidores de teste ou especiais
      if (serverName.toLowerCase().includes("test")) {
        return;
      }

      serverArray.push({
        serverName,
        serverLocation: this.location(element),
        pvpType: this.pvpType(element),
        battleye: this.battleye(element),
        experimental: this.experimental(element)
      });
    });

    return serverArray;
  }
}
