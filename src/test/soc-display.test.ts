import { describe, expect, it } from "vitest";
import type { Job, SigmaRule } from "@/lib/api/types";
import { groupRulesByCve, latestCveWorkflows } from "@/lib/soc-display";

const job = (n: number, cveId = `CVE-2026-${1000 + n}`): Job => ({
  id: `workflow-${n}`, cveId, status: "completed",
  startedAt: new Date(Date.UTC(2026, 9, 28, 0, n)).toISOString(), executionIds: [],
});
const rule = (id: string, cveId: string): SigmaRule => ({
  id, cveId, jobId: "workflow-1", state: "generated", yaml: "", fields: {},
  createdAt: "2026-10-28T00:00:00Z",
});

describe("SOC display rules", () => {
  it("keeps at most 10 latest distinct CVEs and their newest workflow", () => {
    const jobs = Array.from({ length: 12 }, (_, n) => job(n));
    jobs.push(job(13, "CVE-2026-1000"));
    const result = latestCveWorkflows(jobs);
    expect(result).toHaveLength(10);
    expect(result.map((j) => j.id)).toEqual([
      "workflow-13", "workflow-11", "workflow-10", "workflow-9", "workflow-8",
      "workflow-7", "workflow-6", "workflow-5", "workflow-4", "workflow-3",
    ]);
    expect(new Set(result.map((j) => j.cveId)).size).toBe(10);
    expect(jobs).toHaveLength(13);
  });

  it("preserves multiple rules and their workflow IDs within each CVE", () => {
    const rules = [rule("rule-a", "CVE-2026-1000"), rule("rule-b", "CVE-2026-2000"),
      { ...rule("rule-c", "CVE-2026-1000"), jobId: "workflow-2" }];
    expect(groupRulesByCve(rules)).toEqual([
      { cveId: "CVE-2026-1000", rules: [rules[0], rules[2]] },
      { cveId: "CVE-2026-2000", rules: [rules[1]] },
    ]);
    expect(groupRulesByCve([])).toEqual([]);
  });
});