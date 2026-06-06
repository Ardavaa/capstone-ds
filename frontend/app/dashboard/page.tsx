"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import AppIcon, { type IconName } from "@/app/components/AppIcon";
import { GlassButton } from "@/components/ui/glass-button";
import ButtonWithIcon from "@/components/ui/button-witn-icon";
import Aurora from "@/components/ui/Aurora";
import BorderGlow from "@/components/ui/BorderGlow";
import {
  formatDuration,
  selectSession,
  STORAGE_KEYS,
  type SessionRecord,
} from "@/app/lib/analysis";

// ─── UTILS & STORAGE ────────────────────────────────────────────────────────

function scoreStyle(score: number) {
  if (score >= 80) return { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-600/20", line: "#10B981" };
  if (score >= 60) return { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-600/20", line: "#F59E0B" };
  return { text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-600/20", line: "#F43F5E" };
}

function subscribeToStorage(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getHistorySnapshot(): string {
  if (typeof window === "undefined") return "";
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

// ─── UI COMPONENTS ──────────────────────────────────────────────────────────

function IconLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
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

function SparklesIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

import { LineChart, Line, ResponsiveContainer } from "recharts";

function Sparkline({ data, color, className = "", isNegative = false }: { data: number[], color: string, className?: string, isNegative?: boolean }) {
  if (!data || data.length === 0) return <div className={`h-12 opacity-10 bg-slate-200 rounded-md w-full ${className}`} />;

  let displayData = data.map((val, index) => ({
    index,
    value: val,
  }));

  if (displayData.length === 1) {
    displayData = [
      { index: 0, value: displayData[0].value },
      { index: 1, value: displayData[0].value },
    ];
  }

  return (
    <div className={`relative w-full h-12 overflow-hidden ${className}`}>
      {/* Subtle baseline reference indicator */}
      <div className="absolute inset-x-0 bottom-[4px] border-b border-slate-100 pointer-events-none" />
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={displayData}
          margin={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Line
            dataKey="value"
            type="monotone"
            stroke={color}
            strokeWidth={1.8}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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

// ─── DASHBOARD PAGE ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const historySnapshot = useSyncExternalStore(subscribeToStorage, getHistorySnapshot, () => "");
  const sessions = useMemo(() => parseHistorySnapshot(historySnapshot), [historySnapshot]);

  const { stats, insights, trends, deltas } = useMemo(() => {
    if (sessions.length === 0) {
      return {
        stats: { avgScore: "0", totalSessions: "0", avgFiller: "0", avgNonVerbal: "0", readiness: 0 },
        insights: { 
          title: "Setup Your Baseline",
          message: "Start your first simulation to establish a performance baseline and unlock personalized AI coaching.",
          badge: "Ready to Start",
          percentile: "Top 100%"
        },
        trends: { scores: [], fillers: [], nvs: [] },
        deltas: { score: 0, filler: 0, nv: 0 }
      };
    }

    const chronological = [...sessions].reverse();
    const scores = chronological.map(s => s.result.final_score);
    const fillers = chronological.map(s => s.result.delivery_metrics.filler_rate);
    const nonVerbals = chronological.map(s => s.result.video_emotion_metrics.frames_analyzed > 0 ? s.result.video_emotion_metrics.non_verbal_score : (s.result.final_score * 0.9));

    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const avgFiller = (fillers.reduce((a, b) => a + b, 0) / fillers.length).toFixed(1);
    const avgNv = Math.round(nonVerbals.reduce((a, b) => a + b, 0) / nonVerbals.length);

    // Calculate readiness metric (0-100 index based on consistency, avg score, and low fillers)
    const readiness = Math.min(100, Math.round((avgScore * 0.6) + (Math.max(0, 100 - parseFloat(avgFiller) * 5) * 0.2) + (avgNv * 0.2)));
    
    let percentile = "Top 45%";
    if (readiness >= 90) percentile = "Top 5%";
    else if (readiness >= 80) percentile = "Top 15%";
    else if (readiness >= 70) percentile = "Top 25%";

    // Deltas calculation (comparing recent half to older half)
    let scoreDelta = 0, fillerDelta = 0, nvDelta = 0;
    if (sessions.length > 1) {
      const half = Math.ceil(chronological.length / 2);
      const recentScores = scores.slice(-half);
      const oldScores = scores.slice(0, half);
      
      const recentAvg = recentScores.reduce((a,b)=>a+b,0)/recentScores.length;
      const oldAvg = oldScores.reduce((a,b)=>a+b,0)/oldScores.length;
      scoreDelta = Math.round(recentAvg - oldAvg);

      const recentFillers = fillers.slice(-half);
      const oldFillers = fillers.slice(0, half);
      fillerDelta = Number(((recentFillers.reduce((a,b)=>a+b,0)/recentFillers.length) - (oldFillers.reduce((a,b)=>a+b,0)/oldFillers.length)).toFixed(1));
    }

    // Insight Logic
    let insightTitle = "Consistent Trajectory";
    let insightMessage = `You're maintaining a steady readiness index of ${readiness}. Focus on pacing and pausing to push into the next percentile bracket.`;
    let insightBadge = "On Track";
    
    if (sessions.length >= 2) {
      if (scoreDelta >= 5) {
        insightTitle = "Accelerated Growth";
        insightMessage = `Incredible momentum! Your performance has surged recently, heavily driven by a drop in filler words and increased non-verbal confidence.`;
        insightBadge = "Trending Up";
      } else if (parseFloat(avgFiller) < 3) {
        insightTitle = "Exceptional Clarity";
        insightMessage = `Your filler word rate is in the top 5% of all users. You speak with high intention, giving your answers significant gravitas.`;
        insightBadge = "Elite Pacing";
      } else if (scoreDelta < -5) {
        insightTitle = "Recalibration Needed";
        insightMessage = `Your recent scores showed a slight dip. This often happens under pressure. Revisit your best sessions to realign your delivery style.`;
        insightBadge = "Focus Area";
      } else if (avgScore >= 85) {
        insightTitle = "Interview Ready";
        insightMessage = `Your metrics indicate you are highly prepared. Your eye contact and structural delivery are operating at a masterful level.`;
        insightBadge = "Masterful";
      }
    }

    return {
      stats: {
        avgScore: String(avgScore),
        totalSessions: String(sessions.length),
        avgFiller: String(avgFiller),
        avgNonVerbal: String(avgNv),
        readiness
      },
      insights: { title: insightTitle, message: insightMessage, badge: insightBadge, percentile },
      trends: {
        scores: scores.length > 1 ? scores : [scores[0] || 0, scores[0] || 0],
        fillers: fillers.length > 1 ? fillers : [fillers[0] || 0, fillers[0] || 0],
        nvs: nonVerbals.length > 1 ? nonVerbals : [nonVerbals[0] || 0, nonVerbals[0] || 0]
      },
      deltas: { score: scoreDelta, filler: fillerDelta, nv: 0 } // simplified nv delta for now
    };
  }, [sessions]);

  const recent = sessions.slice(0, 5);

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
              <SidebarNavItem icon="dashboard" label="Dashboard" href="/dashboard" active />
              <SidebarNavItem icon="eye" label="Simulation" href="/simulation/setup" />
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

        <div className="mx-auto w-full max-w-6xl px-8 py-10 lg:px-12 lg:py-12 flex flex-col gap-8">
          
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
            <div className="relative overflow-hidden p-8 sm:p-10 flex flex-col xl:flex-row gap-10 items-center justify-between w-full h-full">
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
              
              {/* Left: Hero Info */}
              <div className="relative z-10 flex-1 flex flex-col items-start w-full">
                <h2 className="text-3xl sm:text-4xl font-regular text-white tracking-tight mb-4 leading-tight">
                  {insights.title}
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed max-w-2xl font-light mb-8">
                  {insights.message}
                </p>

                {/* Progress Milestones */}
                {sessions.length > 0 && (
                  <div className="flex items-center gap-8 border-t border-white/10 pt-6 w-full max-w-lg">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Readiness Score</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{stats.readiness}</span>
                        <span className="text-sm font-semibold text-slate-500">/100</span>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Current Standing</div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">{insights.percentile}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right: Primary Action Center (Glassmorphism Button) */}
              <div className="relative z-10 shrink-0 flex flex-col items-center xl:items-end w-full xl:w-auto">
                <Link href="/simulation/setup">
                  <ButtonWithIcon />
                </Link>
              </div>
            </div>
          </BorderGlow>

          {/* ── METRICS GRID (Rich Data Storytelling) ── */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            
            {/* Card 1: Performance Avg */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 hover:ring-slate-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex size-12 items-center justify-center rounded-[18px] bg-slate-50 ring-1 ring-slate-100 text-slate-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:ring-indigo-100">
                  <AppIcon name="target" className="size-5" strokeWidth={2.5} />
                </div>
                {deltas.score !== 0 && (
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${deltas.score > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {deltas.score > 0 ? '↑' : '↓'} {Math.abs(deltas.score)} pts
                  </div>
                )}
              </div>
              <div className="relative z-10 mb-6">
                <div className="flex items-baseline gap-1">
                  <div className="text-5xl font-black tracking-tighter text-slate-900">{stats.avgScore}</div>
                  <div className="text-lg font-bold text-slate-400">/100</div>
                </div>
                <div className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Global Score</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                 <Sparkline data={trends.scores} color="#6366F1" />
              </div>
            </div>

            {/* Card 2: Filler Reduction */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 hover:ring-slate-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex size-12 items-center justify-center rounded-[18px] bg-slate-50 ring-1 ring-slate-100 text-slate-600 transition-colors group-hover:bg-amber-50 group-hover:text-amber-600 group-hover:ring-amber-100">
                  <AppIcon name="activity" className="size-5" strokeWidth={2.5} />
                </div>
                {deltas.filler !== 0 && (
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${deltas.filler < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {deltas.filler < 0 ? '↓' : '↑'} {Math.abs(deltas.filler)}%
                  </div>
                )}
              </div>
              <div className="relative z-10 mb-6">
                <div className="flex items-baseline gap-1">
                  <div className="text-5xl font-black tracking-tighter text-slate-900">{stats.avgFiller}</div>
                  <div className="text-lg font-bold text-slate-400">%</div>
                </div>
                <div className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Filler Words</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                 <Sparkline data={trends.fillers} color="#F59E0B" isNegative={true} />
              </div>
            </div>

            {/* Card 3: Confidence / NV */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 hover:ring-slate-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex size-12 items-center justify-center rounded-[18px] bg-slate-50 ring-1 ring-slate-100 text-slate-600 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:ring-emerald-100">
                  <AppIcon name="eye" className="size-5" strokeWidth={2.5} />
                </div>
              </div>
              <div className="relative z-10 mb-6">
                <div className="flex items-baseline gap-1">
                  <div className="text-5xl font-black tracking-tighter text-slate-900">{stats.avgNonVerbal}</div>
                  <div className="text-lg font-bold text-slate-400">/100</div>
                </div>
                <div className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Visual Confidence</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                 <Sparkline data={trends.nvs} color="#10B981" />
              </div>
            </div>

          </div>

          {/* ── PROGRESSION HISTORY (Alive Recent Sessions) ── */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Training History</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Review past simulations to observe your evolving delivery style.</p>
              </div>
              <Link
                href="/history"
                className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
              >
                <span>View Timeline</span>
                <AppIcon name="arrow-right" className="size-3.5" strokeWidth={3} />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-5 rounded-[32px] bg-slate-50/50 py-20 px-6 text-center ring-1 ring-slate-200 border border-dashed border-slate-300">
                <div className="flex size-20 items-center justify-center rounded-[24px] bg-white text-slate-300 shadow-sm ring-1 ring-slate-200">
                  <AppIcon name="file" className="size-8" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xl font-bold text-slate-900 tracking-tight">Awaiting First Session</p>
                  <p className="text-base font-medium text-slate-500 max-w-md">Your chronological progress, coaching badges, and detailed session analysis will populate here.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {recent.map((session, i) => {
                  const r = session.result;
                  const duration = formatDuration(r.delivery_metrics.duration_sec);
                  const style = scoreStyle(r.final_score);

                  return (
                    <Link
                      key={session.id}
                      href={`/report-cards?session=${encodeURIComponent(session.id)}`}
                      onClick={() => selectSession(session)}
                      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-[24px] bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 hover:ring-slate-300"
                    >
                      {/* Left: Score & Details */}
                      <div className="flex items-center gap-6">
                        <div className={`flex size-14 shrink-0 items-center justify-center rounded-[16px] ${style.bg} ${style.text} ring-1 ${style.ring}`}>
                          <span className="text-xl font-black tracking-tighter">{r.final_score}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-bold text-slate-900 tracking-tight transition-colors group-hover:text-indigo-600">
                              {session.questionTopic.length > 50 ? `${session.questionTopic.slice(0, 50)}...` : session.questionTopic}
                            </h4>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <AppIcon name="clock" className="size-4 text-slate-400" />
                              {duration}
                            </span>
                            <span className="size-1 rounded-full bg-slate-300" />
                            <span className="flex items-center gap-1.5">
                              <AppIcon name="dashboard" className="size-4 text-slate-400" />
                              <span className="capitalize">{session.categoryLabel ?? "Simulation"}</span>
                            </span>
                            <span className="size-1 rounded-full bg-slate-300" />
                            <span>{session.date}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right: Metrics Mini-preview & Action */}
                      <div className="flex items-center gap-6 sm:justify-end">
                        <div className="hidden md:flex items-center gap-5 pr-6 border-r border-slate-100">
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fillers</span>
                            <span className="text-sm font-bold text-slate-700">{r.delivery_metrics.filler_rate}%</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pacing</span>
                            <span className="text-sm font-bold text-slate-700">{r.delivery_metrics.wpm} wpm</span>
                          </div>
                        </div>
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                          <AppIcon name="arrow-right" className="size-4" strokeWidth={2.5} />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
