"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  type AnalyzeResponse,
  DEFAULT_SIMULATION_CONFIG,
  formatDuration,
  loadAnalysisResult,
  loadSimulationConfig,
  performanceLabel,
  STORAGE_KEYS,
} from "@/app/lib/analysis";

type ScoreCategory = {
  id: string;
  tag: string;
  weight: string;
  title: string;
  score: number;
  description: string;
  barColor: string;
  tagBg: string;
  tagColor: string;
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="relative h-1 w-full bg-[#e8e4dc]">
      <div
        className="absolute inset-y-0 left-0 transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ScoreCard({ cat }: { cat: ScoreCategory }) {
  return (
    <div className="flex flex-col gap-4 border border-[#e8e4dc] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span
          className="px-2 py-1 text-[10px] font-bold uppercase tracking-[1px]"
          style={{ backgroundColor: cat.tagBg, color: cat.tagColor }}
        >
          {cat.tag}
        </span>
        <span className="text-[10px] uppercase tracking-[1px] text-[#bfbfbf]">{cat.weight}</span>
      </div>

      <h3 className="text-[22px] font-bold uppercase leading-tight tracking-[-0.4px] text-[#0a0a0a]">
        {cat.title}
      </h3>

      <div className="flex items-baseline gap-1">
        <span className="text-[52px] font-bold leading-none tracking-[-2px] text-[#0a0a0a]">
          {cat.score}
        </span>
        <span className="text-[14px] text-[#bfbfbf]">/100</span>
      </div>

      <ScoreBar score={cat.score} color={cat.barColor} />
      <p className="text-[12px] leading-[19px] text-[#0a0a0a]">{cat.description}</p>
    </div>
  );
}

function buildCategories(result: AnalyzeResponse): ScoreCategory[] {
  const dm = result.delivery_metrics;
  const cm = result.content_metrics;
  const contentDetail = cm
    ? `${result.feedback.content} (relevance ${cm.semantic_score} · rubric ${cm.rubric_score} · depth ${cm.completeness_score})`
    : result.feedback.content;

  return [
    {
      id: "content",
      tag: "[ Content Quality ]",
      weight: "[ 40% ]",
      title: "What you said.",
      score: result.content_score,
      description: contentDetail,
      barColor: "#3a8377",
      tagBg: "#d6e8e2",
      tagColor: "#3a8377",
    },
    {
      id: "delivery",
      tag: "[ Delivery & Fluency ]",
      weight: "[ 30% ]",
      title: "How you said it.",
      score: result.delivery_score,
      description: `${result.feedback.delivery} (${dm.wpm} WPM · ${dm.filler_rate}% fillers · avg pause ${dm.avg_pause_sec}s)`,
      barColor: "#7e78d2",
      tagBg: "#ddd9f0",
      tagColor: "#7e78d2",
    },
    {
      id: "nonverbal",
      tag: "[ Non-Verbal ]",
      weight: "[ 30% ]",
      title: "How you appeared.",
      score: result.non_verbal_score,
      description: result.feedback.non_verbal,
      barColor: "#c75240",
      tagBg: "#f4d9d2",
      tagColor: "#c75240",
    },
  ];
}

function summaryHeadline(score: number): { line1: string; highlight: string; line2: string } {
  if (score >= 80) {
    return { line1: "You came across", highlight: "thoughtful", line2: "and prepared." };
  }
  if (score >= 65) {
    return { line1: "You came across", highlight: "capable", line2: "with room to polish." };
  }
  return { line1: "You have a", highlight: "solid base", line2: "to build on." };
}

function subscribeToStorage(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getResultSnapshot(): string {
  return [
    sessionStorage.getItem(STORAGE_KEYS.analysisResult) ?? "",
    sessionStorage.getItem(STORAGE_KEYS.simulationConfig) ?? "",
    sessionStorage.getItem(STORAGE_KEYS.questionTopic) ?? "",
  ].join("\n");
}

export default function ResultPage() {
  const resultSnapshot = useSyncExternalStore(
    subscribeToStorage,
    getResultSnapshot,
    () => "",
  );
  const result = useMemo(
    () => (resultSnapshot ? loadAnalysisResult() : null),
    [resultSnapshot],
  );
  const simulationConfig = useMemo(
    () => (resultSnapshot ? loadSimulationConfig() : DEFAULT_SIMULATION_CONFIG),
    [resultSnapshot],
  );

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  if (!result) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-[#faf7f2] px-8">
        <p className="text-[14px] uppercase tracking-[1.5px] text-[#bfbfbf]">
          No analysis result found
        </p>
        <p className="max-w-md text-center text-[13px] text-[#0a0a0a]">
          Complete a recording and wait for analysis to finish, or run a new simulation.
        </p>
        <div className="flex gap-3">
          <Link
            href="/simulation/setup"
            className="border border-[#0a0a0a] bg-[#0a0a0a] px-5 py-3 text-[12px] uppercase tracking-[1px] text-[#faf7f2]"
          >
            New simulation
          </Link>
          <Link
            href="/dashboard"
            className="border border-[#0a0a0a] px-5 py-3 text-[12px] uppercase tracking-[1px] text-[#0a0a0a]"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const categories = buildCategories(result);
  const headline = summaryHeadline(result.final_score);
  const durationLabel = formatDuration(result.delivery_metrics.duration_sec);
  const summaryText = `${result.feedback.content} ${result.feedback.delivery}`;

  return (
    <div className="min-h-full bg-[#faf7f2]">
      <nav className="flex h-14 items-center justify-between border-b border-[#0a0a0a] px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-6 bg-[#0a0a0a]" />
          <span className="text-[14px] font-bold uppercase tracking-[0.7px] text-[#0a0a0a]">
            Lumen
          </span>
        </Link>

        <span className="text-[11px] uppercase tracking-[1.5px] text-[#bfbfbf]">
          [ Report · {today} ]
        </span>

        <button
          type="button"
          className="flex items-center gap-2 border border-[#0a0a0a] bg-[#faf7f2] px-4 py-2 text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </button>
      </nav>

      <section className="border-b border-[#0a0a0a] px-10 py-10">
        <div className="flex items-start gap-10">
          <div className="flex flex-1 flex-col">
            <p className="mb-4 text-[11px] uppercase tracking-[1.5px] text-[#bfbfbf]">
              [ {simulationConfig.categoryLabel} · {simulationConfig.questions.length} Q · {durationLabel} ]
            </p>

            <h1 className="mb-4 text-[42px] font-bold leading-[1.1] tracking-[-1.2px] text-[#0a0a0a]">
              {headline.line1}
              <br />
              as <em className="italic text-[#3a8377]">{headline.highlight}</em>
              <br />
              {headline.line2}
            </h1>

            <p className="mb-8 max-w-[520px] text-[13px] leading-[20px] text-[#0a0a0a]">
              {summaryText}
            </p>

            <div className="flex items-center gap-3">
              <a
                href="#breakdown"
                className="flex items-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-5 py-3 text-[12px] font-medium uppercase tracking-[1.2px] text-[#faf7f2] hover:bg-[#1a1a1a]"
              >
                See breakdown →
              </a>
              <Link
                href="/simulation/setup"
                className="border border-[#0a0a0a] bg-[#faf7f2] px-5 py-3 text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
              >
                Try again
              </Link>
            </div>
          </div>

          <div className="flex w-[320px] shrink-0 flex-col items-center justify-center rounded-2xl border border-[#e8e4dc] bg-white px-10 py-10 shadow-md">
            <span className="text-[96px] font-bold leading-none tracking-[-4px] text-[#0a0a0a]">
              {result.final_score}
            </span>
            <span className="mt-2 text-[11px] uppercase tracking-[1.5px] text-[#bfbfbf]">
              [ Out of 100 ]
            </span>
            <p className="mt-3 text-[15px] italic text-[#3a8377]">
              {performanceLabel(result.final_score)}
            </p>
          </div>
        </div>
      </section>

      <section id="breakdown" className="px-10 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[16px] font-bold uppercase tracking-[-0.2px] text-[#0a0a0a]">
            [ Score Breakdown ]
          </h2>
          <span className="text-[11px] uppercase tracking-[1px] text-[#bfbfbf]">
            Weighted Fusion · 40/30/30
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {categories.map((cat) => (
            <ScoreCard key={cat.id} cat={cat} />
          ))}
        </div>

        {result.transcription && (
          <div className="mt-8 border border-[#e8e4dc] bg-white p-6">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[1.5px] text-[#3a8377]">
              [ Transcript ]
            </p>
            <p className="text-[13px] leading-[22px] text-[#0a0a0a]">{result.transcription}</p>
          </div>
        )}
      </section>

      <div className="flex items-center justify-center gap-4 border-t border-[#e8e4dc] px-10 py-8">
        <Link
          href="/dashboard"
          className="border border-[#0a0a0a] bg-[#faf7f2] px-6 py-3 text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
        >
          ← Back to dashboard
        </Link>
        <Link
          href="/report-cards"
          className="border border-[#0a0a0a] bg-[#faf7f2] px-6 py-3 text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
        >
          View report card
        </Link>
        <Link
          href="/simulation/setup"
          className="border border-[#0a0a0a] bg-[#0a0a0a] px-6 py-3 text-[12px] font-medium uppercase tracking-[1.2px] text-[#faf7f2] hover:bg-[#1a1a1a]"
        >
          Start new simulation
        </Link>
      </div>
    </div>
  );
}
