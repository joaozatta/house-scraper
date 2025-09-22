import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  text,
  decimal
} from "drizzle-orm/pg-core";

// Tabela de servidores
export const servers = pgTable(
  "servers",
  {
    id: serial("id").primaryKey(),
    serverId: integer("server_id").notNull().unique(), // ID gerado pelo hash
    name: varchar("name", { length: 50 }).notNull().unique(),
    location: varchar("location", { length: 100 }),
    pvpType: varchar("pvp_type", { length: 20 }),
    battleye: boolean("battleye").default(false),
    experimental: boolean("experimental").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    serverIdIdx: index("servers_server_id_idx").on(table.serverId),
    nameIdx: index("servers_name_idx").on(table.name)
  })
);

// Tabela de cidades
export const towns = pgTable(
  "towns",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    nameIdx: index("towns_name_idx").on(table.name)
  })
);

// Tabela de casas normais (sem guildhalls)
export const houses = pgTable(
  "houses",
  {
    id: serial("id").primaryKey(),
    houseId: integer("house_id").notNull(), // ID original do Tibia
    name: varchar("name", { length: 200 }).notNull(),
    serverId: integer("server_id").references(() => servers.id),
    townId: integer("town_id").references(() => towns.id),
    size: integer("size").notNull(), // sqm
    rent: integer("rent").notNull(), // gold por mês
    status: varchar("status", { length: 20 }).notNull(), // rented, auctioned, available
    currentBid: integer("current_bid"),
    auctionEnd: timestamp("auction_end"),
    url: text("url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    // Índices para performance
    houseServerIdx: uniqueIndex("houses_house_id_server_id_idx").on(
      table.houseId,
      table.serverId
    ),
    serverIdx: index("houses_server_id_idx").on(table.serverId),
    townIdx: index("houses_town_id_idx").on(table.townId),
    statusIdx: index("houses_status_idx").on(table.status),
    rentIdx: index("houses_rent_idx").on(table.rent),
    sizeIdx: index("houses_size_idx").on(table.size),
    auctionEndIdx: index("houses_auction_end_idx").on(table.auctionEnd)
  })
);

// Tabela de guildhalls (separada das casas normais)
export const guildhalls = pgTable(
  "guildhalls",
  {
    id: serial("id").primaryKey(),
    guildhallId: integer("guildhall_id").notNull(), // ID original do Tibia
    name: varchar("name", { length: 200 }).notNull(),
    serverId: integer("server_id").references(() => servers.id),
    townId: integer("town_id").references(() => towns.id),
    size: integer("size").notNull(), // sqm
    rent: integer("rent").notNull(), // gold por mês
    status: varchar("status", { length: 20 }).notNull(), // rented, auctioned, available
    currentBid: integer("current_bid"),
    auctionEnd: timestamp("auction_end"),
    url: text("url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    // Índices para performance
    guildhallServerIdx: uniqueIndex("guildhalls_guildhall_id_server_id_idx").on(
      table.guildhallId,
      table.serverId
    ),
    serverIdx: index("guildhalls_server_id_idx").on(table.serverId),
    townIdx: index("guildhalls_town_id_idx").on(table.townId),
    statusIdx: index("guildhalls_status_idx").on(table.status),
    rentIdx: index("guildhalls_rent_idx").on(table.rent),
    sizeIdx: index("guildhalls_size_idx").on(table.size),
    auctionEndIdx: index("guildhalls_auction_end_idx").on(table.auctionEnd)
  })
);

// Tabela para metadados de execuções do scraper
export const scrapingRuns = pgTable(
  "scraping_runs",
  {
    id: serial("id").primaryKey(),
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    totalHouses: integer("total_houses"),
    totalGuildhalls: integer("total_guildhalls"),
    totalServers: integer("total_servers"),
    status: varchar("status", { length: 20 }).default("running"), // running, completed, failed
    errorMessage: text("error_message")
  },
  (table) => ({
    startedAtIdx: index("scraping_runs_started_at_idx").on(table.startedAt),
    statusIdx: index("scraping_runs_status_idx").on(table.status)
  })
);

// Tabela para estatísticas agregadas por servidor
export const serverStats = pgTable(
  "server_stats",
  {
    id: serial("id").primaryKey(),
    serverId: integer("server_id").references(() => servers.id),
    totalHouses: integer("total_houses").default(0),
    totalGuildhalls: integer("total_guildhalls").default(0),
    rentedHouses: integer("rented_houses").default(0),
    auctionedHouses: integer("auctioned_houses").default(0),
    availableHouses: integer("available_houses").default(0),
    rentedGuildhalls: integer("rented_guildhalls").default(0),
    auctionedGuildhalls: integer("auctioned_guildhalls").default(0),
    availableGuildhalls: integer("available_guildhalls").default(0),
    avgHouseRent: decimal("avg_house_rent", { precision: 10, scale: 2 }),
    avgGuildhallRent: decimal("avg_guildhall_rent", { precision: 10, scale: 2 }),
    lastUpdated: timestamp("last_updated").defaultNow()
  },
  (table) => ({
    serverIdIdx: uniqueIndex("server_stats_server_id_idx").on(table.serverId),
    lastUpdatedIdx: index("server_stats_last_updated_idx").on(table.lastUpdated)
  })
);

// Exportar todos os schemas para uso no Drizzle
export const schema = {
  servers,
  towns,
  houses,
  guildhalls,
  scrapingRuns,
  serverStats
};
