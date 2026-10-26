import { getConfig } from "./config";
import { httpAdapter } from "./http";
import { mockAdapter } from "./mock";
import type { ApiAdapter } from "./types";

/** Returns exactly one adapter — mock and live data are never mixed. */
export function api(): ApiAdapter {
  return getConfig().mode === "live" ? httpAdapter : mockAdapter;
}

export * from "./types";
