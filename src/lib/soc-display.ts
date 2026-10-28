import type { Job, SigmaRule } from "./api/types";

/** Presentation cap: every list shows at most this many records. */
export const MAX_ROWS = 10;

export function latestCveWorkflows(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return [...jobs]
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .filter((job) => {
      if (seen.has(job.cveId)) return false;
      seen.add(job.cveId);
      return true;
    })
    .slice(0, MAX_ROWS);
}

/** Groups rules by CVE (each CVE keeps all its rules) and caps the list at MAX_ROWS CVEs. */
export function groupRulesByCve(rules: SigmaRule[], maxCves = MAX_ROWS): { cveId: string; rules: SigmaRule[] }[] {
  const groups = new Map<string, SigmaRule[]>();
  for (const rule of rules) {
    const siblings = groups.get(rule.cveId);
    if (siblings) siblings.push(rule);
    else groups.set(rule.cveId, [rule]);
  }
  return Array.from(groups, ([cveId, entries]) => ({ cveId, rules: entries })).slice(0, maxCves);
}
