import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BrainCircuit, FileCode2, History, LayoutDashboard, Menu, Settings, ShieldHalf, Workflow, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApiConfig, useHealth } from "@/lib/queries";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/pipeline", label: "CVE Pipeline", icon: Workflow },
  { to: "/rules", label: "Sigma Rules", icon: FileCode2 },
  { to: "/traces", label: "AI Traces", icon: BrainCircuit },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function ConnectionStatus() {
  const { mode } = useApiConfig();
  const { data, isError, isLoading } = useHealth();
  const state = isLoading ? "checking" : isError || !data?.ok ? "offline" : "online";
  const dot = state === "online" ? (mode === "mock" ? "bg-warning" : "bg-success") : state === "offline" ? "bg-danger" : "bg-muted-foreground";
  return (
    <Link to="/settings" className="block rounded-md border bg-background/50 p-2.5 text-xs hover:border-primary/40">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
        <span className="font-medium">{mode === "mock" ? "Mock adapter" : "Live backend"}</span>
      </div>
      <p className="mt-1 text-muted-foreground">
        {state === "checking" ? "Checking connection…" : state === "offline" ? "Unreachable" : mode === "mock" ? "Synthetic data only" : `Connected · ${data?.latencyMs}ms`}
      </p>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const active = (to: string) => (to === "/" ? path === "/" : path.startsWith(to) || (to === "/pipeline" && path.startsWith("/jobs")));

  const nav = (
    <div className="flex h-full flex-col gap-4 p-3">
      <Link to="/" className="flex items-center gap-2 px-2 py-1.5" onClick={() => setOpen(false)}>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary"><ShieldHalf className="h-4 w-4" /></span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">SigmaForge</span>
          <span className="block font-mono text-[10px] text-muted-foreground">SOC detection console</span>
        </span>
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
            className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              active(n.to) ? "bg-sidebar-accent font-medium text-foreground shadow-[inset_2px_0_0_var(--primary)]" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground")}>
            <n.icon className={cn("h-4 w-4", active(n.to) && "text-primary")} />{n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto space-y-2">
        <ConnectionStatus />
        <p className="flex items-center gap-1.5 px-1 font-mono text-[10px] text-muted-foreground"><Activity className="h-3 w-3" />v0.1 · frontend</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-sidebar lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 border-r bg-sidebar">
            <button aria-label="Close menu" className="absolute right-2 top-3 p-1 text-muted-foreground" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            {nav}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b px-4 lg:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="p-1"><Menu className="h-5 w-5" /></button>
          <span className="text-sm font-semibold">SigmaForge</span>
        </div>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
