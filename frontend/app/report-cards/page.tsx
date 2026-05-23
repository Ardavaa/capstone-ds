"use client";

import Link from "next/link";
import { useState } from "react";

import {
  type AnalyzeResponse,
  formatDuration,
  loadAnalysisResult,
} from "@/app/lib/analysis";

// ─── Sidebar icons (same Figma assets as dashboard) ─────────────────────────

const ASSET = {
  dashboard:  "https://www.figma.com/api/mcp/asset/4bcb7c45-a9db-46db-bbb3-cfd882d45448",
  plus:       "https://www.figma.com/api/mcp/asset/533903f1-0038-4f90-88fa-1916a48695d3",
  clock:      "https://www.figma.com/api/mcp/asset/ca69dd40-1eeb-4159-8ae1-82113b6b892c",
  file:       "https://www.figma.com/api/mcp/asset/1adfbb1f-b6af-40ff-ad19-9f40973309dd",
  settings:   "https://www.figma.com/api/mcp/asset/307b7641-0093-4f40-bd02-fc2a8cdc00d6",
  menu:       "https://www.figma.com/api/mcp/asset/b732eccc-6f91-46c8-8a97-480bbb96e9f9",
  user:       "https://www.figma.com/api/mcp/asset/8d2d9125-0ce3-4d70-8bfc-9a74a1c87d4a",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "OVERVIEW" | "DELIVERY" | "NON-VERBAL" | "TRANSCRIPT";

type Metric = {
  label: string;
  value: string;
  color: string;
};

type Feedback = {
  type: "warn" | "good";
  title: string;
  detail: string;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const METRICS: Metric[] = [
  { label: "Speaking Rate",        value: "142 WPM", color: "#3a8377" },
  { label: "Filler Words",         value: "7 (3.2%)", color: "#c9a227" },
  { label: "Average Pause",        value: "0.8s",    color: "#3a8377" },
  { label: "Longest Silence",      value: "2.4s",    color: "#3a8377" },
  { label: "Intonation Variance",  value: "MEDIUM",  color: "#c9a227" },
  { label: "Volume Consistency",   value: "94%",     color: "#3a8377" },
];

const FEEDBACK: Feedback[] = [
  {
    type:   "warn",
    title:  "Vary intonation",
    detail: "Q2 flattened in tone. Emphasize key phrases — \"the root cause was...\" — to keep listeners engaged.",
  },
  {
    type:   "warn",
    title:  "Re-engage eye contact",
    detail: "When recalling technical details, you looked away. Answer one-line summaries while looking at camera before diving deeper.",
  },
  {
    type:   "warn",
    title:  "Cut \"kinda\" and \"you know\"",
    detail: "5 of your 7 filler words. Replace with a half-second pause — reads as deliberate, not hesitant.",
  },
  {
    type:   "good",
    title:  "Strong opening — keep it",
    detail: "First 15s had highest engagement. Whatever you did there, do it again.",
  },
];

// Per-second eye-contact bars: ~0–100 value
const EYE_BARS: number[] = [
  82, 88, 90, 85, 87, 86, 83, 89, 91, 88, // 0:00 – Q1
  85, 87, 84, 80, 76, 72, 58, 42, 35, 62, // Q1 – Q2 dip
  48, 38, 55, 68, 74, 79, 83, 86, 88, 85, // Q2 recovery
  87, 90, 88, 86, 84, 87, 89, 91, 88, 85, // Q3 – end
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarNavItem({
  icon,
  label,
  active = false,
  href,
}: {
  icon: string;
  label: string;
  active?: boolean;
  href?: string;
}) {
  const cls = `flex cursor-pointer items-center gap-2.5 px-2.5 py-2.5 ${
    active ? "bg-[#0a0a0a]" : "hover:bg-black/5"
  }`;
  const content = (
    <>
      <img src={icon} alt="" className="size-3.5 shrink-0" />
      <span className={`text-[12px] uppercase tracking-[0.6px] ${active ? "text-[#faf7f2]" : "text-[#0a0a0a]"}`}>
        {label}
      </span>
    </>
  );
  if (href) return <Link href={href} className={cls}>{content}</Link>;
  return <div className={cls}>{content}</div>;
}

function EyeContactChart() {
  // Colour per bar value
  const barColor = (v: number) => (v >= 75 ? "#3a8377" : v >= 55 ? "#c9a227" : "#c75240");

  return (
    <div className="mt-5 border border-[#e8e4dc] bg-white p-5">
      {/* Chart label */}
      <div className="mb-4 flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#bfbfbf" strokeWidth="1.2" />
          <circle cx="6" cy="6" r="2" fill="#bfbfbf" />
        </svg>
        <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">Eye Contact Timeline</span>
      </div>

      {/* Bars */}
      <div className="flex h-[120px] items-end gap-[3px]">
        {EYE_BARS.map((v, i) => (
          <div
            key={i}
            className="flex-1 min-w-0 rounded-sm transition-all"
            style={{ height: `${v}%`, backgroundColor: barColor(v) }}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between">
        {["0:00", "Q1", "Q2 (NTP)", "Q3", "4:33"].map((lbl) => (
          <span key={lbl} className="text-[9px] uppercase tracking-[1px] text-[#bfbfbf]">
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

function FillerHighlight({ text }: { text: string }) {
  const FILLERS = ["kinda", "You know", "Hmm"];
  const parts: { chunk: string; highlight: boolean }[] = [];

  let remaining = text;
  while (remaining.length > 0) {
    let earliestIdx = -1;
    let earliestFiller = "";
    for (const f of FILLERS) {
      const idx = remaining.indexOf(f);
      if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
        earliestIdx = idx;
        earliestFiller = f;
      }
    }
    if (earliestIdx === -1) {
      parts.push({ chunk: remaining, highlight: false });
      break;
    }
    if (earliestIdx > 0) {
      parts.push({ chunk: remaining.slice(0, earliestIdx), highlight: false });
    }
    parts.push({ chunk: earliestFiller, highlight: true });
    remaining = remaining.slice(earliestIdx + earliestFiller.length);
  }

  return (
    <>
      {parts.map((p, i) =>
        p.highlight ? (
          <mark key={i} className="rounded-sm bg-[#f4d9d2] px-0.5 text-[#0a0a0a] not-italic">
            {p.chunk}
          </mark>
        ) : (
          <span key={i}>{p.chunk}</span>
        )
      )}
    </>
  );
}

function buildMetricsFromResult(result: AnalyzeResponse): Metric[] {
  const dm = result.delivery_metrics;
  return [
    {
      label: "Speaking Rate",
      value: `${dm.wpm} WPM`,
      color: dm.wpm >= 120 && dm.wpm <= 160 ? "#3a8377" : "#c9a227",
    },
    {
      label: "Filler Words",
      value: `${dm.filler_count} (${dm.filler_rate}%)`,
      color: dm.filler_rate <= 4 ? "#3a8377" : "#c9a227",
    },
    {
      label: "Average Pause",
      value: `${dm.avg_pause_sec}s`,
      color: "#3a8377",
    },
    {
      label: "Longest Silence",
      value: `${dm.longest_silence_sec}s`,
      color: dm.longest_silence_sec <= 2 ? "#3a8377" : "#c9a227",
    },
    {
      label: "Content Score",
      value: `${result.content_score}/100`,
      color: result.content_score >= 70 ? "#3a8377" : "#c9a227",
    },
    {
      label: "Final Score",
      value: `${result.final_score}/100`,
      color: result.final_score >= 70 ? "#3a8377" : "#c9a227",
    },
  ];
}

function buildFeedbackFromResult(result: AnalyzeResponse): Feedback[] {
  return [
    { type: "warn", title: "Content", detail: result.feedback.content },
    { type: "warn", title: "Delivery", detail: result.feedback.delivery },
    {
      type: result.non_verbal_score >= 75 ? "good" : "warn",
      title: "Non-verbal",
      detail: result.feedback.non_verbal,
    },
  ];
}

function OverviewTab({ latest }: { latest: AnalyzeResponse | null }) {
  const metrics = latest ? buildMetricsFromResult(latest) : METRICS;
  const feedback = latest ? buildFeedbackFromResult(latest) : FEEDBACK;

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Two-column grid */}
      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* ── Left: delivery metrics + chart ── */}
        <div className="border border-[#e8e4dc] bg-white p-6">
          <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[-0.13px] text-[#0a0a0a]">
            [ Delivery metrics ]
          </h3>

          <div className="flex flex-col">
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className={`flex items-center justify-between py-2.5 ${
                  i < metrics.length - 1 ? "border-b border-[#f0ece4]" : ""
                }`}
              >
                <span className="text-[11px] uppercase tracking-[1.4px] text-[#0a0a0a]">
                  {m.label}
                </span>
                <span
                  className="text-[12px] font-bold uppercase tracking-[0.6px]"
                  style={{ color: m.color }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          <EyeContactChart />
        </div>

        {/* ── Right: actionable feedback ── */}
        <div className="border border-[#e8e4dc] bg-white p-6">
          <div className="mb-5 flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a227" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#0a0a0a]">
              Actionable Feedback
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {feedback.map((fb) => (
              <div key={fb.title} className="flex gap-3">
                <div
                  className="mt-1 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: fb.type === "good" ? "#3a8377" : "#c9a227" }}
                />
                <div>
                  <p className="mb-1 text-[12px] font-bold uppercase tracking-[-0.12px] text-[#0a0a0a]">
                    {fb.title}
                  </p>
                  <p className="text-[11px] leading-[17px] text-[#0a0a0a]">{fb.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Transcript segment ── */}
      <div className="border border-[#e8e4dc] bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#3a8377]">
            [ Q 02 · 01:24 — 02:48 ]
          </span>
        </div>

        <p className="mb-4 text-[20px] font-bold uppercase leading-snug tracking-[-0.4px] text-[#0a0a0a]">
          {latest
            ? "Latest simulation transcript"
            : "Tell me about a time you had to debug a complex production issue."}
        </p>

        <p className="text-[13px] leading-[22px] text-[#0a0a0a]">
          {latest?.transcription ? (
            <FillerHighlight text={latest.transcription} />
          ) : (
            <FillerHighlight
              text={
                "So kinda last semester I was working on this payment integration and it started failing only on Friday evenings. " +
                "You know, it was weird because everything passed in staging. I started by reading the logs and saw a timeout pattern. " +
                "The root cause was a third-party rate limiter that we hadn't accounted for during peak hours. " +
                "Hmm what I did was add exponential backoff and a circuit breaker, and we also added monitoring so we'd catch it earlier next time. " +
                "The whole investigation took about two days but we shipped the fix on a Monday."
              }
            />
          )}
        </p>
      </div>
    </div>
  );
}

function TranscriptTab({ latest }: { latest: AnalyzeResponse | null }) {
  if (!latest?.transcription) {
    return <PlaceholderTab label="Transcript" />;
  }

  return (
    <div className="mt-6 border border-[#e8e4dc] bg-white p-6">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[1.5px] text-[#3a8377]">
        [ Full transcript · score {latest.final_score} ]
      </p>
      <p className="text-[13px] leading-[22px] text-[#0a0a0a]">
        <FillerHighlight text={latest.transcription} />
      </p>
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="mt-6 flex h-48 items-center justify-center border border-dashed border-[#e8e4dc] text-[12px] uppercase tracking-[1.5px] text-[#bfbfbf]">
      {label} — Coming soon
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: Tab[] = ["OVERVIEW", "DELIVERY", "NON-VERBAL", "TRANSCRIPT"];

export default function ReportCardsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("OVERVIEW");
  const [latest] = useState<AnalyzeResponse | null>(() =>
    typeof window !== "undefined" ? loadAnalysisResult() : null,
  );
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  const reportEyebrow = latest
    ? `[ Report · ${today} · SW Engineer · ${formatDuration(latest.delivery_metrics.duration_sec)} · ${latest.final_score}/100 ]`
    : `[ Report · ${today} · SW Engineer ]`;

  return (
    <div className="flex h-full overflow-hidden border border-[#0a0a0a] bg-[#faf7f2]">
      {/* ── Sidebar ── */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#0a0a0a]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-[#0a0a0a] px-4">
          <div className="size-6 bg-[#0a0a0a]" />
          <span className="text-[14px] font-bold uppercase tracking-[0.7px] text-[#0a0a0a]">
            Lumen
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <div className="px-2 pb-1.5 pt-3">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Workspace</span>
          </div>
          <SidebarNavItem icon={ASSET.dashboard} label="Dashboard" href="/dashboard" />
          <SidebarNavItem icon={ASSET.plus}      label="New Simulation" href="/simulation/setup" />

          <div className="px-2 pb-1.5 pt-3.5">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Library</span>
          </div>
          <SidebarNavItem icon={ASSET.clock} label="History" href="/history" />
          <SidebarNavItem icon={ASSET.file}  label="Report Cards" active href="/report-cards" />

          <div className="px-2 pb-1.5 pt-3.5">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Account</span>
          </div>
          <SidebarNavItem icon={ASSET.settings} label="Settings" />
        </nav>

        {/* Footer */}
        <div className="border-t border-[#0a0a0a] px-4 py-4">
          <button
            type="button"
            className="mb-3 flex h-9 w-full items-center justify-center border border-[#0a0a0a] bg-white hover:bg-black/5"
          >
            <img src={ASSET.menu} alt="Toggle sidebar" className="size-3.5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center bg-[#0a0a0a]">
              <img src={ASSET.user} alt="" className="size-3.5" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#0a0a0a]">
                Rafif R.
              </p>
              <p className="truncate text-[10px] text-[#bfbfbf]">rafif@telkom</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto px-10 pb-10">
        {/* Eyebrow breadcrumb */}
        <p className="mt-6 text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">
          {reportEyebrow}
        </p>

        {/* Header row */}
        <div className="mt-2 flex items-center justify-between border-b border-[#0a0a0a] pb-5">
          <h1 className="text-[36px] font-bold uppercase leading-none tracking-[-1.08px] text-[#0a0a0a]">
            Detailed Analysis
          </h1>

          <button
            type="button"
            className="flex items-center gap-2 border border-[#0a0a0a] bg-[#faf7f2] px-5 py-3 text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="mt-5 flex gap-0 border-b border-[#0a0a0a]">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-[12px] font-medium uppercase tracking-[1px] transition-colors ${
                activeTab === tab
                  ? "border border-b-[#faf7f2] border-[#0a0a0a] -mb-px bg-[#0a0a0a] text-[#faf7f2]"
                  : "border border-transparent text-[#bfbfbf] hover:text-[#0a0a0a]"
              }`}
            >
              {activeTab === tab ? `[ ${tab} ]` : tab}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === "OVERVIEW"   && <OverviewTab latest={latest} />}
        {activeTab === "DELIVERY"   && <PlaceholderTab label="Delivery" />}
        {activeTab === "NON-VERBAL" && <PlaceholderTab label="Non-verbal" />}
        {activeTab === "TRANSCRIPT" && <TranscriptTab latest={latest} />}
      </main>
    </div>
  );
}
