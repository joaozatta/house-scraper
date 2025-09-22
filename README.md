# house-scraper 🏠

Scraper completo para coletar dados de todas as casas de todos os servidores do Tibia, cobrindo todas as 19 cidades do jogo. Suporta tanto salvamento em arquivos JSON quanto persistência em banco PostgreSQL.

## 🎯 Objetivo

Coletar informações detalhadas sobre **todas as casas de todos os servidores do Tibia**, incluindo:

- **Cobertura completa**: 19 cidades por servidor × 95 servidores = ~88,000 casas
- **Casas regulares** e **Guildhalls**
- **Status** (alugada, em leilão, disponível)
- **Preços** de aluguel e lances de leilão
- **Localização** detalhada por servidor e cidade
- **Características** (tamanho, tipo)
- **URLs diretas** para visualização no site oficial

## 🏗️ Estrutura do Projeto

```
├── Output/
│   └── servers/         # JSON por servidor (95 arquivos)
├── drizzle/             # Migrações do banco de dados
├── src/
│   ├── Constants/       # Configurações de requests
│   ├── database/        # Schema e operações do PostgreSQL
│   ├── Helpers/         # Parsers HTML com Cheerio
│   ├── Scripts/
│   │   └── ScrapHouses/ # Scripts de coleta (JSON + DB)
│   ├── logging/         # Sistema de logging customizado
│   ├── services/        # Cliente HTTP
│   ├── types/           # Tipos TypeScript
│   └── utils/           # Utilitários (retry, batch, etc.)
├── drizzle.config.ts    # Configuração do Drizzle ORM
└── package.json
```

## 🚀 Funcionalidades

- **`Output/servers/`**: Um arquivo JSON para cada servidor do Tibia (95 arquivos)
- **`database/`**: Integração com PostgreSQL via Drizzle ORM para persistência
- **`Constants/`**: Configurações de rate limiting e timeouts
- **`Helpers/`**: Parsers especializados para HTML do Tibia (casas e servidores)
- **`Scripts/ScrapHouses/`**: Dois modos de operação (JSON + PostgreSQL)
- **`logging/`**: Sistema de logging colorido com progresso e ETA
- **`services/`**: Cliente HTTP com headers anti-Cloudflare
- **`types/`**: Interfaces TypeScript e constantes (19 cidades do Tibia)
- **`utils/`**: Retry automático, batch processing e utilitários

## 📋 Scripts Disponíveis

### `npm run scrap:houses`

**Script principal** - Coleta dados de casas de **todos os servidores e todas as cidades** e salva em **arquivos JSON**.

```bash
npm run scrap:houses
```

### `npm run scrap:houses:db`

**Script com banco de dados** - Coleta dados de casas de **todos os servidores e todas as cidades** e salva no **PostgreSQL**.

```bash
npm run scrap:houses:db
```

**Processo (ambos os modos):**

1. 🔄 Busca lista atualizada de servidores do Tibia (95 servidores)
2. 🌐 Para cada servidor, acessa páginas de **todas as 19 cidades**:
   - Ab'Dendriel, Ankrahmun, Candia, Carlin, Darashia
   - Edron, Farmine, Gray Beach, Issavi, Kazordoon
   - Liberty Bay, Moonfall, Port Hope, Rathleton, Silvertides
   - Svargrond, Thais, Venore, Yalahar
3. 🏠 Para cada cidade, busca separadamente:
   - **Casas regulares** (houses)
   - **Guildhalls** (guildhalls)
4. 📋 Extrai dados detalhados de cada propriedade:
   - Nome e ID da casa/guildhall
   - Servidor e cidade
   - Tamanho (sqm) e aluguel mensal
   - Status (alugada/leilão/disponível)
   - Lance atual e fim do leilão (se aplicável)
   - URL direta para visualização
5. 💾 Salva dados:
   - **JSON**: Arquivo por servidor em `Output/servers/`
   - **Banco**: Tabelas relacionais no PostgreSQL
6. 📊 Mostra progresso detalhado com ETA

**Saídas do `scrap:houses`:**

- `Output/servers/[ServerName].json` - Um arquivo por servidor (95 arquivos)
- **Tempo aproximado:** 45-60 minutos para coleta completa (incluindo guildhalls)
- **Volume de dados:** ~88,000 casas, ~927 por servidor

**Saídas do `scrap:houses:db`:**

- Dados persistidos no PostgreSQL em tabelas estruturadas
- Controle de execuções com metadados e estatísticas
- Separação entre casas normais e guildhalls
- **Tempo aproximado:** 45-60 minutos para coleta completa
- **Volume de dados:** ~88,000 propriedades no banco

### Scripts de Banco de Dados

```bash
# Gerar migrações do banco
npm run db:generate

# Aplicar mudanças no schema
npm run db:push

# Interface visual do banco (Drizzle Studio)
npm run db:studio

# Executar migrações
npm run db:migrate
```

### Outros Scripts

```bash
# Servidor local para visualizar dados JSON coletados
npm run dev

# Limpeza e formatação
npm run clean
npm run lint
npm run format
```

## Estrutura de Dados

### Interface Principal

```typescript
interface HouseObject {
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
  url: string; // URL direta para a casa no site oficial
}
```

### Arquivo de Saída por Servidor

```typescript
interface ServerData {
  server: string;
  timestamp: string; // ISO string
  lastUpdate: number; // Unix timestamp
  statistics: {
    total: number;
    rented: number;
    auctioned: number;
    available: number;
    guildhalls: number;
  };
  houses: HouseObject[]; // Ordenadas por ID
}
```

### Cidades do Tibia (19 cidades cobertas)

```typescript
type TibiaTown =
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
```

## ⚙️ Configuração

### Rate Limiting e Performance

Configurações otimizadas em [`src/Constants/requests.ts`](src/Constants/requests.ts):

```typescript
export const requests = {
  DELAY: 2000, // 2 segundos entre requests para evitar Cloudflare
  MAX_CONCURRENT_REQUESTS: 1, // 1 request por vez para estabilidade
  MAX_RETRIES: 3, // máximo 3 tentativas antes de falhar
  REQUEST_TIMEOUT: 15000 // timeout de 15 segundos
};
```

### Headers Anti-Cloudflare

O cliente HTTP utiliza headers específicos para bypasse do Cloudflare:

```typescript
// Headers configurados automaticamente
headers: {
  "User-Agent": "Dynamic User-Agent rotation",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Cache-Control": "max-age=0"
}
```

## 🚀 Como Usar

### 1. Instalação

```bash
cd house-scraper
npm install
```

### 2. Configuração (Para uso com banco)

#### Requisitos:

- PostgreSQL 12+ (local ou cloud: Neon, Supabase, Railway, etc.)
- Node.js 18+

Crie um arquivo `.env` baseado no `env.example`:

```bash
cp env.example .env
```

Configure a `DATABASE_URL` com sua connection string do PostgreSQL:

```env
NODE_ENV=development
DATABASE_URL=postgresql://usuario:senha@host:5432/banco?sslmode=require
```

**Exemplos de connection strings:**

```env
# Neon.tech
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Supabase
DATABASE_URL=postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres

# PostgreSQL local
DATABASE_URL=postgresql://postgres:senha@localhost:5432/tibia_houses
```

### 3. Setup do Banco (Opcional)

```bash
# Aplicar schema no banco
npm run db:push

# Ou executar migrações
npm run db:migrate
```

### 4. Execução Completa

**Modo JSON (padrão):**

```bash
# Executar scraping e salvar em arquivos JSON
# ⚠️ Duração: ~45-60 minutos
npm run scrap:houses
```

**Modo Banco de Dados:**

```bash
# Executar scraping e salvar no PostgreSQL
# ⚠️ Duração: ~45-60 minutos
npm run scrap:houses:db
```

**Output esperado (JSON):**

- 95 arquivos JSON em `Output/servers/`
- ~88,000+ propriedades coletadas (casas + guildhalls)
- Progresso em tempo real com ETA
- Estatísticas detalhadas por servidor

**Output esperado (Banco):**

- Dados estruturados no PostgreSQL
- Tabelas: `servers`, `towns`, `houses`, `guildhalls`, `scraping_runs`, `server_stats`
- Controle de execuções com metadados e rastreabilidade
- Upsert automático (atualiza dados existentes)
- Índices otimizados para consultas rápidas

### 5. Visualização dos Dados

**Dados JSON:**

```bash
# Servidor local para navegar pelos dados coletados
# 🌐 Acesse: http://localhost:5556
npm run dev
```

**Dados do Banco:**

```bash
# Interface visual do Drizzle Studio
# 🌐 Acesse: https://local.drizzle.studio
npm run db:studio
```

### 6. Manutenção

```bash
# Limpeza completa
npm run clean

# Verificação de código
npm run lint

# Formatação de código
npm run format
```

## 📊 Dados Coletados

### Exemplo de Casa (Alugada):

```json
{
  "id": 12345,
  "name": "Underwood 1",
  "serverId": 1234567890,
  "serverName": "Aethera",
  "town": "Edron",
  "size": 95,
  "rent": 10000,
  "status": "rented",
  "isGuildhall": false,
  "url": "https://www.tibia.com/community/?subtopic=houses&page=view&houseid=12345&world=Aethera"
}
```

### Exemplo de Casa (Em Leilão):

```json
{
  "id": 67890,
  "name": "Castle Street 1",
  "serverId": 1234567890,
  "serverName": "Aethera",
  "town": "Edron",
  "size": 60,
  "rent": 300000,
  "status": "auctioned",
  "currentBid": 50000,
  "auctionEnd": 1703684400,
  "isGuildhall": false,
  "url": "https://www.tibia.com/community/?subtopic=houses&page=view&houseid=67890&world=Aethera"
}
```

### Arquivo Completo do Servidor:

```json
{
  "server": "Aethera",
  "timestamp": "2024-09-20T19:27:15.000Z",
  "lastUpdate": 1726862835,
  "statistics": {
    "total": 927,
    "rented": 500,
    "auctioned": 400,
    "available": 27,
    "guildhalls": 15
  },
  "houses": [
    // Array com todas as 927 casas do servidor, ordenadas por ID
  ]
}
```

### Estatísticas Reais da Última Coleta:

**Modo JSON:**

```
📊 Coleta Completa - Tibia Houses:
  🕒 Duração: 31m 50s
  🌍 Servidores: 95
  🏠 Total de casas: 88,065
  🏘️ Alugadas: 49,583 (56%)
  🔨 Em leilão: 38,482 (44%)
  🆓 Disponíveis: 0 (0%)
  📁 Arquivos gerados: 95 (um por servidor)
  🏙️ Cidades cobertas: 19 por servidor
```

**Modo Banco:**

```
📊 Coleta Completa - PostgreSQL:
  🕒 Duração: 35m 12s
  🌍 Servidores: 95 processados
  🏠 Casas normais: ~75,000
  🏛️ Guildhalls: ~13,000
  💾 Total no banco: ~88,000+ registros
  📊 Execução ID: #12 (rastreável)
  🏙️ Cidades: 19 por servidor (1,805 total)
  🔄 Upserts realizados: 100% dados atualizados
```

## 🛡️ Características Técnicas

### 🚀 Performance e Escala

- **Cobertura completa**: 95 servidores × 19 cidades × 2 tipos = 3,610 requests por coleta
- **Volume de dados**: ~88,000+ propriedades por execução completa (casas + guildhalls)
- **Processamento sequencial**: Um servidor por vez para evitar sobrecarga
- **Rate limiting**: 2s entre requests, 1s entre tipos (casas/guildhalls)
- **Tempo otimizado**: ~45-60 minutos para coleta completa

### 🔒 Segurança e Estabilidade

- **Anti-Cloudflare**: Headers especializados para bypasse
- **Rate Limiting**: 2s delay entre requests para evitar bloqueios
- **User-Agent dinâmico**: Rotação automática para reduzir detecção
- **Retry inteligente**: 3 tentativas com backoff para requests falhados
- **Encoding ISO-8859-1**: Compatível com caracteres especiais do Tibia

### 📊 Monitoramento e Logging

- **Progress tracking**: ETA em tempo real por servidor
- **Logging colorido**: Status visual para diferentes tipos de mensagem
- **Estatísticas detalhadas**: Contadores por status (alugada/leilão/disponível)
- **Error handling**: Tratamento robusto de falhas com logging detalhado

### 💾 Armazenamento e Estrutura

**Modo JSON:**

- **Dados incrementais**: Salvamento por servidor em tempo real
- **Estrutura otimizada**: JSON organizado com metadados e estatísticas
- **Ordenação consistente**: Casas ordenadas por ID para facilitar comparações
- **Timestamps completos**: ISO string + Unix timestamp para rastreabilidade

**Modo Banco de Dados:**

- **PostgreSQL + Drizzle ORM**: Schema tipado e migrações automáticas
- **Tabelas relacionais**: Separação entre servidores, cidades, casas e guildhalls
- **Controle de execuções**: Rastreamento de coletas com metadados
- **Índices otimizados**: Performance para consultas complexas

## 🎯 Casos de Uso

Este scraper é ideal para:

- **Análise de mercado imobiliário** do Tibia
- **Monitoramento de leilões** em tempo real
- **Estudos de economia** dos servidores
- **APIs de dados** para aplicações relacionadas ao Tibia
- **Dashboards** de estatísticas de casas
- **Alertas automáticos** para casas específicas
- **Business Intelligence** com dados estruturados no PostgreSQL
- **Análises históricas** com controle de execuções
- **Relatórios automatizados** usando SQL

## 🏗️ Schema do Banco de Dados

### Tabelas Principais

```sql
-- Servidores do Tibia
servers: id, server_id, name, location, pvp_type, battleye, experimental

-- Cidades do jogo
towns: id, name

-- Casas normais
houses: id, house_id, name, server_id, town_id, size, rent, status, current_bid, auction_end, url

-- Guildhalls
guildhalls: id, guildhall_id, name, server_id, town_id, size, rent, status, current_bid, auction_end, url

-- Controle de execuções
scraping_runs: id, started_at, completed_at, total_houses, total_guildhalls, total_servers, status

-- Estatísticas por servidor
server_stats: id, server_id, total_houses, total_guildhalls, rented_houses, auctioned_houses, avg_rent
```

## 📈 Melhorias Implementadas

- ✅ **Cobertura completa**: De 52 casas para 927+ casas por servidor (+1.681%)
- ✅ **Múltiplas cidades**: Todas as 19 cidades do Tibia cobertas
- ✅ **Guildhalls incluídas**: Busca separada e detecção precisa de guildhalls
- ✅ **Bypass Cloudflare**: Headers otimizados para estabilidade
- ✅ **Logging avançado**: Progresso em tempo real com ETA
- ✅ **Persistência em banco**: PostgreSQL com Drizzle ORM
- ✅ **Duplo modo**: JSON files + Database com schemas relacionais
- ✅ **Estrutura limpa**: Código otimizado e documentado
