import { formatDistanceToNowStrict } from "date-fns";

export const CVE_REGEX = /^CVE-\d{4}-\d{4,}$/;

export function validateCve(v: string): string | null {
  const s = v.trim().toUpperCase();
  if (!s) return "Enter a CVE identifier.";
  if (!CVE_REGEX.test(s)) return "Invalid format. Expected CVE-YYYY-NNNN (4+ digit sequence), e.g. CVE-2025-12345.";
  const year = Number(s.slice(4, 8));
  if (year < 1999 || year > new Date().getFullYear() + 1) return `Year ${year} is outside the valid CVE range.`;
  return null;
}

export function formatDuration(ms?: number | null): string {
  if (ms == null || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function durationBetween(start?: string, end?: string) {
  if (!start) return undefined;
  return (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
}

export function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function relTime(iso?: string) {
  if (!iso) return "—";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}
