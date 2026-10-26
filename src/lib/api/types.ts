// Typed contract between the UI and the backend. Both the mock adapter and the
// HTTP adapter implement `ApiAdapter`. Adjust these types once the real backend
// schema is confirmed — UI code only depends on this file.

export type KnownJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
// Backend may define additional states; keep them renderable.
export type JobStatus = KnownJobStatus | (string & {});
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled" | (string & {});

export interface LogEntry {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  step?: string;
}

export interface ErrorInfo {
  message: string;
  code?: string;
  detail?: string;
}

export interface PipelineStep {
  id: string;
  name: string;
  status: StepStatus;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  logs?: LogEntry[];
  error?: ErrorInfo;
}

export interface Job {
  id: string;
  cveId: string;
  status: JobStatus;
  stage?: string;
  /** 0-100 when provided by backend; null when unknown. Never estimated by the UI. */
  progress?: number | null;
  startedAt: string;
  endedAt?: string;
  ruleId?: string;
  executionIds: string[];
  capabilities?: { retry?: boolean; cancel?: boolean };
}

export interface JobDetail extends Job {
  steps: PipelineStep[];
  metadata?: Record<string, unknown>;
}

export type RuleState = "generated" | "validated" | "reviewed" | "deployed";

export interface ValidationIssue {
  path?: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ValidationResult {
  valid: boolean;
  validator?: string;
  checkedAt: string;
  issues: ValidationIssue[];
}

export interface SigmaFields {
  title?: string;
  id?: string;
  status?: string;
  description?: string;
  references?: string[];
  author?: string;
  date?: string;
  tags?: string[];
  logsource?: Record<string, string>;
  detection?: unknown;
  falsepositives?: string[];
  level?: string;
}

export interface RuleVersion {
  version: number;
  createdAt: string;
  yaml: string;
}

export interface SigmaRule {
  id: string;
  cveId: string;
  jobId: string;
  executionId?: string;
  state: RuleState;
  yaml: string;
  fields: SigmaFields;
  validation?: ValidationResult;
  createdAt: string;
  versions?: RuleVersion[];
}

export type TraceEventType =
  | "user_message"
  | "assistant_message"
  | "tool_call"
  | "tool_result"
  | "step"
  | "validation"
  | "error"
  | "final_output"
  | (string & {});

export interface TraceEvent {
  id: string;
  executionId: string;
  type: TraceEventType;
  ts: string;
  durationMs?: number;
  status?: "ok" | "error" | "pending";
  toolName?: string;
  title?: string;
  content?: string;
  input?: unknown;
  output?: unknown;
  error?: ErrorInfo;
}

export interface Execution {
  id: string;
  jobId: string;
  cveId: string;
  ruleId?: string;
  model?: string;
  status: JobStatus;
  startedAt: string;
  endedAt?: string;
  eventCount: number;
}

export interface Overview {
  totals: { processed: number; running: number; rulesGenerated: number; failed: number };
  stageSummary: { label: string; status: JobStatus; count: number }[];
  recentJobs: Job[];
  recentRules: SigmaRule[];
}

export interface HistoryQuery {
  cveId?: string;
  status?: string;
  from?: string;
  to?: string;
  outcome?: "" | "rule" | "no_rule";
  executionId?: string;
  page: number;
  pageSize: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HealthStatus {
  ok: boolean;
  mode: "mock" | "live";
  latencyMs?: number;
  version?: string;
}

export interface ApiAdapter {
  mode: "mock" | "live";
  health(): Promise<HealthStatus>;
  getOverview(): Promise<Overview>;
  submitCve(cveId: string): Promise<{ jobId: string }>;
  listJobs(params?: { limit?: number; activeOnly?: boolean }): Promise<Job[]>;
  getJob(jobId: string): Promise<JobDetail>;
  cancelJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<{ jobId: string }>;
  listRules(params?: { q?: string; state?: string }): Promise<SigmaRule[]>;
  getRule(ruleId: string): Promise<SigmaRule>;
  listExecutions(params?: { cveId?: string; q?: string }): Promise<Execution[]>;
  getExecutionEvents(executionId: string): Promise<TraceEvent[]>;
  searchHistory(q: HistoryQuery): Promise<Paged<Job>>;
  /** Optional — only present when the backend exposes an analysis endpoint. */
  analyzeExecution?: (executionId: string, question: string) => Promise<{ answer: string }>;
}

export const TERMINAL_STATUSES = ["completed", "failed", "cancelled"];
export const isTerminal = (s: string) => TERMINAL_STATUSES.includes(s);
