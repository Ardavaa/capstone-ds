import Link from "next/link";

// Figma asset URLs — valid 7 days from 2026-05-22
const ASSET = {
  play:     "https://www.figma.com/api/mcp/asset/a83ce9c2-ab79-4432-8119-ec1fc4d0a07c",
  eye:      "https://www.figma.com/api/mcp/asset/ab541012-035e-446b-abfe-e2be7d08dbed",
  activity: "https://www.figma.com/api/mcp/asset/9ac3c41d-e963-4c59-9ce2-c0184c89f467",
  target:   "https://www.figma.com/api/mcp/asset/ce43c71c-f0d8-415d-a6d5-92019de2e5e8",
};

// ─── Sub-components ────────────────────────────────────────────────────────

function Tag({ label }: { label: string }) {
  return (
    <span className="border border-[#0a0a0a] px-[9px] py-[5px] text-[10px] uppercase tracking-[0.5px] text-[#0a0a0a]">
      {label}
    </span>
  );
}

type FeatureCardProps = {
  icon: string;
  num: string;
  title: string;
  description: string;
  tags: string[];
  borderRight?: boolean;
  paddingLeft?: boolean;
};

function FeatureCard({ icon, num, title, description, tags, borderRight = true, paddingLeft = false }: FeatureCardProps) {
  return (
    <div
      className={`flex flex-col gap-[11px] ${
        borderRight ? "border-r border-[#e8e4dc]" : ""
      } ${paddingLeft ? "pl-8" : ""} ${borderRight ? "pr-8" : "pl-8"}`}
    >
      <div className="flex size-10 items-center justify-center border border-[#0a0a0a] p-px">
        <img src={icon} alt="" className="size-5" />
      </div>

      <p className="pt-[9px] text-[11px] tracking-[1.1px] text-[#bfbfbf]">{num}</p>

      <h3 className="text-[22px] font-bold uppercase leading-[24.2px] tracking-[-0.44px] text-[#0a0a0a]">
        {title}
      </h3>

      <p className="text-[12px] leading-[19.2px] text-[#0a0a0a]">{description}</p>

      <div className="flex flex-wrap gap-1.5 pt-[9px]">
        {tags.map((tag) => (
          <Tag key={tag} label={tag} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col border border-[#0a0a0a] bg-[#faf7f2]">
      {/* ── Top nav ── */}
      <nav className="flex h-16 shrink-0 items-center justify-between border-b border-[#0a0a0a] px-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="size-6 bg-[#0a0a0a]" />
          <span className="text-[14px] font-bold uppercase tracking-[0.7px] text-[#0a0a0a]">
            Lumen
          </span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-8">
          <a href="#how-it-works" className="text-[12px] uppercase tracking-[1.2px] text-[#0a0a0a] hover:text-[#bfbfbf]">
            How it works
          </a>
          <a href="#methodology" className="text-[12px] uppercase tracking-[1.2px] text-[#0a0a0a] hover:text-[#bfbfbf]">
            Methodology
          </a>
          <a href="#about" className="text-[12px] uppercase tracking-[1.2px] text-[#0a0a0a] hover:text-[#bfbfbf]">
            About
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="border border-[#0a0a0a] bg-[#faf7f2] px-5 py-[11px] text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
          >
            Log in
          </Link>
          <Link
            href="/simulation/setup"
            className="border border-[#0a0a0a] bg-[#0a0a0a] px-5 py-[11px] text-[12px] font-medium uppercase tracking-[1.2px] text-[#faf7f2] hover:bg-[#1a1a1a]"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="border-b border-[#0a0a0a] px-12 pb-[61px] pt-20">
        {/* Eyebrow */}
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-[#0a0a0a]" />
          <span className="text-[11px] uppercase tracking-[2.2px] text-[#0a0a0a]">
            [ Multimodal Interview Analysis ]
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-6 max-w-[1100px] text-[64px] font-bold uppercase leading-[64px] tracking-[-2.56px] text-[#0a0a0a]">
          Practice
          <br />
          interviews.
          <br />
          See yourself
          <br />
          clearly.
        </h1>

        {/* Subtitle */}
        <p className="mt-8 max-w-[600px] text-[14px] leading-[22.4px] text-[#0a0a0a]">
          Lumen evaluates your interview performance across voice, words, and presence.
          Multimodal analysis. Quantified feedback. No guesswork.
        </p>

        {/* CTAs */}
        <div className="mt-6 flex items-center gap-3 pt-4">
          <Link
            href="/simulation/setup"
            className="flex items-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-[25px] py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#faf7f2] hover:bg-[#1a1a1a]"
          >
            <img src={ASSET.play} alt="" className="size-4" />
            Start simulation
          </Link>
          <button
            type="button"
            className="border border-[#0a0a0a] bg-[#faf7f2] px-[25px] py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#0a0a0a] hover:bg-black/5"
          >
            Watch demo
          </button>
          <span className="pl-4 text-[11px] uppercase tracking-[1.1px] text-[#bfbfbf]">
            ~ 5 min / session
          </span>
        </div>
      </section>

      {/* ── Feature strip ── */}
      <section id="methodology" className="border-b border-[#0a0a0a] px-12 py-12">
        <div className="grid grid-cols-3">
          <FeatureCard
            icon={ASSET.eye}
            num="[ 01 / VISUAL ]"
            title="Body. Face. Eyes."
            description="Posture tracking, expression stability, eye contact ratio. Surface the confidence signals that interviewers register but rarely articulate."
            tags={["MediaPipe", "YOLO5Face", "FER+"]}
            borderRight
            paddingLeft={false}
          />
          <FeatureCard
            icon={ASSET.activity}
            num="[ 02 / AUDIO ]"
            title="Voice as data."
            description="Prosody, pacing, pauses, filler words. Measured frame by frame. Speaking rate in WPM. Intonation curves. Disfluency counts."
            tags={["Wav2Vec2", "Silero VAD", "Whisper"]}
            borderRight
            paddingLeft
          />
          <FeatureCard
            icon={ASSET.target}
            num="[ 03 / CONTENT ]"
            title="Words that fit."
            description="Semantic alignment between answer and question. Argument structure. Relevance scoring. Contextual coherence."
            tags={["IndoBERT", "S-BERT"]}
            borderRight={false}
            paddingLeft
          />
        </div>
      </section>

      {/* ── Meta strip ── */}
      <footer className="px-12 py-6">
        <span className="text-[11px] uppercase tracking-[1.1px] text-[#bfbfbf]">
          [ Telkom University · Kelompok 19 ]
        </span>
      </footer>
    </div>
  );
}
