"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StepState = "pending" | "active" | "done";

type Step = {
  id: number;
  label: string;
  tech: string;
  duration: number; // ms spent on this step
};

const STEPS: Step[] = [
  { id: 1, label: "Audio Transcription",                   tech: "Whisper",                duration: 2200 },
  { id: 2, label: "Speech Pattern Analysis",               tech: "Wav2Vec2 · Silero VAD",  duration: 2800 },
  { id: 3, label: "Facial Expression & Gesture Detection", tech: "YOLO5Face · MediaPipe",  duration: 3200 },
  { id: 4, label: "Semantic Content Evaluation",           tech: "IndoBERT · S-BERT",      duration: 2600 },
  { id: 5, label: "Generating Feedback",                   tech: "Weighted Fusion",        duration: 2000 },
];

function stepState(stepId: number, activeId: number): StepState {
  if (stepId < activeId) return "done";
  if (stepId === activeId) return "active";
  return "pending";
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect width="14" height="14" rx="2" fill="#3a8377" />
      <polyline points="3,7 6,10 11,4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnalyzingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let step = 1;

    function advance() {
      if (step > STEPS.length) {
        setFinished(true);
        setTimeout(() => router.push("/simulation/result"), 800);
        return;
      }
      setActiveStep(step);
      const duration = STEPS[step - 1]?.duration ?? 2000;
      step += 1;
      setTimeout(advance, duration);
    }

    advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-[#faf7f2] px-12 py-16">
      {/* ── Eyebrow ── */}
      <div className="flex items-center gap-3">
        <div className="h-px w-8 bg-[#0a0a0a]" />
        <span className="text-[11px] uppercase tracking-[2.2px] text-[#bfbfbf]">
          Analyzing your recording
        </span>
      </div>

      {/* ── Headline ── */}
      <h1 className="mt-6 text-[56px] font-bold uppercase leading-[1.05] tracking-[-2px] text-[#0a0a0a]">
        Reading
        <br />
        between
        <br />
        the lines.
      </h1>

      {/* ── Subtitle ── */}
      <p className="mt-6 max-w-[520px] text-[13px] leading-[20px] text-[#0a0a0a]">
        This usually takes about 90 seconds. You can leave this tab open —
        we&apos;ll have results ready when you return.
      </p>

      {/* ── Steps list ── */}
      <div className="mt-10 w-full max-w-[540px] border border-[#0a0a0a]">
        {STEPS.map((step) => {
          const state = finished ? "done" : stepState(step.id, activeStep);
          return (
            <div
              key={step.id}
              className={`flex items-center justify-between border-b border-[#0a0a0a] px-5 py-3.5 last:border-b-0 transition-colors duration-300 ${
                state === "active"
                  ? "bg-[#0a0a0a]"
                  : state === "done"
                  ? "bg-white"
                  : "bg-white"
              }`}
            >
              {/* Left: icon/number + label */}
              <div className="flex items-center gap-3">
                {/* Icon / step number */}
                <div className="flex size-[22px] shrink-0 items-center justify-center">
                  {state === "done" ? (
                    <CheckIcon />
                  ) : (
                    <span
                      className={`flex size-[22px] items-center justify-center border text-[10px] font-bold ${
                        state === "active"
                          ? "border-white/30 text-white"
                          : "border-[#bfbfbf] text-[#bfbfbf]"
                      }`}
                    >
                      {step.id}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[12px] font-medium uppercase tracking-[1px] transition-colors ${
                    state === "active"
                      ? "text-[#faf7f2]"
                      : state === "done"
                      ? "text-[#0a0a0a]"
                      : "text-[#bfbfbf]"
                  }`}
                >
                  {step.label}
                </span>

                {/* Spinner on active */}
                {state === "active" && (
                  <span className="ml-1 size-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                )}
              </div>

              {/* Right: tech stack */}
              <span
                className={`text-[11px] tracking-[0.3px] transition-colors ${
                  state === "active"
                    ? "text-white/50"
                    : state === "done"
                    ? "text-[#bfbfbf]"
                    : "text-[#bfbfbf]/50"
                }`}
              >
                {step.tech}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
