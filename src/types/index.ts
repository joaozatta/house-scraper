// Tipos para Houses
export interface HouseObject {
  id: number;
  name: string;
  serverId: number;
  serverName: string;
  town: string;
  size: number; // em sqm
  rent: number; // em gold por mês
  status: "rented" | "auctioned" | "available";
  currentBid?: number;
  auctionEnd?: number; // timestamp
  isGuildhall: boolean;
  url?: string;
}

export interface PartialServerObject {
  serverName: string;
  serverLocation: ServerLocation;
  pvpType: PvpType;
  battleye: boolean;
  experimental: boolean;
}

export interface ServerLocation {
  string: string;
  type: number;
}

export interface PvpType {
  string: string;
  type: number;
}

// Tipos para configuração de requests
export interface RequestsConfig {
  DELAY: number;
  MAX_CONCURRENT_REQUESTS: number;
  MAX_RETRIES: number;
}

// Tipos para towns/cidades do Tibia
export type TibiaTown =
  | "Ab'Dendriel"
  | "Ankrahmun"
  | "Candia"
  | "Carlin"
  | "Darashia"
  | "Edron"
  | "Farmine"
  | "Gray Beach"
  | "Issavi"
  | "Kazordoon"
  | "Liberty Bay"
  | "Moonfall"
  | "Port Hope"
  | "Rathleton"
  | "Silvertides"
  | "Svargrond"
  | "Thais"
  | "Venore"
  | "Yalahar";

// Lista completa de cidades do Tibia para scraping
export const TIBIA_CITIES: TibiaTown[] = [
  "Ab'Dendriel",
  "Ankrahmun",
  "Candia",
  "Carlin",
  "Darashia",
  "Edron",
  "Farmine",
  "Gray Beach",
  "Issavi",
  "Kazordoon",
  "Liberty Bay",
  "Moonfall",
  "Port Hope",
  "Rathleton",
  "Silvertides",
  "Svargrond",
  "Thais",
  "Venore",
  "Yalahar"
];

// Tipos para filtros de house
export interface HouseFilters {
  world?: string;
  town?: TibiaTown | "all";
  status?: "all" | "auctioned" | "rented";
  type?: "all" | "houses" | "guildhalls";
  order?: "name" | "size" | "rent" | "bid" | "auction_end";
}
