import { describe, expect, it } from "vitest";
import type { Job, SigmaRule } from "@/lib/api/types";
import { countRuleStates, groupRulesByCve, latestCveWorkflows } from "@/lib/soc-display";

const job = (n: number, cveId = `CVE-2026-${1000 + n}`): Job => ({
  id: `workflow-${n}`, cveId, status: "completed",
  startedAt: new Date(Date.UTC(2026, 9, 28, 0, n)).toISOString(), executionIds: [],
});
const rule = (id: string, cveId: string): SigmaRule => ({
  id, cveId, jobId: "workflow-1", state: "generated", yaml: "", fields: {},
  createdAt: "2026-10-28T00:00:00Z",
});

describe("SOC display rules", () => {
  it("counts Generated, Validated, Reviewed and Published using each rule's reported state", () => {
    const rules: SigmaRule[] = [
      rule("a", "CVE-2026-1000"), rule("b", "CVE-2026-1000"),
      { ...rule("c", "CVE-2026-1000"), state: "validated" },
      { ...rule("d", "CVE-2026-1000"), state: "reviewed" },
      { ...rule("e", "CVE-2026-1000"), state: "deployed" },
    ];
    expect(countRuleStates(rules)).toEqual({ generated: 2, validated: 1, reviewed: 1, deployed: 1 });
    expect(countRuleStates([])).toEqual({ generated: 0, validated: 0, reviewed: 0, deployed: 0 });
    expect(rules[4].state).toBe("deployed");
  });
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

  it("shows at most 10 CVE groups while keeping every rule inside each group", () => {
    const rules = Array.from({ length: 12 }, (_, n) => rule(`rule-${n}`, `CVE-2026-${1000 + n}`));
    rules.push(...[rule("rule-x1", "CVE-2026-1000"), rule("rule-x2", "CVE-2026-1000")]);
    const result = groupRulesByCve(rules);
    expect(result).toHaveLength(10);
    expect(result[0].rules).toHaveLength(3);
    expect(result.every((g) => g.rules.length > 0)).toBe(true);
  });
});