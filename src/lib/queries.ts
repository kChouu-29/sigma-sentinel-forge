import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isTerminal, type HistoryQuery } from "./api";
import { getConfig, type ApiConfig } from "./api/config";

export function useApiConfig(): ApiConfig {
  const [cfg, setCfg] = useState<ApiConfig>(getConfig);
  const qc = useQueryClient();
  useEffect(() => {
    setCfg(getConfig());
    const h = () => { setCfg(getConfig()); qc.clear(); };
    window.addEventListener("soc-config-change", h);
    return () => window.removeEventListener("soc-config-change", h);
  }, [qc]);
  return cfg;
}

export const qk = {
  health: (m: string) => ["health", m],
  overview: (m: string) => ["overview", m],
  jobs: (m: string, active?: boolean) => ["jobs", m, active],
  job: (m: string, id: string) => ["job", m, id],
  rules: (m: string, q?: string, s?: string) => ["rules", m, q, s],
  rule: (m: string, id: string) => ["rule", m, id],
  executions: (m: string, cve?: string) => ["executions", m, cve],
  events: (m: string, id: string) => ["events", m, id],
  history: (m: string, q: HistoryQuery) => ["history", m, q],
};

export function useHealth() {
  const { mode } = useApiConfig();
  return useQuery({ queryKey: qk.health(mode), queryFn: () => api().health(), refetchInterval: 30000, retry: 0 });
}
export function useOverview() {
  const { mode } = useApiConfig();
  return useQuery({ queryKey: qk.overview(mode), queryFn: () => api().getOverview(), refetchInterval: 10000 });
}
export function useJobs(activeOnly?: boolean) {
  const { mode, pollIntervalMs } = useApiConfig();
  return useQuery({ queryKey: qk.jobs(mode, activeOnly), queryFn: () => api().listJobs({ activeOnly, limit: 10 }), refetchInterval: pollIntervalMs });
}
export function useJob(id: string) {
  const { mode, pollIntervalMs } = useApiConfig();
  return useQuery({
    queryKey: qk.job(mode, id),
    queryFn: () => api().getJob(id),
    // Poll only while the backend reports a non-terminal state.
    refetchInterval: (q) => (q.state.data && isTerminal(q.state.data.status) ? false : pollIntervalMs),
  });
}
export function useRules(q?: string, state?: string) {
  const { mode } = useApiConfig();
  return useQuery({ queryKey: qk.rules(mode, q, state), queryFn: () => api().listRules({ q, state }) });
}
export function useRule(id?: string) {
  const { mode } = useApiConfig();
  return useQuery({ queryKey: qk.rule(mode, id ?? ""), queryFn: () => api().getRule(id!), enabled: !!id, retry: 1 });
}
export function useExecutions(cveId?: string) {
  const { mode } = useApiConfig();
  return useQuery({ queryKey: qk.executions(mode, cveId), queryFn: () => api().listExecutions({ cveId }) });
}
export function useEvents(id?: string) {
  const { mode } = useApiConfig();
  return useQuery({ queryKey: qk.events(mode, id ?? ""), queryFn: () => api().getExecutionEvents(id!), enabled: !!id });
}
export function useHistory(q: HistoryQuery) {
  const { mode } = useApiConfig();
  return useQuery({ queryKey: qk.history(mode, q), queryFn: () => api().searchHistory(q), placeholderData: (p) => p });
}
