import { RequestsConfig } from "types";

export const requests: RequestsConfig = {
  DELAY: 2000, // Aumentar delay para 2 segundos
  MAX_CONCURRENT_REQUESTS: 1, // Reduzir para 1 request por vez
  MAX_RETRIES: 3 // Reduzir tentativas
};
