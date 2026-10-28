// MOCK ADAPTER — simulates a backend in-memory for UI development.
// All data here is synthetic. It is only used when Settings → API mode is "mock".
import type {
  ApiAdapter, Execution, Job, JobDetail, JobStatus, LogEntry, PipelineStep, RuleState,
  SigmaRule, TraceEvent,
} from "./types";
import { isTerminal } from "./types";

const STEP_DEFS = [
  { id: "fetch", name: "Fetch CVE record", tool: "nvd.lookup" },
  { id: "enrich", name: "Enrich threat context", tool: "intel.search" },
  { id: "attack", name: "Map ATT&CK techniques", tool: "attack.map" },
  { id: "generate", name: "Generate Sigma rule", tool: "llm.generate" },
  { id: "validate", name: "Validate rule", tool: "sigma.check" },
  { id: "persist", name: "Persist artifacts", tool: "store.save" },
];
const QUEUE_MS = 2000;

interface Seed {
  id: string;
  cveId: string;
  startedAt: number;
  durations: number[];
  failAt?: number;
  cancelledAt?: number;
  ruleState: RuleState;
}

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CVES = [
  "CVE-2025-21298", "CVE-2025-0282", "CVE-2024-3400", "CVE-2025-24813", "CVE-2024-55956",
  "CVE-2025-22457", "CVE-2024-21762", "CVE-2025-1974", "CVE-2024-49113", "CVE-2025-29927",
  "CVE-2024-38063", "CVE-2025-30406", "CVE-2024-47575", "CVE-2025-31324", "CVE-2024-6387",
  "CVE-2025-26633", "CVE-2024-4577", "CVE-2025-33053",
];

const seeds: Seed[] = [];
const loadTime = Date.now();
(() => {
  const r = rng(42);
  for (let i = 0; i < 46; i++) {
    const durations = STEP_DEFS.map((d) => Math.round((d.id === "generate" ? 9000 : 2500) + r() * 5000));
    const total = QUEUE_MS + durations.reduce((a, b) => a + b, 0);
    const live = i < 2; // two jobs actively running in the simulation
    const startedAt = live ? loadTime - 4000 - i * 6000 : loadTime - (i + 1) * 3.4 * 3600_000 - r() * 3600_000;
    const roll = r();
    const s: Seed = {
      id: `job_${(0x7a3f00 + i * 7919).toString(16)}`,
      cveId: CVES[Math.floor(r() * CVES.length)],
      startedAt,
      durations: live ? durations : durations.map((d) => d * 3),
      ruleState: (["generated", "validated", "reviewed", "deployed"] as RuleState[])[Math.floor(r() * 4)],
    };
    if (!live && roll < 0.15) s.failAt = r() < 0.5 ? 4 : 0;
    else if (!live && roll < 0.2) s.cancelledAt = startedAt + total * 3 * 0.4;
    seeds.push(s);
  }
})();

const iso = (t: number) => new Date(t).toISOString();

function logsFor(s: Seed, i: number, start: number, failed: boolean): LogEntry[] {
  const def = STEP_DEFS[i];
  const base: LogEntry[] = [
    { ts: iso(start), level: "info", message: `[${def.tool}] starting for ${s.cveId}`, step: def.id },
    { ts: iso(start + 400), level: "debug", message: `request_id=${s.id}-${def.id} attempt=1`, step: def.id },
  ];
  if (failed) base.push({ ts: iso(start + 900), level: "error", message: failMsg(i), step: def.id });
  else base.push({ ts: iso(start + 900), level: "info", message: `[${def.tool}] completed`, step: def.id });
  return base;
}
function failMsg(i: number) {
  return i === 0 ? "NVD API returned 404: CVE record not found or not yet published" :
    "sigma check: detection.condition references undefined selection 'selection_cmd'";
}

function stepIO(s: Seed, i: number) {
  switch (STEP_DEFS[i].id) {
    case "fetch": return { input: { cve_id: s.cveId, source: "nvd" }, output: { cvss: 9.8, cwe: "CWE-78", published: "2025-01-14", vendor: "Example Corp" } };
    case "enrich": return { input: { cve_id: s.cveId }, output: { exploits_public: true, kev_listed: true, sources: 4 } };
    case "attack": return { input: { cwe: "CWE-78" }, output: { techniques: ["T1059.001", "T1190"] } };
    case "generate": return { input: { model: "mock-llm-1", techniques: ["T1059.001", "T1190"] }, output: { rule_id: ruleUuid(s), tokens: 1834 } };
    case "validate": return { input: { rule_id: ruleUuid(s) }, output: { valid: s.failAt !== 4, warnings: 1 } };
    default: return { input: { rule_id: ruleUuid(s) }, output: { stored: true } };
  }
}

function ruleUuid(s: Seed) {
  const h = s.id.replace("job_", "").padStart(8, "0");
  return `${h}-4c1e-4b7a-9f2d-${h}a1b2`.slice(0, 36);
}

function materialize(s: Seed, now = Date.now()): JobDetail {
  const steps: PipelineStep[] = [];
  let status: JobStatus = now - s.startedAt < QUEUE_MS ? "queued" : "running";
  let stage: string | undefined = status === "queued" ? "Queued" : undefined;
  let endedAt: number | undefined;
  let blocked = status === "queued";
  let terminal = false;
  let t = s.startedAt + QUEUE_MS;
  let done = 0;

  STEP_DEFS.forEach((def, i) => {
    const d = s.durations[i];
    const end = t + d;
    const startT = t;
    t = end;
    if (terminal) return steps.push({ id: def.id, name: def.name, status: "skipped" });
    if (blocked || now < startT) { blocked = true; return steps.push({ id: def.id, name: def.name, status: "pending" }); }
    const io = stepIO(s, i);
    if (s.cancelledAt && s.cancelledAt < end && now >= s.cancelledAt) {
      terminal = true; status = "cancelled"; endedAt = s.cancelledAt; stage = def.name;
      return steps.push({ id: def.id, name: def.name, status: "cancelled", startedAt: iso(startT), endedAt: iso(s.cancelledAt), durationMs: s.cancelledAt - startT, input: io.input, logs: logsFor(s, i, startT, false).slice(0, 2), error: { message: "Cancelled by analyst" } });
    }
    if (now < end) {
      blocked = true; stage = def.name;
      return steps.push({ id: def.id, name: def.name, status: "running", startedAt: iso(startT), input: io.input, logs: logsFor(s, i, startT, false).slice(0, 2) });
    }
    if (s.failAt === i) {
      terminal = true; status = "failed"; endedAt = end; stage = def.name;
      return steps.push({ id: def.id, name: def.name, status: "failed", startedAt: iso(startT), endedAt: iso(end), durationMs: d, input: io.input, logs: logsFor(s, i, startT, true), error: { message: failMsg(i), code: i === 0 ? "SOURCE_NOT_FOUND" : "VALIDATION_FAILED" } });
    }
    done++;
    return steps.push({ id: def.id, name: def.name, status: "completed", startedAt: iso(startT), endedAt: iso(end), durationMs: d, input: io.input, output: io.output, logs: logsFor(s, i, startT, false) });
  });

  if (!terminal && !blocked) { status = "completed"; endedAt = t; stage = "Completed"; }
  const hasRule = status === "completed" || (status === "failed" && s.failAt === 4);
  return {
    id: s.id,
    cveId: s.cveId,
    status,
    stage,
    progress: Math.round((done / STEP_DEFS.length) * 100),
    startedAt: iso(s.startedAt),
    endedAt: endedAt ? iso(endedAt) : undefined,
    ruleId: hasRule ? `rule_${s.id.slice(4)}` : undefined,
    executionIds: [`exec_${s.id.slice(4)}`],
    capabilities: { cancel: !isTerminal(status), retry: status === "failed" || status === "cancelled" },
    steps,
    metadata: { pipeline_version: "mock-0.4.1", model: "mock-llm-1", worker: "mock-worker-02", source: "MOCK ADAPTER", attempts: 1 },
  };
}

function ruleFor(s: Seed, job: JobDetail): SigmaRule | undefined {
  if (!job.ruleId) return undefined;
  const failedValidation = job.status === "failed";
  const state: RuleState = failedValidation ? "generated" : s.ruleState;
  const uuid = ruleUuid(s);
  const date = job.startedAt.slice(0, 10).replace(/-/g, "/");
  const title = `Suspicious Child Process Spawned via ${s.cveId} Exploitation`;
  const selection = failedValidation ? "selection_cmd" : "selection";
  const yaml = `title: ${title}
id: ${uuid}
status: ${state === "deployed" ? "stable" : "experimental"}
description: |
  Detects process creation patterns associated with exploitation of ${s.cveId},
  where the vulnerable service spawns a command interpreter.
references:
  - https://nvd.nist.gov/vuln/detail/${s.cveId}
author: SOC AI Pipeline (mock)
date: ${date}
tags:
  - attack.execution
  - attack.t1059.001
  - attack.initial-access
  - attack.t1190
  - ${s.cveId.toLowerCase().replace(/-/g, ".")}
logsource:
  category: process_creation
  product: windows
detection:
  selection_parent:
    ParentImage|endswith:
      - '\\w3wp.exe'
      - '\\httpd.exe'
  selection_child:
    Image|endswith:
      - '\\powershell.exe'
      - '\\cmd.exe'
    CommandLine|contains:
      - ' -enc '
      - 'IEX('
  condition: ${selection}_parent and selection_child
falsepositives:
  - Administrative scripts executed by web application maintenance tasks
level: high
`;
  const issues = failedValidation
    ? [{ path: "detection.condition", message: "Undefined selection 'selection_cmd_parent'", severity: "error" as const }]
    : [{ path: "falsepositives", message: "Consider narrowing false positive guidance", severity: "warning" as const }];
  return {
    id: job.ruleId,
    cveId: s.cveId,
    jobId: s.id,
    executionId: job.executionIds[0],
    state,
    yaml,
    createdAt: job.endedAt ?? job.startedAt,
    fields: {
      title, id: uuid, status: state === "deployed" ? "stable" : "experimental",
      description: `Detects process creation patterns associated with exploitation of ${s.cveId}.`,
      references: [`https://nvd.nist.gov/vuln/detail/${s.cveId}`],
      author: "SOC AI Pipeline (mock)", date,
      tags: ["attack.execution", "attack.t1059.001", "attack.initial-access", "attack.t1190"],
      logsource: { category: "process_creation", product: "windows" },
      falsepositives: ["Administrative scripts executed by web application maintenance tasks"],
      level: "high",
    },
    validation: { valid: !failedValidation, validator: "sigma-cli 1.0 (mock)", checkedAt: job.endedAt ?? job.startedAt, issues },
    versions: state === "reviewed" || state === "deployed"
      ? [{ version: 1, createdAt: job.startedAt, yaml: yaml.replace("level: high", "level: medium").replace("      - 'IEX('\n", "") }, { version: 2, createdAt: job.endedAt ?? job.startedAt, yaml }]
      : undefined,
  };
}

function eventsFor(s: Seed, job: JobDetail): TraceEvent[] {
  const ex = job.executionIds[0];
  const ev: TraceEvent[] = [];
  let n = 0;
  const push = (e: Omit<TraceEvent, "id" | "executionId">) => ev.push({ id: `${ex}_ev${n++}`, executionId: ex, ...e });
  push({ type: "user_message", ts: job.startedAt, title: "Pipeline request", content: `Generate a Sigma detection rule for ${s.cveId}. Use NVD data, public exploit intel and map to ATT&CK.`, status: "ok" });
  for (const st of job.steps) {
    if (!st.startedAt) continue;
    const def = STEP_DEFS.find((d) => d.id === st.id)!;
    push({ type: "step", ts: st.startedAt, title: st.name, status: st.status === "failed" ? "error" : st.status === "running" ? "pending" : "ok", durationMs: st.durationMs });
    push({ type: "tool_call", ts: st.startedAt, toolName: def.tool, title: `Call ${def.tool}`, input: st.input, status: "ok" });
    if (st.status === "completed") {
      push({ type: "tool_result", ts: st.endedAt!, toolName: def.tool, title: `${def.tool} result`, output: st.output, durationMs: st.durationMs, status: "ok" });
      if (st.id === "generate") push({ type: "assistant_message", ts: st.endedAt!, title: "Assistant", content: `Drafted a process_creation rule targeting interpreter spawns from web server parents. Mapped to T1059.001 and T1190. Level set to high given KEV listing.`, status: "ok" });
    }
    if (st.id === "validate" && (st.status === "completed" || st.status === "failed"))
      push({ type: "validation", ts: st.endedAt!, title: "Rule validation", status: st.status === "failed" ? "error" : "ok", output: st.output ?? { valid: false } });
    if (st.status === "failed") push({ type: "error", ts: st.endedAt!, title: st.error?.code ?? "Error", error: st.error, status: "error" });
  }
  if (job.status === "completed") push({ type: "final_output", ts: job.endedAt!, title: "Final output", content: `Rule ${job.ruleId} persisted.`, output: { rule_id: job.ruleId }, status: "ok" });
  return ev;
}

const delay = (ms = 250 + Math.random() * 300) => new Promise((r) => setTimeout(r, ms));
const findSeed = (id: string) => {
  const s = seeds.find((x) => x.id === id || `exec_${x.id.slice(4)}` === id || `rule_${x.id.slice(4)}` === id);
  if (!s) throw new Error(`Not found: ${id}`);
  return s;
};
const all = () => seeds.map((s) => materialize(s)).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
const strip = ({ steps: _s, metadata: _m, ...j }: JobDetail): Job => j;

export const mockAdapter: ApiAdapter = {
  mode: "mock",
  async health() { await delay(80); return { ok: true, mode: "mock", latencyMs: 0, version: "mock" }; },
  async getOverview() {
    await delay();
    const jobs = all();
    const rules = seeds.map((s) => ruleFor(s, materialize(s))).filter(Boolean) as SigmaRule[];
    const count = (st: string) => jobs.filter((j) => j.status === st).length;
    return {
      totals: { processed: jobs.length, running: count("running") + count("queued"), rulesGenerated: rules.length, failed: count("failed") },
      stageSummary: (["queued", "running", "completed", "failed", "cancelled"] as const).map((st) => ({ label: st, status: st, count: count(st) })),
      recentJobs: jobs.slice(0, 12).map(strip),
      recentRules: rules.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12),
    };
  },
  async submitCve(cveId) {
    await delay(600);
    const r = rng(Date.now());
    const s: Seed = {
      id: `job_${Math.floor(Date.now() / 10).toString(16).slice(-6)}`,
      cveId,
      startedAt: Date.now(),
      durations: STEP_DEFS.map((d) => Math.round((d.id === "generate" ? 8000 : 2500) + r() * 3000)),
      ruleState: "generated",
    };
    seeds.unshift(s);
    return { jobId: s.id };
  },
  async listJobs(p) {
    await delay();
    let jobs = all();
    if (p?.activeOnly) jobs = jobs.filter((j) => !isTerminal(j.status));
    return jobs.slice(0, p?.limit ?? 50).map(strip);
  },
  async getJob(id) { await delay(150); return materialize(findSeed(id)); },
  async cancelJob(id) { await delay(); findSeed(id).cancelledAt = Date.now(); },
  async retryJob(id) { const s = findSeed(id); return mockAdapter.submitCve(s.cveId); },
  async listRules(p) {
    await delay();
    let rules = seeds.map((s) => ruleFor(s, materialize(s))).filter(Boolean) as SigmaRule[];
    if (p?.state) rules = rules.filter((r) => r.state === p.state);
    if (p?.q) { const q = p.q.toLowerCase(); rules = rules.filter((r) => (r.cveId + r.fields.title + r.id).toLowerCase().includes(q)); }
    return rules.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getRule(id) {
    await delay();
    const s = findSeed(id);
    const r = ruleFor(s, materialize(s));
    if (!r) throw new Error("Rule not found for this job");
    return r;
  },
  async listExecutions(p) {
    await delay();
    return all()
      .filter((j) => !p?.cveId || j.cveId === p.cveId)
      .filter((j) => !p?.q || (j.cveId + j.id).toLowerCase().includes(p.q.toLowerCase()))
      .map<Execution>((j) => ({
        id: j.executionIds[0], jobId: j.id, cveId: j.cveId, ruleId: j.ruleId, model: "mock-llm-1",
        status: j.status, startedAt: j.startedAt, endedAt: j.endedAt, eventCount: eventsFor(findSeed(j.id), j).length,
      }));
  },
  async getExecutionEvents(id) { await delay(); const s = findSeed(id); return eventsFor(s, materialize(s)); },
  async searchHistory(q) {
    await delay();
    let jobs = all();
    if (q.cveId) jobs = jobs.filter((j) => j.cveId.toLowerCase().includes(q.cveId!.toLowerCase()));
    if (q.status) jobs = jobs.filter((j) => j.status === q.status);
    if (q.executionId) jobs = jobs.filter((j) => j.executionIds.some((e) => e.includes(q.executionId!)));
    if (q.outcome === "rule") jobs = jobs.filter((j) => j.ruleId);
    if (q.outcome === "no_rule") jobs = jobs.filter((j) => !j.ruleId);
    if (q.from) jobs = jobs.filter((j) => j.startedAt >= q.from!);
    if (q.to) jobs = jobs.filter((j) => j.startedAt.slice(0, 10) <= q.to!);
    const start = (q.page - 1) * q.pageSize;
    return { items: jobs.slice(start, start + q.pageSize).map(strip), total: jobs.length, page: q.page, pageSize: q.pageSize };
  },
  async analyzeExecution(id, question) {
    await delay(900);
    const s = findSeed(id);
    const j = materialize(s);
    const failed = j.steps.find((x) => x.status === "failed");
    return {
      answer: `[Mock analysis — not generated by a model]\nQuestion: "${question}"\n\nExecution ${id} for ${s.cveId} is ${j.status}. ${failed ? `It failed at "${failed.name}": ${failed.error?.message}.` : `${j.steps.filter((x) => x.status === "completed").length}/${j.steps.length} steps completed.`}`,
    };
  },
};
