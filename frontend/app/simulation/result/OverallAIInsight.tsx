"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/app/components/AppIcon";

export function OverallAIInsight({
  scores,
  feedback,
}: {
  scores: any;
  feedback: any;
}) {
  const [streamedText, setStreamedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasStarted) return;
    setHasStarted(true);
    setIsLoading(true);

    async function fetchStream() {
      try {
        const prompt = `Overall Score: ${scores.final}/100\nContent: ${scores.content}/100\nDelivery: ${scores.delivery}/100\nNon-verbal: ${scores.nonVerbal}/100\n\nOriginal Feedback Data:\n${JSON.stringify(feedback)}\n\nWrite a 3-sentence overall summary with **highlights**.`;
        const response = await fetch("/api/score-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.body) {
          setError("No response body");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setStreamedText((prev) => prev + chunk);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStream();
  }, [hasStarted, scores, feedback]);

  const parseRichText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const word = part.slice(2, -2);
        return (
          <span key={i} className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 shadow-sm mx-0.5 inline-block">
            {word}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="mt-8 border border-indigo-100 bg-white rounded-[20px] p-6 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100/40 to-transparent blur-2xl rounded-full" />
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 relative z-10">
        <AppIcon name="ai" className="size-5 text-indigo-600" />
        <h3 className="text-[14px] font-bold uppercase tracking-widest text-slate-900">
          AI Overall Evaluation
        </h3>
      </div>

      <div className="min-h-[60px] relative z-10">
        {error && (
          <div className="text-[13px] text-rose-500 font-medium">Failed to load AI evaluation: {error}</div>
        )}

        {isLoading && !streamedText && !error ? (
          <div className="flex flex-col gap-3 w-full animate-pulse mt-2">
            <div className="h-3 bg-slate-100 rounded-full w-full"></div>
            <div className="h-3 bg-slate-100 rounded-full w-5/6"></div>
            <div className="h-3 bg-slate-100 rounded-full w-4/6"></div>
          </div>
        ) : (
          <p className="text-[14px] leading-[28px] text-slate-600 font-light transition-opacity duration-300">
            {parseRichText(streamedText || "Waiting for evaluation...")}
          </p>
        )}
      </div>
    </div>
  );
}
