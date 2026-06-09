"use client";

import { useEffect, useRef } from "react";
import { useCompletion } from "@ai-sdk/react";

export function DynamicScoreDescription({
  title,
  feedback,
  score,
}: {
  title: string;
  feedback: string;
  score: number;
}) {
  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/score-feedback",
  });

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!hasStartedRef.current && feedback) {
      hasStartedRef.current = true;
      complete(`Category: ${title}\nScore: ${score}/100\nOriginal Feedback: ${feedback}\n\nRewrite this into a 2-sentence punchy summary highlighting key metrics in **asterisks**.`);
    }
  }, [feedback, title, score, complete]);

  // Parse text to replace **keyword** with highlight spans
  const parseRichText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const word = part.slice(2, -2);
        return (
          <span key={i} className="font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50">
            {word}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="mt-4 min-h-[60px] text-center flex flex-col items-center">
      {error && (
        <div className="text-[12px] text-rose-500">Failed to generate AI insight.</div>
      )}
      
      {isLoading && !completion && !error ? (
        <div className="flex flex-col items-center gap-2 w-full animate-pulse mt-2">
          <div className="h-3 bg-slate-100 rounded w-full"></div>
          <div className="h-3 bg-slate-100 rounded w-5/6"></div>
          <div className="h-3 bg-slate-100 rounded w-4/6"></div>
        </div>
      ) : (
        <p className="text-[13px] leading-[22px] text-slate-500 font-light transition-opacity duration-300">
          {parseRichText(completion || (isLoading ? "" : feedback))}
        </p>
      )}
    </div>
  );
}
