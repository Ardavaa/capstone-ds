"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useEffect } from "react";

import AppIcon from "@/app/components/AppIcon";
import {
  formatDuration,
  selectSession,
  STORAGE_KEYS,
  fetchUserHistoryFromDB,
  deleteSessionHistoryFromDB,
  type SessionRecord,
} from "@/app/lib/analysis";
import { Sidebar } from "@/app/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

function sessionTrend(
  sessions: SessionRecord[],
  index: number,
): "up" | "down" | "same" {
  if (index >= sessions.length - 1) return "same";
  const current = sessions[index].result.final_score;
  const older = sessions[index + 1].result.final_score;
  if (current > older) return "up";
  if (current < older) return "down";
  return "same";
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: "up" | "down" | "same" }) {
  if (trend === "up")   return <span className="text-[10px] text-[#3a8377]">↑</span>;
  if (trend === "down") return <span className="text-[10px] text-[#c75240]">↓</span>;
  return <span className="text-[10px] text-[#bfbfbf]">—</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#3a8377" : score >= 70 ? "#c9a227" : "#c75240";
  return (
    <div className="relative h-[3px] w-[60px] bg-[#e8e4dc]">
      <div className="absolute inset-y-0 left-0" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  async function handleDelete(record: SessionRecord) {
    if (!confirm("Are you sure you want to delete this session? This cannot be undone.")) return;
    setIsDeleting(record.id);
    const success = await deleteSessionHistoryFromDB(record);
    if (!success) {
      alert("Failed to delete session.");
    }
    setIsDeleting(null);
  }

  useEffect(() => {
    fetchUserHistoryFromDB().catch(console.error);
  }, []);

  const historySnapshot = useSyncExternalStore(
    subscribeToStorage,
    getHistorySnapshot,
    () => "",
  );
  const sessions = useMemo(
    () => parseHistorySnapshot(historySnapshot),
    [historySnapshot],
  );

  const visible = useMemo(() => {
    return sessions.filter((s) =>
      s.questionTopic.toLowerCase().includes(search.toLowerCase()),
    );
  }, [sessions, search]);

  const summary = useMemo(() => {
    if (sessions.length === 0) {
      return { avgScore: "—", best: "—", total: "0", avgDuration: "—" };
    }
    const scores = sessions.map((s) => s.result.final_score);
    const durations = sessions.map((s) => s.result.delivery_metrics.duration_sec);
    const avgSec = durations.reduce((a, b) => a + b, 0) / durations.length;
    return {
      avgScore: String(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)),
      best: String(Math.max(...scores)),
      total: String(sessions.length),
      avgDuration: formatDuration(avgSec),
    };
  }, [sessions]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#faf7f2]">
      <Sidebar />

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto px-10 pb-10">
        {/* Header */}
        <div className="flex items-end justify-between border-b border-[#0a0a0a] pb-5 pt-8">
          <div>
            <h1 className="text-[36px] font-bold uppercase leading-none tracking-[-1.08px] text-[#0a0a0a]">
              Session History
            </h1>
            <p className="mt-2 text-[11px] uppercase tracking-[1.1px] text-[#bfbfbf]">
              [ {sessions.length} session{sessions.length !== 1 ? "s" : ""} · Sorted by date ]
            </p>
          </div>
          <Link
            href="/simulation/setup"
            className="flex items-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-6 py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#faf7f2] hover:bg-[#1a1a1a]"
          >
            + New simulation
          </Link>
        </div>

        {/* ── Controls ── */}
        <div className="mt-5 flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-[320px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bfbfbf]"
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-[#0a0a0a] bg-white py-2.5 pl-9 pr-4 text-[12px] uppercase tracking-[0.6px] text-[#0a0a0a] placeholder:text-[#bfbfbf] focus:outline-none"
            />
          </div>

          {/* Count */}
          <span className="ml-auto text-[11px] uppercase tracking-[1px] text-[#bfbfbf]">
            {visible.length} result{visible.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Table ── */}
        <div className="mt-4 border border-[#0a0a0a] bg-white">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_80px_100px_80px_60px_36px_36px] items-center gap-x-4 border-b border-[#0a0a0a] bg-[#0a0a0a] px-5 py-2.5">
            {["Session", "Category", "Questions", "Date", "Score", "Trend", "", ""].map((h, idx) => (
              <span key={idx} className="text-[10px] uppercase tracking-[1.5px] text-[#faf7f2]">{h}</span>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[12px] uppercase tracking-[1.5px] text-[#bfbfbf]">No sessions found</p>
            </div>
          ) : (
            visible.map((s, i) => {
              const score = s.result.final_score;
              const scoreColor = score >= 80 ? "#3a8377" : score >= 70 ? "#c9a227" : "#c75240";
              const name =
                s.questionTopic.length > 48
                  ? `${s.questionTopic.slice(0, 48)}…`
                  : s.questionTopic;
              const duration = formatDuration(s.result.delivery_metrics.duration_sec);
              const idx = sessions.findIndex((x) => x.id === s.id);
              const trend = sessionTrend(sessions, idx);

              return (
                <div
                  key={s.id}
                  className={`grid grid-cols-[1fr_140px_80px_100px_80px_60px_36px_36px] items-center gap-x-4 px-5 py-4 transition-colors hover:bg-black/2 ${
                    i < visible.length - 1 ? "border-b border-[#f0ece4]" : ""
                  } ${isDeleting === s.id ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium uppercase tracking-[0.26px] text-[#0a0a0a]">
                      {name}
                    </span>
                    <span className="text-[10px] tracking-[0.5px] text-[#bfbfbf]">
                      {duration} · {s.result.delivery_metrics.wpm} WPM
                    </span>
                  </div>

                  <div>
                    <span className="inline-block border border-[#3a8377] bg-[#d6e8e2] px-2.5 py-[4px] text-[10px] font-bold uppercase tracking-[1px] text-[#3a8377]">
                      {s.categoryLabel ?? "SIMULATION"}
                    </span>
                  </div>

                  <span className="text-[12px] tracking-[0.6px] text-[#0a0a0a]">
                    {s.result.delivery_metrics.filler_count} fillers
                  </span>

                  <span className="text-[11px] tracking-[0.55px] text-[#0a0a0a]">{s.date}</span>

                  <div className="flex flex-col gap-1">
                    <span
                      className="text-[18px] font-bold leading-none tracking-[-0.4px]"
                      style={{ color: scoreColor }}
                    >
                      {score}
                    </span>
                    <ScoreBar score={score} />
                  </div>

                  <TrendBadge trend={trend} />

                  <Link
                    href={`/report-cards?session=${encodeURIComponent(s.id)}`}
                    onClick={() => selectSession(s)}
                    className="flex items-center justify-center hover:opacity-60"
                  >
                    <AppIcon name="arrow-right" className="size-3.5" title="View report" />
                  </Link>

                  <button
                    onClick={() => handleDelete(s)}
                    disabled={isDeleting === s.id}
                    className="flex items-center justify-center text-[#c75240] hover:opacity-60"
                    title="Delete session"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Summary strip */}
        <div className="mt-6 flex gap-6 border border-[#e8e4dc] bg-white px-6 py-4">
          {[
            { label: "Avg Score", value: summary.avgScore },
            { label: "Best Session", value: summary.best },
            { label: "Total Sessions", value: summary.total },
            { label: "Avg Duration", value: summary.avgDuration },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-1 flex-col gap-1 border-r border-[#f0ece4] last:border-r-0 pr-6 last:pr-0">
              <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">{stat.label}</span>
              <span className="text-[28px] font-bold leading-none tracking-[-0.8px] text-[#0a0a0a]">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
