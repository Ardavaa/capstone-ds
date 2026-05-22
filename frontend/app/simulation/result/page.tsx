import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── Mock data ─────────────────────────────────────────────────────────────

const FINAL_SCORE = 87;

const CATEGORIES: ScoreCategory[] = [
  {
    id:          "content",
    tag:         "[ Content Quality ]",
    weight:      "[ 40% ]",
    title:       "What you said.",
    score:       91,
    description: "Strong semantic alignment with the questions. Argument structure was clear. Answers stayed on-topic with concrete examples.",
    barColor:    "#3a8377",
    tagBg:       "#d6e8e2",
    tagColor:    "#3a8377",
  },
  {
    id:          "delivery",
    tag:         "[ Delivery & Fluency ]",
    weight:      "[ 30% ]",
    title:       "How you said it.",
    score:       84,
    description: "Pacing was natural at 142 WPM. Filler word rate was low. Slight monotone during the second answer — vary intonation more.",
    barColor:    "#7e78d2",
    tagBg:       "#ddd9f0",
    tagColor:    "#7e78d2",
  },
  {
    id:          "nonverbal",
    tag:         "[ Non-Verbal ]",
    weight:      "[ 30% ]",
    title:       "How you appeared.",
    score:       82,
    description: "Posture was steady. Eye contact dropped to 64% during Q2 — likely when recalling technical details. Expression read as engaged.",
    barColor:    "#c75240",
    tagBg:       "#f4d9d2",
    tagColor:    "#c75240",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────

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
      {/* Tag + weight */}
      <div className="flex items-center justify-between">
        <span
          className="px-2 py-1 text-[10px] font-bold uppercase tracking-[1px]"
          style={{ backgroundColor: cat.tagBg, color: cat.tagColor }}
        >
          {cat.tag}
        </span>
        <span className="text-[10px] uppercase tracking-[1px] text-[#bfbfbf]">{cat.weight}</span>
      </div>

      {/* Title */}
      <h3 className="text-[22px] font-bold uppercase leading-tight tracking-[-0.4px] text-[#0a0a0a]">
        {cat.title}
      </h3>

      {/* Score */}
      <div className="flex items-baseline gap-1">
        <span className="text-[52px] font-bold leading-none tracking-[-2px] text-[#0a0a0a]">
          {cat.score}
        </span>
        <span className="text-[14px] text-[#bfbfbf]">/100</span>
      </div>

      {/* Bar */}
      <ScoreBar score={cat.score} color={cat.barColor} />

      {/* Description */}
      <p className="text-[12px] leading-[19px] text-[#0a0a0a]">{cat.description}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  return (
    <div className="min-h-full bg-[#faf7f2]">
      {/* ── Top nav ── */}
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="border-b border-[#0a0a0a] px-10 py-10">
        <div className="flex items-start gap-10">
          {/* Left: summary */}
          <div className="flex flex-1 flex-col">
            <p className="mb-4 text-[11px] uppercase tracking-[1.5px] text-[#bfbfbf]">
              [ SW Engineer · 3 Q · 4:33 ]
            </p>

            <h1 className="mb-4 text-[42px] font-bold leading-[1.1] tracking-[-1.2px] text-[#0a0a0a]">
              You came across
              <br />
              as{" "}
              <em className="italic text-[#3a8377]">thoughtful</em>
              <br />
              and prepared.
            </h1>

            <p className="mb-8 max-w-[420px] text-[13px] leading-[20px] text-[#0a0a0a]">
              Strong content quality and clear delivery. Your eye contact
              dipped during the technical question — that&apos;s where most of
              your score drop happened.
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

          {/* Right: big score card */}
          <div className="flex w-[320px] shrink-0 flex-col items-center justify-center rounded-2xl border border-[#e8e4dc] bg-white px-10 py-10 shadow-md">
            <span className="text-[96px] font-bold leading-none tracking-[-4px] text-[#0a0a0a]">
              {FINAL_SCORE}
            </span>
            <span className="mt-2 text-[11px] uppercase tracking-[1.5px] text-[#bfbfbf]">
              [ Out of 100 ]
            </span>
            <p className="mt-3 text-[15px] italic text-[#3a8377]">Strong performance</p>
          </div>
        </div>
      </section>

      {/* ── Score breakdown ── */}
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
          {CATEGORIES.map((cat) => (
            <ScoreCard key={cat.id} cat={cat} />
          ))}
        </div>
      </section>

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-center gap-4 border-t border-[#e8e4dc] px-10 py-8">
        <Link
          href="/dashboard"
          className="border border-[#0a0a0a] bg-[#faf7f2] px-6 py-3 text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
        >
          ← Back to dashboard
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
