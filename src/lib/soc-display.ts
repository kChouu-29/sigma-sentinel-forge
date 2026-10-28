import type { Job, SigmaRule } from "./api/types";

export function latestCveWorkflows(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return [...jobs]
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .filter((job) => {
      if (seen.has(job.cveId)) return false;
      seen.add(job.cveId);
      return true;
    })
    .slice(0, 10);
}

export function groupRulesByCve(rules: SigmaRule[]): { cveId: string; rules: SigmaRule[] }[] {
  const groups = new Map<string, SigmaRule[]>();
  for (const rule of rules) {
    const siblings = groups.get(rule.cveId);
    if (siblings) siblings.push(rule);
    else groups.set(rule.cveId, [rule]);
  }
  return Array.from(groups, ([cveId, entries]) => ({ cveId, rules: entries }));
}