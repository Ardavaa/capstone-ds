"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import AppIcon, { type IconName } from "@/app/components/AppIcon";
import {
  formatDuration,
  selectSession,
  STORAGE_KEYS,
  type SessionRecord,
} from "@/app/lib/analysis";

function scoreColor(score: number): string {
  return score >= 80 ? "#3a8377" : "#c9a227";
}

function subscribeToStorage(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getHistorySnapshot(): string {
  return localStorage.getItem(STORAGE_KEYS.history) ?? "";
}

function parseHistorySnapshot(snapshot: string): SessionRecord[] {
  if (!snapshot) return [];
  try {
    return JSON.parse(snapshot) as SessionRecord[];
  } catch {
    return [];
  }
}

type NavItemProps = { icon: IconName; label: string; active?: boolean; href?: string };

function NavItem({ icon, label, active = false, href }: NavItemProps) {
  const className = `flex cursor-pointer items-center gap-2.5 px-2.5 py-2.5 ${
    active ? "bg-[#0a0a0a]" : "hover:bg-black/5"
  }`;
  const content = (
    <>
      <AppIcon name={icon} className="size-3.5 shrink-0" />
      <span
        className={`text-[12px] uppercase tracking-[0.6px] ${
          active ? "text-[#faf7f2]" : "text-[#0a0a0a]"
        }`}
      >
        {label}
      </span>
    </>
  );
  if (href) {
    return <Link href={href} className={className}>{content}</Link>;
  }
  return <div className={className}>{content}</div>;
}

type StatCardProps = {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  trend: { icon: IconName; text: string };
  borderRight?: boolean;
};

function StatCard({ icon, label, value, unit, trend, borderRight = true }: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-2 bg-white p-5 ${
        borderRight ? "border-r border-[#0a0a0a]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <AppIcon name={icon} className="size-3.5" />
        <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">{label}</span>
      </div>

      <div className="flex items-baseline gap-1 py-2">
        <span className="text-[40px] font-bold leading-[40px] tracking-[-1.2px] text-[#0a0a0a]">
          {value}
        </span>
        {unit && (
          <span className="text-[14px] leading-[14px] text-[#bfbfbf]">{unit}</span>
        )}
      </div>

      <div className="flex items-center gap-1 self-start bg-[#d6e8e2] px-1.5 py-[3px]">
        <AppIcon name={trend.icon} className="size-2.5" />
        <span className="text-[10px] uppercase tracking-[1px] text-[#3a8377]">{trend.text}</span>
      </div>
    </div>
  );
}

function SessionRow({ session, isLast }: { session: SessionRecord; isLast: boolean }) {
  const r = session.result;
  const duration = formatDuration(r.delivery_metrics.duration_sec);
  const name =
    session.questionTopic.length > 40
      ? `${session.questionTopic.slice(0, 40)}…`
      : session.questionTopic;

  return (
    <Link
      href={`/report-cards?session=${encodeURIComponent(session.id)}`}
      onClick={() => selectSession(session)}
      className={`grid grid-cols-[1fr_140px_120px_80px_40px] items-center gap-x-4 px-5 py-4 hover:bg-black/2 ${
        !isLast ? "border-b border-[#0a0a0a]" : ""
      }`}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium uppercase tracking-[0.26px] text-[#0a0a0a]">
          {name}
        </span>
        <span className="text-[10px] tracking-[0.5px] text-[#bfbfbf]">
          {duration} · {r.file_name}
        </span>
      </div>

      <div>
        <span className="inline-block border border-[#3a8377] bg-[#d6e8e2] px-[11px] py-[5px] text-[10px] font-bold uppercase tracking-[1px] text-[#3a8377]">
          {session.categoryLabel ?? "SIMULATION"}
        </span>
      </div>

      <span className="text-[11px] tracking-[0.55px] text-[#0a0a0a]">{session.date}</span>

      <span
        className="text-[20px] font-bold tracking-[-0.4px]"
        style={{ color: scoreColor(r.final_score) }}
      >
        {r.final_score}
      </span>

      <div className="flex items-center">
        <AppIcon name="arrow-right" className="size-3.5" title="View session" />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const historySnapshot = useSyncExternalStore(
    subscribeToStorage,
    getHistorySnapshot,
    () => "",
  );
  const sessions = useMemo(
    () => parseHistorySnapshot(historySnapshot),
    [historySnapshot],
  );

  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        avgScore: "—",
        totalSessions: "0",
        avgFiller: "—",
        avgNonVerbal: "—",
        fillerTrend: "No data yet",
        sessionTrend: "Start a simulation",
      };
    }

    const scores = sessions.map((s) => s.result.final_score);
    const fillers = sessions.map((s) => s.result.delivery_metrics.filler_rate);
    const nonVerbals = sessions
      .filter((s) => s.result.video_emotion_metrics.frames_analyzed > 0)
      .map((s) => s.result.video_emotion_metrics.non_verbal_score);

    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const avgFiller = (
      fillers.reduce((a, b) => a + b, 0) / fillers.length
    ).toFixed(1);
    const avgNv =
      nonVerbals.length > 0
        ? Math.round(nonVerbals.reduce((a, b) => a + b, 0) / nonVerbals.length)
        : null;

    return {
      avgScore: String(avgScore),
      totalSessions: String(sessions.length),
      avgFiller,
      avgNonVerbal: avgNv !== null ? String(avgNv) : "N/A",
      fillerTrend: `${sessions.length} session${sessions.length !== 1 ? "s" : ""} recorded`,
      sessionTrend: "From your history",
    };
  }, [sessions]);

  const recent = sessions.slice(0, 4);

  return (
    <div className="flex h-full overflow-hidden border border-[#0a0a0a] bg-[#faf7f2]">
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#0a0a0a]">
        <div className="flex h-14 items-center gap-2.5 border-b border-[#0a0a0a] px-4">
          <div className="size-6 bg-[#0a0a0a]" />
          <span className="text-[14px] font-bold uppercase tracking-[0.7px] text-[#0a0a0a]">
            Lumen
          </span>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <div className="px-2 pb-1.5 pt-3">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Workspace</span>
          </div>
          <NavItem icon="dashboard" label="Dashboard" active href="/dashboard" />
          <NavItem icon="plus" label="New Simulation" href="/simulation/setup" />

          <div className="px-2 pb-1.5 pt-3.5">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Library</span>
          </div>
          <NavItem icon="clock" label="History" href="/history" />
          <NavItem icon="file" label="Report Cards" href="/report-cards" />

          <div className="px-2 pb-1.5 pt-3.5">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Account</span>
          </div>
          <NavItem icon="settings" label="Settings" />
        </nav>

        <div className="border-t border-[#0a0a0a] px-4 py-4">
          <button
            type="button"
            className="mb-3 flex h-9 w-full items-center justify-center border border-[#0a0a0a] bg-white hover:bg-black/5"
          >
            <AppIcon name="menu" className="size-3.5" title="Toggle sidebar" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center bg-[#0a0a0a]">
              <AppIcon name="user" className="size-3.5 text-[#faf7f2]" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#0a0a0a]">
                Local user
              </p>
              <p className="truncate text-[10px] text-[#bfbfbf]">Demo mode</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-10">
        <div className="flex items-end justify-between border-b border-[#0a0a0a] pb-5 pt-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-[36px] font-bold uppercase leading-[36px] tracking-[-1.08px] text-[#0a0a0a]">
              Dashboard
            </h1>
            <p className="text-[11px] uppercase tracking-[1.1px] text-[#bfbfbf]">
              {sessions.length > 0
                ? `[ ${sessions.length} simulation${sessions.length !== 1 ? "s" : ""} recorded ]`
                : "[ No simulations yet — start your first ]"}
            </p>
          </div>
          <Link
            href="/simulation/setup"
            className="flex items-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-6 py-[15px] hover:bg-[#1a1a1a]"
          >
            <AppIcon name="plus" className="size-4 text-[#faf7f2]" />
            <span className="text-[13px] font-medium uppercase tracking-[1.3px] text-[#faf7f2]">
              New simulation
            </span>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-4 border border-[#0a0a0a]">
          <StatCard
            label="Avg Score"
            value={stats.avgScore}
            unit={stats.avgScore !== "—" ? "/100" : undefined}
            icon="target"
            trend={{ icon: "arrow-up", text: stats.sessionTrend }}
          />
          <StatCard
            icon="chart"
            label="Sessions"
            value={stats.totalSessions}
            trend={{ icon: "arrow-up", text: stats.fillerTrend }}
          />
          <StatCard
            icon="activity"
            label="Filler Rate"
            value={stats.avgFiller}
            unit={stats.avgFiller !== "—" ? "%" : undefined}
            trend={{ icon: "arrow-down", text: "Avg across sessions" }}
          />
          <StatCard
            icon="eye"
            label="Avg Non-Verbal"
            value={stats.avgNonVerbal}
            unit={stats.avgNonVerbal !== "N/A" && stats.avgNonVerbal !== "—" ? "/100" : undefined}
            trend={{ icon: "arrow-up", text: "YOLOv8 facial emotion" }}
            borderRight={false}
          />
        </div>

        <div className="mt-10 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold uppercase tracking-[-0.18px] text-[#0a0a0a]">
              [ Recent sessions ]
            </h2>
            <Link
              href="/history"
              className="text-[11px] uppercase tracking-[1.1px] text-[#0a0a0a] underline"
            >
              View all →
            </Link>
          </div>

          <div className="mt-4 border border-[#0a0a0a] bg-white">
            <div className="grid grid-cols-[1fr_140px_120px_80px_40px] items-center gap-x-4 border-b border-[#0a0a0a] bg-[#0a0a0a] px-5 py-2.5">
              {(["Session", "Category", "Date", "Score", ""] as const).map((heading) => (
                <span
                  key={heading}
                  className="text-[10px] uppercase tracking-[1.5px] text-[#faf7f2]"
                >
                  {heading}
                </span>
              ))}
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <p className="text-[12px] uppercase tracking-[1.5px] text-[#bfbfbf]">
                  No sessions yet
                </p>
                <Link
                  href="/simulation/setup"
                  className="border border-[#0a0a0a] bg-[#0a0a0a] px-5 py-2 text-[11px] uppercase tracking-[1px] text-[#faf7f2]"
                >
                  Start your first simulation
                </Link>
              </div>
            ) : (
              recent.map((session, i) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isLast={i === recent.length - 1}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
