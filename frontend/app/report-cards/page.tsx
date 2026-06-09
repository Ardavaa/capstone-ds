"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useEffect } from "react";

import AppIcon, { type IconName } from "@/app/components/AppIcon";
import { createClient } from "@/utils/supabase/client";
import {
  type AnalyzeResponse,
  emotionBorderColor,
  formatDuration,
  loadAnalysisResult,
  loadSelectedSession,
  STORAGE_KEYS,
  type SessionRecord,
} from "@/app/lib/analysis";
import { Sidebar } from "@/app/components/Sidebar";

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

const EMOTION_BAR_COLORS: Record<string, string> = {
  neutral: "#3a8377",
  happy: "#3a8377",
  surprise: "#c9a227",
  sad: "#c75240",
  angry: "#c75240",
  fear: "#c75240",
  disgust: "#c75240",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmotionDistributionChart({ latest }: { latest: AnalyzeResponse }) {
  const vm = latest.video_emotion_metrics;
  const entries = Object.entries(vm.emotion_distribution).sort((a, b) => b[1] - a[1]);

  if (vm.frames_analyzed === 0) {
    return (
      <div className="mt-5 border border-[#e8e4dc] bg-white p-5">
        <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">
          Facial emotion distribution
        </span>
        <p className="mt-4 text-[12px] text-[#c75240]">
          No face detected in video — ensure your face is visible and well-lit.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 border border-[#e8e4dc] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">
          Facial emotion distribution
        </span>
        <span className="text-[10px] uppercase tracking-[1px] text-[#3a8377]">
          {vm.frames_analyzed} frames · dominant {vm.dominant_emotion}
        </span>
      </div>
      <div className="flex h-[120px] items-end gap-2">
        {entries.map(([label, pct]) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full min-w-[8px] rounded-sm"
              style={{
                height: `${Math.max(8, pct * 100)}%`,
                backgroundColor: EMOTION_BAR_COLORS[label] ?? "#c9a227",
              }}
            />
            <span className="text-[8px] uppercase tracking-[0.5px] text-[#bfbfbf]">
              {label.slice(0, 4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative mt-1 h-1 w-full bg-[#e8e4dc]">
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function FillerHighlight({ text, fillers }: { text: string; fillers: string[] }) {
  const unique = [...new Set(fillers)].sort((a, b) => b.length - a.length);
  const parts: { chunk: string; highlight: boolean }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliestIdx = -1;
    let earliestFiller = "";
    const lower = remaining.toLowerCase();

    for (const f of unique) {
      const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      const match = re.exec(lower);
      if (match && (earliestIdx === -1 || match.index < earliestIdx)) {
        earliestIdx = match.index;
        earliestFiller = remaining.slice(match.index, match.index + match[0].length);
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
        ),
      )}
    </>
  );
}

function buildMetricsFromResult(result: AnalyzeResponse): Metric[] {
  const dm = result.delivery_metrics;
  const em = result.emotion_metrics;
  const vm = result.video_emotion_metrics;

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
      label: "Voice Emotion",
      value: em.chunks_analyzed > 0 ? em.dominant_emotion : "N/A",
      color: em.emotion_score >= 70 ? "#3a8377" : "#c9a227",
    },
    {
      label: "Facial Emotion",
      value:
        vm.frames_analyzed > 0
          ? `${vm.dominant_emotion} (${vm.non_verbal_score}/100)`
          : "No face detected",
      color: vm.frames_analyzed > 0 && vm.non_verbal_score >= 70 ? "#3a8377" : "#c9a227",
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

function EmptyAnalysisPrompt() {
  return (
    <div className="mt-6 flex h-48 flex-col items-center justify-center gap-4 border border-dashed border-[#e8e4dc]">
      <p className="text-[12px] uppercase tracking-[1.5px] text-[#bfbfbf]">
        Run a simulation to see your detailed analysis
      </p>
      <Link
        href="/simulation/setup"
        className="border border-[#0a0a0a] bg-[#0a0a0a] px-5 py-2 text-[11px] uppercase tracking-[1px] text-[#faf7f2]"
      >
        New simulation
      </Link>
    </div>
  );
}

function OverviewTab({ latest }: { latest: AnalyzeResponse | null }) {
  if (!latest) return <EmptyAnalysisPrompt />;

  const metrics = buildMetricsFromResult(latest);
  const feedback = buildFeedbackFromResult(latest);

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

          <EmotionDistributionChart latest={latest} />
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
          Latest simulation transcript
        </p>

        <p className="text-[13px] leading-[22px] text-[#0a0a0a]">
          {latest.transcription ? (
            <FillerHighlight
              text={latest.transcription}
              fillers={latest.delivery_metrics.filler_words_found ?? []}
            />
          ) : (
            <span className="text-[#bfbfbf]">No transcription available.</span>
          )}
        </p>
      </div>
    </div>
  );
}

function wpmScorePct(wpm: number): number {
  const delta = Math.abs(wpm - 140);
  return Math.max(0, 100 - (delta / 60) * 100);
}

function DeliveryTab({ latest }: { latest: AnalyzeResponse | null }) {
  if (!latest) return <EmptyAnalysisPrompt />;

  const dm = latest.delivery_metrics;
  const em = latest.emotion_metrics;
  const wpmPct = wpmScorePct(dm.wpm);
  const wpmColor = dm.wpm >= 120 && dm.wpm <= 160 ? "#3a8377" : "#c9a227";

  const rows = [
    {
      label: "Speaking rate (WPM)",
      value: `${dm.wpm} WPM · ideal 130–150`,
      pct: wpmPct,
      color: wpmColor,
    },
    {
      label: "Filler words",
      value: `${dm.filler_count} detected (${dm.filler_rate}%)`,
      pct: Math.max(0, 100 - dm.filler_rate * 12),
      color: dm.filler_rate <= 4 ? "#3a8377" : "#c9a227",
    },
    {
      label: "Average pause",
      value: `${dm.avg_pause_sec}s`,
      pct: dm.avg_pause_sec >= 0.25 && dm.avg_pause_sec <= 1.2 ? 100 : 60,
      color: "#3a8377",
    },
    {
      label: "Longest silence",
      value: `${dm.longest_silence_sec}s`,
      pct: dm.longest_silence_sec <= 2 ? 100 : 50,
      color: dm.longest_silence_sec <= 2 ? "#3a8377" : "#c9a227",
    },
    {
      label: "Voice emotion score",
      value:
        em.chunks_analyzed > 0
          ? `${em.emotion_score}/100 · ${em.dominant_emotion}`
          : "No speech chunks analyzed",
      pct: em.emotion_score,
      color: em.emotion_score >= 70 ? "#3a8377" : "#c9a227",
    },
    {
      label: "Voice stability",
      value:
        em.chunks_analyzed > 0
          ? `${Math.round(em.stability_score * 100)}% · nervous ${Math.round(em.nervous_rate * 100)}%`
          : "N/A",
      pct: em.stability_score * 100,
      color: em.stability_score >= 0.7 ? "#3a8377" : "#c9a227",
    },
  ];

  return (
    <div className="mt-6 border border-[#e8e4dc] bg-white p-6">
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[-0.13px] text-[#0a0a0a]">
        [ Delivery & fluency · score {latest.delivery_score}/100 ]
      </h3>
      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[1.4px] text-[#0a0a0a]">
                {row.label}
              </span>
              <span className="text-[12px] font-bold" style={{ color: row.color }}>
                {row.value}
              </span>
            </div>
            <MetricBar pct={row.pct} color={row.color} />
          </div>
        ))}
      </div>
      {dm.filler_words_found.length > 0 && (
        <div className="mt-6 border-t border-[#f0ece4] pt-4">
          <p className="mb-2 text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">
            Detected fillers
          </p>
          <div className="flex flex-wrap gap-1">
            {[...new Set(dm.filler_words_found)].map((f) => (
              <span
                key={f}
                className="border border-[#c75240] bg-[#f4d9d2] px-2 py-0.5 text-[10px] uppercase"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 text-[12px] text-[#0a0a0a]">{latest.feedback.delivery}</p>
    </div>
  );
}

function NonVerbalTab({ latest, selectedSession }: { latest: AnalyzeResponse | null, selectedSession: SessionRecord | null }) {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  
  useEffect(() => {
    if (!selectedSession?.videoUrls?.length) {
      setSignedUrls([]);
      return;
    }
    
    async function fetchUrls() {
      const supabase = createClient();
      const urls: string[] = [];
      for (const path of selectedSession!.videoUrls!) {
        const { data } = await supabase.storage.from("interview_videos").createSignedUrl(path, 60 * 60); // 1 hour
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      setSignedUrls(urls);
    }
    fetchUrls().catch(console.error);
  }, [selectedSession]);

  if (!latest) return <EmptyAnalysisPrompt />;

  const vm = latest.video_emotion_metrics;

  if (vm.frames_analyzed === 0) {
    return (
      <div className="mt-6 border border-[#e8e4dc] bg-white p-6">
        <h3 className="mb-4 text-[13px] font-bold uppercase text-[#0a0a0a]">
          [ Non-verbal · N/A ]
        </h3>
        <p className="text-[13px] text-[#c75240]">{latest.feedback.non_verbal}</p>
        <p className="mt-2 text-[11px] text-[#bfbfbf]">
          Sampled {vm.frames_sampled} frames — no face detected for YOLOv8 classification.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      
      {signedUrls.length > 0 && (
        <div className="border border-[#e8e4dc] bg-white p-6">
          <h3 className="mb-4 text-[13px] font-bold uppercase text-[#0a0a0a]">
            [ Video Recording ]
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signedUrls.map((url, i) => (
              <div key={i} className="relative aspect-video bg-black overflow-hidden border border-[#0a0a0a]">
                <video src={url} controls className="w-full h-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-[#e8e4dc] bg-white p-6">
        <h3 className="mb-4 text-[13px] font-bold uppercase text-[#0a0a0a]">
          [ Non-verbal · score {vm.non_verbal_score}/100 ]
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">
              Dominant
            </span>
            <p
              className="text-[18px] font-bold uppercase"
              style={{ color: emotionBorderColor(vm.dominant_emotion) }}
            >
              {vm.dominant_emotion}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">
              Stability
            </span>
            <p className="text-[18px] font-bold">{Math.round(vm.stability_score * 100)}%</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">
              Nervous frames
            </span>
            <p className="text-[18px] font-bold">{Math.round(vm.nervous_rate * 100)}%</p>
          </div>
        </div>
        <MetricBar
          pct={vm.non_verbal_score}
          color={vm.non_verbal_score >= 70 ? "#3a8377" : "#c9a227"}
        />
        <p className="mt-4 text-[12px] text-[#0a0a0a]">{latest.feedback.non_verbal}</p>
      </div>
      <EmotionDistributionChart latest={latest} />
    </div>
  );
}

function TranscriptTab({ latest }: { latest: AnalyzeResponse | null }) {
  if (!latest) return <EmptyAnalysisPrompt />;
  if (!latest.transcription) {
    return (
      <div className="mt-6 flex h-48 items-center justify-center border border-dashed border-[#e8e4dc] text-[12px] uppercase tracking-[1.5px] text-[#bfbfbf]">
        No transcript available
      </div>
    );
  }

  return (
    <div className="mt-6 border border-[#e8e4dc] bg-white p-6">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[1.5px] text-[#3a8377]">
        [ Full transcript · score {latest.final_score} ]
      </p>
      <p className="text-[13px] leading-[22px] text-[#0a0a0a]">
        <FillerHighlight
          text={latest.transcription}
          fillers={latest.delivery_metrics.filler_words_found ?? []}
        />
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: Tab[] = ["OVERVIEW", "DELIVERY", "NON-VERBAL", "TRANSCRIPT"];

type ReportSnapshot = {
  latest: AnalyzeResponse | null;
  selectedSession: SessionRecord | null;
};

function subscribeToStorage(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getReportSnapshotKey(): string {
  return [
    window.location.search,
    localStorage.getItem(STORAGE_KEYS.history) ?? "",
    localStorage.getItem(STORAGE_KEYS.selectedSessionId) ?? "",
    sessionStorage.getItem(STORAGE_KEYS.analysisResult) ?? "",
  ].join("\n");
}

function readReportSnapshot(): ReportSnapshot {
  const sessionId = new URLSearchParams(window.location.search).get("session");
  const selectedSession = loadSelectedSession(sessionId);
  return {
    selectedSession,
    latest: selectedSession?.result ?? loadAnalysisResult(),
  };
}

export default function ReportCardsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("OVERVIEW");
  const [userName, setUserName] = useState("Local user");

  useEffect(() => {
    fetchUserHistoryFromDB().catch(console.error);
  }, []);

  const reportSnapshotKey = useSyncExternalStore(
    subscribeToStorage,
    getReportSnapshotKey,
    () => "",
  );
  const { latest, selectedSession } = useMemo(
    () =>
      reportSnapshotKey
        ? readReportSnapshot()
        : { latest: null, selectedSession: null },
    [reportSnapshotKey],
  );

  const today =
    selectedSession?.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  const reportEyebrow = latest
    ? `[ Report · ${today} · ${selectedSession?.categoryLabel ?? "Latest simulation"} · ${formatDuration(latest.delivery_metrics.duration_sec)} · ${latest.final_score}/100 ]`
    : `[ Report · ${today} · No selected session ]`;

  return (
    <div className="flex h-screen overflow-hidden bg-[#faf7f2]">
      <Sidebar />

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
            disabled
            title="Export is not implemented yet"
            className="flex cursor-not-allowed items-center gap-2 border border-[#bfbfbf] bg-[#faf7f2] px-5 py-3 text-[12px] font-medium uppercase tracking-[1.2px] text-[#bfbfbf]"
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
        {activeTab === "OVERVIEW"   && <OverviewTab latest={latest ?? null} />}
        {activeTab === "DELIVERY"   && <DeliveryTab latest={latest ?? null} />}
        {activeTab === "NON-VERBAL" && <NonVerbalTab latest={latest ?? null} selectedSession={selectedSession ?? null} />}
        {activeTab === "TRANSCRIPT" && <TranscriptTab latest={latest ?? null} />}
      </main>
    </div>
  );
}
