// Central configuration point for backend integration.
// Defaults come from env vars; analysts can override them in Settings (stored locally).

export type ApiMode = "mock" | "live";

export interface ApiConfig {
  mode: ApiMode;
  baseUrl: string;
  timeoutMs: number;
  pollIntervalMs: number;
}

const KEY = "soc-console.api-config";

export const defaultConfig: ApiConfig = {
  mode: (import.meta.env.VITE_API_MODE as ApiMode) === "live" ? "live" : "mock",
  baseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? "",
  timeoutMs: 15000,
  pollIntervalMs: 3000,
};

let cached: ApiConfig | null = null;

export function getConfig(): ApiConfig {
  if (cached) return cached;
  if (typeof window === "undefined") return defaultConfig;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch {
    cached = defaultConfig;
  }
  return cached!;
}

export function setConfig(next: ApiConfig) {
  cached = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("soc-config-change"));
}

/**
 * Endpoint map used by the live adapter. These paths are PLACEHOLDERS — no backend
 * documentation was provided. Confirm against the real API spec before going live.
 */
export const endpoints = {
  health: "/health",
  overview: "/overview",
  submitCve: "/cves",
  jobs: "/jobs",
  job: (id: string) => `/jobs/${encodeURIComponent(id)}`,
  cancelJob: (id: string) => `/jobs/${encodeURIComponent(id)}/cancel`,
  retryJob: (id: string) => `/jobs/${encodeURIComponent(id)}/retry`,
  rules: "/rules",
  rule: (id: string) => `/rules/${encodeURIComponent(id)}`,
  executions: "/executions",
  executionEvents: (id: string) => `/executions/${encodeURIComponent(id)}/events`,
  history: "/history",
};
