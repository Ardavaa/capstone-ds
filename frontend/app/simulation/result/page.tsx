"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import AppIcon, { type IconName } from "@/app/components/AppIcon";
import { createClient } from "@/utils/supabase/client";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import Aurora from "@/components/ui/Aurora";
import BorderGlow from "@/components/ui/BorderGlow";
import { TranscriptCarousel } from "./TranscriptCarousel";
import { OverallAIInsight } from "./OverallAIInsight";
import {
  type AnalyzeResponse,
  DEFAULT_SIMULATION_CONFIG,
  formatDuration,
  loadAnalysisResult,
  saveAnalysisResult,
  loadSessionHistory,
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

function IconLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="9" width="1.5" height="6" rx="0.5" />
      <rect x="5" y="6" width="1.5" height="12" rx="0.5" />
      <rect x="8" y="3" width="1.5" height="18" rx="0.5" />
      <rect x="11" y="5" width="1.5" height="14" rx="0.5" />
      <rect x="14" y="2" width="1.5" height="20" rx="0.5" />
      <rect x="17" y="7" width="1.5" height="10" rx="0.5" />
      <rect x="20" y="10" width="1.5" height="4" rx="0.5" />
    </svg>
  );
}

function SidebarNavItem({ icon, label, active = false, href }: { icon: IconName; label: string; active?: boolean; href?: string }) {
  const content = (
    <div
      title={label}
      className={`flex size-12 cursor-pointer items-center justify-center rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${
        active
          ? "bg-white/10 text-white font-medium border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          : "text-white/50 hover:bg-white/5 hover:text-white/80"
      }`}
    >
      <AppIcon name={icon} className={`size-5 ${active ? "text-white" : ""}`} strokeWidth={active ? 2.2 : 1.8} />
    </div>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ScoreMeter({ score, color }: { score: number; color: string }) {
  const data = [{ name: "Score", value: score, fill: color }];

  return (
    <div className="flex flex-col items-center justify-center relative mt-4 h-[120px]">
      <RadialBarChart
        width={220}
        height={150}
        cx={110}
        cy={120}
        innerRadius={75}
        outerRadius={95}
        barSize={20}
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          angleAxisId={0}
          tick={false}
        />
        <RadialBar
          background={{ fill: "#F1F5F9" }}
          dataKey="value"
          cornerRadius={10}
        />
      </RadialBarChart>
      <div className="absolute bottom-2 flex flex-col items-center">
        <span className="text-[48px] font-bold tracking-tighter text-slate-900 leading-none">
          {score}
        </span>
        <span className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Score</span>
      </div>
    </div>
  );
}

function ScoreCard({ cat }: { cat: ScoreCategory }) {
  return (
    <div className="flex flex-col gap-4 border border-slate-100 bg-white p-6 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] group text-center">
      <div className="flex items-center justify-between mb-2">
        <span
          className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full"
          style={{ backgroundColor: cat.tagBg, color: cat.tagColor }}
        >
          {cat.tag.replace(/[\[\]]/g, "").trim()}
        </span>
        <span className="text-[11px] font-medium tracking-widest text-slate-400">{cat.weight.replace(/[\[\]]/g, "").trim()}</span>
      </div>

      <h3 className="text-[18px] font-semibold tracking-tight text-slate-900">
        {cat.title}
      </h3>

      <ScoreMeter score={cat.score} color={cat.barColor} />
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
      tag: "Content Quality",
      weight: "40%",
      title: "What you said",
      score: result.content_score,
      description: contentDetail,
      barColor: "#4F46E5", // Consistent Indigo 600
      tagBg: "#EEF2FF",
      tagColor: "#4338CA",
    },
    {
      id: "delivery",
      tag: "Delivery & Fluency",
      weight: "30%",
      title: "How you said it",
      score: result.delivery_score,
      description: `${result.feedback.delivery} (${dm.wpm} WPM · ${dm.filler_rate}% fillers · avg pause ${dm.avg_pause_sec}s)`,
      barColor: "#4F46E5", // Consistent Indigo 600
      tagBg: "#EEF2FF",
      tagColor: "#4338CA",
    },
    {
      id: "nonverbal",
      tag: "Non-Verbal Presence",
      weight: "30%",
      title: "How you appeared",
      score: result.non_verbal_score,
      description: result.feedback.non_verbal,
      barColor: "#4F46E5", // Consistent Indigo 600
      tagBg: "#EEF2FF",
      tagColor: "#4338CA",
    },
  ];
}

function summaryHeadline(score: number): { line1: string; highlight: string; line2: string } {
  if (score >= 80) {
    return { line1: "You came across", highlight: "thoughtful and prepared", line2: "." };
  }
  if (score >= 65) {
    return { line1: "You came across", highlight: "capable and structured", line2: "with room to polish." };
  }
  return { line1: "You have a", highlight: "solid foundational baseline", line2: "to build on." };
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

  const handleInsightComplete = async (insight: string) => {
    if (!result) return;
    
    // Update local snapshot immutably
    const updatedResult = JSON.parse(JSON.stringify(result));
    updatedResult.feedback.overall_insight = insight;
    saveAnalysisResult(updatedResult);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update history array (most recent match)
    const history = loadSessionHistory();
    const latestSession = history[0];
    if (latestSession && latestSession.result.final_score === result.final_score) {
      latestSession.result.feedback.overall_insight = insight;
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));

      // Persist to DB
      await supabase
        .from("user_history")
        .update({ result: latestSession.result as any })
        .eq("session_id", latestSession.id)
        .eq("user_id", user.id);
    }
  };

  const handleCoachComplete = async (index: number, coachResult: any) => {
    if (!result) return;
    
    // Update local snapshot immutably
    const updatedResult = JSON.parse(JSON.stringify(result));
    if (!updatedResult.feedback.coach_data) updatedResult.feedback.coach_data = {};
    updatedResult.feedback.coach_data[index] = coachResult;
    saveAnalysisResult(updatedResult);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update history array (most recent match)
    const history = loadSessionHistory();
    const latestSession = history[0];
    if (latestSession && latestSession.result.final_score === result.final_score) {
      if (!latestSession.result.feedback.coach_data) latestSession.result.feedback.coach_data = {};
      latestSession.result.feedback.coach_data[index] = coachResult;
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));

      // Persist to DB
      await supabase
        .from("user_history")
        .update({ result: latestSession.result as any })
        .eq("session_id", latestSession.id)
        .eq("user_id", user.id);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-neutral-50 px-8 font-sans">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
          No analysis result found
        </p>
        <p className="max-w-md text-center text-[14px] text-neutral-500 font-light">
          Complete a recording and wait for analysis to finish, or run a new simulation.
        </p>
        <div className="flex gap-3 mt-2">
          <Link
            href="/simulation/setup"
            className="rounded-full bg-neutral-900 px-6 py-2.5 text-[13px] font-medium text-white hover:bg-neutral-800 transition-colors"
          >
            New simulation
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-neutral-200 bg-white px-6 py-2.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
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
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      
      {/* ── SIDEBAR (Floating Conferra Dark Pill Sidebar) ── */}
      <aside className="relative z-20 flex w-[112px] shrink-0 flex-col items-center justify-between py-6 px-4 bg-slate-50">
        <div className="flex flex-col items-center justify-between w-full h-full rounded-[24px] border border-white/10 bg-[#0A0D14] py-8 text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md">
          {/* Top logo & navigation section */}
          <div className="flex flex-col items-center gap-10 w-full">
            <div className="text-white/90 hover:scale-105 transition-transform duration-300">
              <IconLogo size={28} />
            </div>
            <nav className="flex flex-col gap-4">
              <SidebarNavItem icon="clock" label="History" href="/history" />
              <SidebarNavItem icon="dashboard" label="Dashboard" href="/dashboard" />
              <SidebarNavItem icon="eye" label="Simulation" href="/simulation/setup" active />
              <SidebarNavItem icon="chart" label="Analytics" href="/report-cards" />
            </nav>
          </div>
          
          {/* Bottom profile avatar */}
          <div className="size-11 overflow-hidden rounded-full border border-white/10 bg-[#1E1E1E] flex items-center justify-center font-normal text-white text-[15px] shadow-md cursor-pointer hover:bg-white/10 transition-colors">
            U
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT (Elevated Light Island) ── */}
      <main className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-slate-50 isolate">
        
        {/* Layered ambient backgrounds */}
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-indigo-100/50 via-purple-50/20 to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/30 to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />

        <div className="mx-auto w-full max-w-6xl px-8 py-10 lg:px-12 lg:py-12 flex flex-col gap-10">
          
          {/* ── HERO SECTION ── */}
          <BorderGlow
            edgeSensitivity={30}
            glowColor="240 80 80"
            backgroundColor="#0A0D14"
            borderRadius={32}
            glowRadius={40}
            glowIntensity={1.0}
            coneSpread={25}
            animated
            colors={['#c084fc', '#f472b6', '#38bdf8']}
            className="w-full"
          >
            <div className="relative overflow-hidden p-8 sm:p-12 flex flex-col xl:flex-row gap-12 items-center justify-between w-full h-full">
              {/* Animated Aurora Background */}
              <div className="absolute inset-0 opacity-40 pointer-events-none">
                <Aurora
                  colorStops={["#e1dede","#383777","#a2a4f7"]}
                  blend={0.74}
                  amplitude={1.0}
                  speed={1.6}
                />
              </div>
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay pointer-events-none" />
              
              <div className="relative z-10 flex-1 flex flex-col items-start w-full">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white/90 border border-white/10 backdrop-blur-md">
                  <span>{simulationConfig.categoryLabel}</span>
                  <span className="text-white/30">&bull;</span>
                  <span>{simulationConfig.questions.length} Questions</span>
                  <span className="text-white/30">&bull;</span>
                  <span>{durationLabel}</span>
                </div>

                <h1 className="mb-6 text-[40px] sm:text-[48px] font-bold leading-[1.1] tracking-tight text-white">
                  {headline.line1} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-sky-300">{headline.highlight}</span>{headline.line2}
                </h1>
              </div>

              {/* Metric circle score badge */}
              <div className="relative z-10 flex flex-col items-center justify-center self-stretch xl:self-auto min-w-[220px] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-10">
                <span className="text-[88px] font-bold leading-none tracking-tighter text-white drop-shadow-md">
                  {result.final_score}
                </span>
                <span className="mt-3 text-[12px] font-semibold uppercase tracking-widest text-white/60">
                  Overall Score
                </span>
                <span className="mt-4 inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 text-[12px] font-medium text-emerald-300">
                  {performanceLabel(result.final_score)}
                </span>
              </div>
            </div>
          </BorderGlow>

          {/* Main Breakdown Section */}
          <section id="breakdown" className="w-full">
        <div className="mb-8 flex items-baseline justify-between border-b border-neutral-200 pb-4">
          <h2 className="text-[18px] font-bold tracking-tight text-neutral-900">
            Score Breakdown
          </h2>
          <span className="text-[12px] text-neutral-400 font-light">
            Weighted Fusion (40% Content / 30% Delivery / 30% Non-Verbal)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <ScoreCard key={cat.id} cat={cat} />
          ))}
        </div>

        <OverallAIInsight 
          scores={{
            final: result.final_score,
            content: result.content_score,
            delivery: result.delivery_score,
            nonVerbal: result.non_verbal_score
          }}
          feedback={result.feedback}
          cachedInsight={result.feedback.overall_insight}
          onComplete={handleInsightComplete}
        />

        {/* Transcript Box */}
        {result.transcription && (
          <div className="mt-10 flex flex-col gap-5">
            <h4 className="text-[14px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
              Per-Question Transcript
            </h4>
            
            {(() => {
              const parseTranscripts = (text: string) => {
                if (!text) return [];
                // If backend merged with Q1: Q2: prefixes
                if (/Q1:/.test(text)) {
                  return text.split(/Q\d+:/).map(s => s.trim()).filter(Boolean);
                }
                // Otherwise split by double newlines to keep paragraphs together
                return text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
              };
              
              const paragraphs = parseTranscripts(result.transcription);
              const questions = simulationConfig.questions || [];
              
              if (questions.length === 0) return null;

              return (
                <TranscriptCarousel 
                  questions={questions}
                  transcripts={paragraphs}
                  context={{
                    finalScore: result.final_score,
                    contentScore: result.content_score,
                    deliveryScore: result.delivery_score,
                    nonVerbalScore: result.non_verbal_score
                  }}
                  cachedCoachData={result.feedback.coach_data}
                  onCoachComplete={handleCoachComplete}
                />
              );
            })()}
          </div>
        )}

        {/* Action Bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-full border border-neutral-200 bg-white px-6 py-3 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            &larr; Back to dashboard
          </Link>
          <Link
            href="/report-cards"
            className="rounded-full border border-neutral-200 bg-white px-6 py-3 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            View report cards
          </Link>
          <Link
            href="/simulation/setup"
            className="rounded-full bg-neutral-900 px-6 py-3 text-[13px] font-semibold text-white hover:bg-neutral-800 transition-colors shadow-sm"
          >
            Start new simulation
          </Link>
        </div>
      </section>
        </div>
      </main>
    </div>
  );
}
