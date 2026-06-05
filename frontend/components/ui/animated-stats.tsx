"use client";

import { useEffect, useRef, useState } from "react";

interface StatItem {
  from: number;
  to: number;
  suffix: string;
  prefix?: string;
  label: string;
  sublabel: string;
}

function useCountUp(to: number, duration = 1800, shouldStart: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * to));
      if (progress < 1) requestAnimationFrame(step);
      else setValue(to);
    };
    requestAnimationFrame(step);
  }, [to, duration, shouldStart]);

  return value;
}

function AnimatedStat({
  item,
  shouldStart,
  index,
}: {
  item: StatItem;
  shouldStart: boolean;
  index: number;
}) {
  const count = useCountUp(item.to, 1600 + index * 100, shouldStart);

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        opacity: shouldStart ? 1 : 0,
        transform: shouldStart ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${index * 0.12}s, transform 0.6s ease ${index * 0.12}s`,
      }}
    >
      {/* Number */}
      <div className="flex items-end gap-0.5 leading-none">
        {item.prefix && (
          <span className="text-[36px] font-black tracking-tight text-slate-900 md:text-[48px]">
            {item.prefix}
          </span>
        )}
        <span className="text-[48px] font-black tracking-tight text-slate-900 md:text-[64px]">
          {count}
        </span>
        <span className="mb-1 text-[28px] font-black tracking-tight text-slate-900 md:text-[36px]">
          {item.suffix}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px w-10 bg-slate-200" />

      {/* Label */}
      <div>
        <p className="text-[15px] font-bold text-slate-800">{item.label}</p>
        <p className="mt-1 max-w-[200px] text-[13px] leading-relaxed text-slate-400">
          {item.sublabel}
        </p>
      </div>
    </div>
  );
}

const STATS: StatItem[] = [
  {
    from: 0,
    to: 3,
    suffix: "×",
    label: "Detailed Dimensions",
    sublabel: "Content, delivery, and non-verbal analysed independently",
  },
  {
    from: 0,
    to: 300,
    suffix: "ms",
    label: "Real-time Detection",
    sublabel: "Facial emotion detection every 300ms during recording",
  },
  {
    from: 0,
    to: 5,
    suffix: "+",
    label: "Interview Tracks",
    sublabel: "SW Engineer, PM, Marketing, UX, Data, and General",
  },
  {
    from: 0,
    to: 100,
    suffix: "%",
    label: "Private by Design",
    sublabel: "Recordings processed locally and never stored remotely",
  },
];

export function AnimatedStatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="border-y border-slate-100 bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        {/* Eyebrow */}
        <p className="mb-14 text-center text-[11px] font-bold uppercase tracking-[2.5px] text-slate-400">
          By the numbers
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-14 sm:grid-cols-4">
          {STATS.map((item, i) => (
            <AnimatedStat
              key={item.label}
              item={item}
              shouldStart={hasStarted}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
