"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  analyzeRecording,
  getQuestionTopic,
  loadRecordingFromSession,
  saveAnalysisResult,
  saveSessionToHistory,
} from "@/app/lib/analysis";

type StepState = "pending" | "active" | "done";

type Step = {
  id: number;
  label: string;
  tech: string;
};

const STEPS: Step[] = [
  { id: 1, label: "Audio Transcription", tech: "Whisper" },
  { id: 2, label: "Speech Pattern Analysis", tech: "Wav2Vec2 · Silero VAD" },
  { id: 3, label: "Facial Expression Detection", tech: "YOLOv8 · face detector" },
  { id: 4, label: "Semantic Content Evaluation", tech: "IndoBERT · S-BERT" },
  { id: 5, label: "Generating Feedback", tech: "Weighted Fusion" },
];

function stepState(stepId: number, activeId: number, finished: boolean): StepState {
  if (finished || stepId < activeId) return "done";
  if (stepId === activeId) return "active";
  return "pending";
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect width="14" height="14" rx="2" fill="#3a8377" />
      <polyline
        points="3,7 6,10 11,4"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AnalyzingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let step = 1;
    const stepTimer = setInterval(() => {
      step += 1;
      if (step <= STEPS.length) {
        setActiveStep(step);
      }
    }, 3500);

    async function runAnalysis() {
      const recording = await loadRecordingFromSession();
      if (!recording) {
        clearInterval(stepTimer);
        setError("No recording found. Please record your interview again.");
        return;
      }

      try {
        const result = await analyzeRecording(
          recording.blob,
          getQuestionTopic(),
          { mimeType: recording.meta?.mimeType },
        );
        saveAnalysisResult(result);
        saveSessionToHistory(result, getQuestionTopic());
        clearInterval(stepTimer);
        setActiveStep(STEPS.length);
        setFinished(true);
        setTimeout(() => router.push("/simulation/result"), 800);
      } catch (err) {
        clearInterval(stepTimer);
        const message =
          err instanceof Error
            ? err.message
            : "Analysis failed. Check that the backend is running on port 8000.";
        setError(message);
      }
    }

    runAnalysis();

    return () => clearInterval(stepTimer);
  }, [router]);

  return (
    <div className="flex min-h-full flex-col bg-[#faf7f2] px-12 py-16">
      <div className="flex items-center gap-3">
        <div className="h-px w-8 bg-[#0a0a0a]" />
        <span className="text-[11px] uppercase tracking-[2.2px] text-[#bfbfbf]">
          Analyzing your recording
        </span>
      </div>

      <h1 className="mt-6 text-[56px] font-bold uppercase leading-[1.05] tracking-[-2px] text-[#0a0a0a]">
        Reading
        <br />
        between
        <br />
        the lines.
      </h1>

      <p className="mt-6 max-w-[520px] text-[13px] leading-[20px] text-[#0a0a0a]">
        {error
          ? "We could not finish analysis. See the message below and try again."
          : "Uploading your recording and running transcription, delivery metrics, and content scoring. This may take up to a few minutes on first run."}
      </p>

      {error ? (
        <div className="mt-8 max-w-[540px] border border-[#c75240] bg-white p-5">
          <p className="text-[12px] uppercase tracking-[1px] text-[#c75240]">{error}</p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/simulation/recording"
              className="border border-[#0a0a0a] bg-[#0a0a0a] px-4 py-2 text-[11px] font-medium uppercase tracking-[1px] text-[#faf7f2]"
            >
              Record again
            </Link>
            <Link
              href="/simulation/setup"
              className="border border-[#0a0a0a] bg-[#faf7f2] px-4 py-2 text-[11px] font-medium uppercase tracking-[1px] text-[#0a0a0a]"
            >
              Back to setup
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 w-full max-w-[540px] border border-[#0a0a0a]">
          {STEPS.map((step) => {
            const state = stepState(step.id, activeStep, finished);
            return (
              <div
                key={step.id}
                className={`flex items-center justify-between border-b border-[#0a0a0a] px-5 py-3.5 last:border-b-0 transition-colors duration-300 ${
                  state === "active" ? "bg-[#0a0a0a]" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
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

                  {state === "active" && (
                    <span className="ml-1 size-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  )}
                </div>

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
      )}
    </div>
  );
}
