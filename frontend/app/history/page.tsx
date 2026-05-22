"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Assets ──────────────────────────────────────────────────────────────────

const ASSET = {
  dashboard:  "https://www.figma.com/api/mcp/asset/4bcb7c45-a9db-46db-bbb3-cfd882d45448",
  plus:       "https://www.figma.com/api/mcp/asset/533903f1-0038-4f90-88fa-1916a48695d3",
  clock:      "https://www.figma.com/api/mcp/asset/ca69dd40-1eeb-4159-8ae1-82113b6b892c",
  file:       "https://www.figma.com/api/mcp/asset/1adfbb1f-b6af-40ff-ad19-9f40973309dd",
  settings:   "https://www.figma.com/api/mcp/asset/307b7641-0093-4f40-bd02-fc2a8cdc00d6",
  menu:       "https://www.figma.com/api/mcp/asset/b732eccc-6f91-46c8-8a97-480bbb96e9f9",
  user:       "https://www.figma.com/api/mcp/asset/8d2d9125-0ce3-4d70-8bfc-9a74a1c87d4a",
  arrowRight: "https://www.figma.com/api/mcp/asset/3a2bedd0-d93d-4a22-9996-13ed40427b9a",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "TECHNICAL" | "BEHAVIORAL" | "CASE" | "GENERAL";
type Filter   = "ALL" | Category;

type Session = {
  id:       string;
  name:     string;
  category: Category;
  questions: number;
  duration: string;
  date:     string;
  score:    number;
  trend:    "up" | "down" | "same";
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const CAT_STYLE: Record<Category, { bg: string; border: string; color: string }> = {
  TECHNICAL:  { bg: "#d6e8e2", border: "#3a8377", color: "#3a8377" },
  BEHAVIORAL: { bg: "#ddd9f0", border: "#7e78d2", color: "#7e78d2" },
  CASE:       { bg: "#f4d9d2", border: "#c75240", color: "#c75240" },
  GENERAL:    { bg: "#f5f0e8", border: "#c9a227", color: "#c9a227" },
};

const SESSIONS: Session[] = [
  { id: "1", name: "Software Engineer",      category: "TECHNICAL",  questions: 3, duration: "4:32", date: "2026.05.21", score: 87, trend: "up"   },
  { id: "2", name: "Leadership Behavioral",  category: "BEHAVIORAL", questions: 3, duration: "5:14", date: "2026.05.19", score: 74, trend: "down" },
  { id: "3", name: "Data Analyst Case",      category: "CASE",       questions: 3, duration: "6:08", date: "2026.05.17", score: 68, trend: "down" },
  { id: "4", name: "General Introduction",   category: "GENERAL",    questions: 3, duration: "3:51", date: "2026.05.14", score: 81, trend: "up"   },
  { id: "5", name: "System Design",          category: "TECHNICAL",  questions: 4, duration: "7:22", date: "2026.05.12", score: 79, trend: "up"   },
  { id: "6", name: "Product Case Study",     category: "CASE",       questions: 3, duration: "5:49", date: "2026.05.09", score: 72, trend: "up"   },
  { id: "7", name: "Conflict Resolution",    category: "BEHAVIORAL", questions: 3, duration: "4:05", date: "2026.05.06", score: 83, trend: "up"   },
  { id: "8", name: "Frontend Engineering",   category: "TECHNICAL",  questions: 4, duration: "8:11", date: "2026.05.03", score: 76, trend: "same" },
  { id: "9", name: "Self Introduction",      category: "GENERAL",    questions: 2, duration: "2:55", date: "2026.04.30", score: 88, trend: "up"   },
  { id: "10", name: "API Design Interview",  category: "TECHNICAL",  questions: 3, duration: "5:37", date: "2026.04.27", score: 70, trend: "down" },
  { id: "11", name: "Team Leadership",       category: "BEHAVIORAL", questions: 3, duration: "4:48", date: "2026.04.24", score: 77, trend: "up"   },
  { id: "12", name: "Business Case",         category: "CASE",       questions: 3, duration: "6:33", date: "2026.04.21", score: 65, trend: "same" },
];

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL",        label: "All" },
  { value: "TECHNICAL",  label: "Technical" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "CASE",       label: "Case" },
  { value: "GENERAL",    label: "General" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarItem({
  icon, label, active = false, href,
}: { icon: string; label: string; active?: boolean; href?: string }) {
  const cls = `flex items-center gap-2.5 px-2.5 py-2.5 ${active ? "bg-[#0a0a0a]" : "hover:bg-black/5"}`;
  const inner = (
    <>
      <img src={icon} alt="" className="size-3.5 shrink-0" />
      <span className={`text-[12px] uppercase tracking-[0.6px] ${active ? "text-[#faf7f2]" : "text-[#0a0a0a]"}`}>
        {label}
      </span>
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <div className={cls}>{inner}</div>;
}

function TrendBadge({ trend, score }: { trend: Session["trend"]; score: number }) {
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
  const [filter, setFilter]   = useState<Filter>("ALL");
  const [search, setSearch]   = useState("");

  const visible = SESSIONS.filter((s) => {
    const matchCat  = filter === "ALL" || s.category === filter;
    const matchText = s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  return (
    <div className="flex h-full overflow-hidden border border-[#0a0a0a] bg-[#faf7f2]">
      {/* ── Sidebar ── */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#0a0a0a]">
        <div className="flex h-14 items-center gap-2.5 border-b border-[#0a0a0a] px-4">
          <div className="size-6 bg-[#0a0a0a]" />
          <span className="text-[14px] font-bold uppercase tracking-[0.7px] text-[#0a0a0a]">Lumen</span>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <div className="px-2 pb-1.5 pt-3">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Workspace</span>
          </div>
          <SidebarItem icon={ASSET.dashboard} label="Dashboard"      href="/dashboard" />
          <SidebarItem icon={ASSET.plus}      label="New Simulation"  href="/simulation/setup" />

          <div className="px-2 pb-1.5 pt-3.5">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Library</span>
          </div>
          <SidebarItem icon={ASSET.clock} label="History"      active href="/history" />
          <SidebarItem icon={ASSET.file}  label="Report Cards"        href="/report-cards" />

          <div className="px-2 pb-1.5 pt-3.5">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Account</span>
          </div>
          <SidebarItem icon={ASSET.settings} label="Settings" />
        </nav>

        <div className="border-t border-[#0a0a0a] px-4 py-4">
          <button
            type="button"
            className="mb-3 flex h-9 w-full items-center justify-center border border-[#0a0a0a] bg-white hover:bg-black/5"
          >
            <img src={ASSET.menu} alt="" className="size-3.5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center bg-[#0a0a0a]">
              <img src={ASSET.user} alt="" className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#0a0a0a]">Rafif R.</p>
              <p className="truncate text-[10px] text-[#bfbfbf]">rafif@telkom</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto px-10 pb-10">
        {/* Header */}
        <div className="flex items-end justify-between border-b border-[#0a0a0a] pb-5 pt-8">
          <div>
            <h1 className="text-[36px] font-bold uppercase leading-none tracking-[-1.08px] text-[#0a0a0a]">
              Session History
            </h1>
            <p className="mt-2 text-[11px] uppercase tracking-[1.1px] text-[#bfbfbf]">
              [ {SESSIONS.length} sessions · Sorted by date ]
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

          {/* Category filters */}
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-[1px] transition-colors ${
                  filter === f.value
                    ? "border-[#0a0a0a] bg-[#0a0a0a] text-[#faf7f2]"
                    : "border-[#0a0a0a] bg-white text-[#0a0a0a] hover:bg-black/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Count */}
          <span className="ml-auto text-[11px] uppercase tracking-[1px] text-[#bfbfbf]">
            {visible.length} result{visible.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Table ── */}
        <div className="mt-4 border border-[#0a0a0a] bg-white">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_80px_100px_80px_60px_36px] items-center gap-x-4 border-b border-[#0a0a0a] bg-[#0a0a0a] px-5 py-2.5">
            {["Session", "Category", "Questions", "Date", "Score", "Trend", ""].map((h) => (
              <span key={h} className="text-[10px] uppercase tracking-[1.5px] text-[#faf7f2]">{h}</span>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[12px] uppercase tracking-[1.5px] text-[#bfbfbf]">No sessions found</p>
            </div>
          ) : (
            visible.map((s, i) => {
              const cat = CAT_STYLE[s.category];
              const scoreColor = s.score >= 80 ? "#3a8377" : s.score >= 70 ? "#c9a227" : "#c75240";
              return (
                <div
                  key={s.id}
                  className={`grid grid-cols-[1fr_140px_80px_100px_80px_60px_36px] items-center gap-x-4 px-5 py-4 transition-colors hover:bg-black/2 ${
                    i < visible.length - 1 ? "border-b border-[#f0ece4]" : ""
                  }`}
                >
                  {/* Name + meta */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium uppercase tracking-[0.26px] text-[#0a0a0a]">
                      {s.name}
                    </span>
                    <span className="text-[10px] tracking-[0.5px] text-[#bfbfbf]">
                      {s.questions} Q · {s.duration}
                    </span>
                  </div>

                  {/* Category badge */}
                  <div>
                    <span
                      className="inline-block border px-2.5 py-[4px] text-[10px] font-bold uppercase tracking-[1px]"
                      style={{ backgroundColor: cat.bg, borderColor: cat.border, color: cat.color }}
                    >
                      {s.category}
                    </span>
                  </div>

                  {/* Questions */}
                  <span className="text-[12px] tracking-[0.6px] text-[#0a0a0a]">{s.questions} Q</span>

                  {/* Date */}
                  <span className="text-[11px] tracking-[0.55px] text-[#0a0a0a]">{s.date}</span>

                  {/* Score + bar */}
                  <div className="flex flex-col gap-1">
                    <span
                      className="text-[18px] font-bold leading-none tracking-[-0.4px]"
                      style={{ color: scoreColor }}
                    >
                      {s.score}
                    </span>
                    <ScoreBar score={s.score} />
                  </div>

                  {/* Trend */}
                  <TrendBadge trend={s.trend} score={s.score} />

                  {/* Arrow link */}
                  <Link href="/report-cards" className="flex items-center justify-center hover:opacity-60">
                    <img src={ASSET.arrowRight} alt="View report" className="size-3.5" />
                  </Link>
                </div>
              );
            })
          )}
        </div>

        {/* Summary strip */}
        <div className="mt-6 flex gap-6 border border-[#e8e4dc] bg-white px-6 py-4">
          {[
            { label: "Avg Score",       value: Math.round(SESSIONS.reduce((a, s) => a + s.score, 0) / SESSIONS.length).toString() },
            { label: "Best Session",    value: Math.max(...SESSIONS.map((s) => s.score)).toString() },
            { label: "Total Sessions",  value: SESSIONS.length.toString() },
            { label: "Avg Duration",    value: "5:02" },
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
