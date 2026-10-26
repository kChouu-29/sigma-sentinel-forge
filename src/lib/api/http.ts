import { endpoints, getConfig } from "./config";
import type { ApiAdapter, HistoryQuery } from "./types";

export class ApiError extends Error {
  constructor(message: string, public status?: number, public kind: "network" | "timeout" | "http" = "http") {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { query?: Record<string, unknown> }): Promise<T> {
  const cfg = getConfig();
  if (!cfg.baseUrl) throw new ApiError("No backend URL configured. Set it in Settings.", undefined, "network");
  const url = new URL(cfg.baseUrl.replace(/\/$/, "") + path);
  Object.entries(init?.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) url.searchParams.set(k, String(v));
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new ApiError(`Request failed (${res.status} ${res.statusText})`, res.status);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === "AbortError") throw new ApiError(`Request timed out after ${cfg.timeoutMs}ms`, undefined, "timeout");
    throw new ApiError("Network error — backend unreachable", undefined, "network");
  } finally {
    clearTimeout(timer);
  }
}

// Live adapter. Response shapes are assumed to match ./types until a spec is available.
export const httpAdapter: ApiAdapter = {
  mode: "live",
  async health() {
    const t = performance.now();
    const r = await request<{ version?: string }>(endpoints.health);
    return { ok: true, mode: "live", latencyMs: Math.round(performance.now() - t), version: r?.version };
  },
  getOverview: () => request(endpoints.overview),
  submitCve: (cveId) => request(endpoints.submitCve, { method: "POST", body: JSON.stringify({ cveId }) }),
  listJobs: (p) => request(endpoints.jobs, { query: p }),
  getJob: (id) => request(endpoints.job(id)),
  cancelJob: (id) => request(endpoints.cancelJob(id), { method: "POST" }),
  retryJob: (id) => request(endpoints.retryJob(id), { method: "POST" }),
  listRules: (p) => request(endpoints.rules, { query: p }),
  getRule: (id) => request(endpoints.rule(id)),
  listExecutions: (p) => request(endpoints.executions, { query: p }),
  getExecutionEvents: (id) => request(endpoints.executionEvents(id)),
  searchHistory: (q: HistoryQuery) => request(endpoints.history, { query: { ...q } }),
  // analyzeExecution intentionally omitted until a compatible endpoint is confirmed.
};
