import { RequestsConfig } from "types";

export const requests: RequestsConfig = {
  DELAY: 500, // Reduzir delay entre batches - mais ágil mas ainda seguro
  MAX_CONCURRENT_REQUESTS: 8, // Permitir 8 requests simultâneos
  MAX_RETRIES: 3 // Manter tentativas
};
