import { broadcast, tabBroadcast } from "../logging";
import { sleep } from "./sleep";
import { requests } from "Constants";

const BASE_DELAY = 2;
const MILLISECONDS = 1000;

const exponentialBackoffDelay = async (retriesLeft: number): Promise<void> => {
  if (retriesLeft > 0) {
    const magnitude = requests.MAX_RETRIES - retriesLeft;
    const exponentialDelay = BASE_DELAY ** magnitude * MILLISECONDS;

    await sleep(exponentialDelay);
  }
};

const retryCall = async <T>(
  callback: () => Promise<T>,
  retries = requests.MAX_RETRIES
): Promise<T> => {
  if (retries > 0) {
    try {
      const result = await callback();
      return result;
    } catch (error) {
      tabBroadcast("ERROR! Tentando novamente...", "fail");

      const retriesLeft = retries - 1;
      await exponentialBackoffDelay(retriesLeft);
      return retryCall(callback, retriesLeft);
    }
  } else {
    broadcast("Máximo de tentativas atingido", "control");
    process.exit();
  }
};

export const retryWrapper = <F extends (...args: any[]) => any>(
  callback: F
) => {
  const wrapped = async (...args: Parameters<F>) =>
    retryCall(() => callback(...args));

  return wrapped as (...args: Parameters<F>) => Promise<ReturnType<F>>;
};
