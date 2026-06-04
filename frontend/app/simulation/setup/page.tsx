"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AppIcon, { type IconName } from "@/app/components/AppIcon";
import {
  type CategoryId,
  SIMULATION_CATEGORIES,
  saveSimulationConfig,
  type SimulationConfig,
} from "@/app/lib/analysis";


type Category = {
  id: CategoryId;
  icon: IconName;
  name: string;
  meta: string;
};

const CATEGORIES: Category[] = [
  { id: "sw-engineer", icon: "code", name: "SW Engineer", meta: "Technical · 3 Q" },
  { id: "data-analyst", icon: "chart", name: "Data Analyst", meta: "Case · 3 Q" },
  { id: "product-mgr", icon: "briefcase", name: "Product Mgr", meta: "Behavioral · 3 Q" },
  { id: "marketing", icon: "megaphone", name: "Marketing", meta: "Case · 3 Q" },
  { id: "ui-ux", icon: "palette", name: "UI / UX", meta: "Portfolio · 3 Q" },
  { id: "general", icon: "message", name: "General", meta: "Intro · 3 Q" },
];

// ─── Sub-components ────────────────────────────────────────────────────────

type CategoryCardProps = {
  category: Category;
  selected: boolean;
  onClick: () => void;
};

function CategoryCard({ category, selected, onClick }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer flex-col gap-1.5 border border-black p-[25px] text-left transition-colors ${
        selected
          ? "bg-[#0a0a0a] shadow-[0px_4px_2px_rgba(0,0,0,0.25)]"
          : "bg-[#faf7f2] hover:bg-black/5"
      }`}
    >
      {/* Icon wrapper */}
      <div
        className={`flex size-9 items-center justify-center border p-px ${
          selected ? "border-[#faf7f2]" : "border-[#0a0a0a]"
        }`}
      >
        <AppIcon name={category.icon} className="size-5" />
      </div>

      {/* Name */}
      <div className="pt-[18px]">
        <p
          className={`text-[18px] font-bold uppercase tracking-[-0.18px] ${
            selected ? "text-[#faf7f2]" : "text-[#0a0a0a]"
          }`}
        >
          {category.name}
        </p>
      </div>

      {/* Meta */}
      <p className="text-[10px] uppercase tracking-[1px] text-[#bfbfbf]">{category.meta}</p>
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<CategoryId | null>("sw-engineer");
  const [customTopic, setCustomTopic] = useState("");

  const canContinue = selectedId !== null || customTopic.trim().length > 0;

  function buildSimulationConfig(): SimulationConfig {
    const custom = customTopic.trim();
    if (custom) {
      return {
        categoryId: "custom",
        categoryLabel: "Custom Topic",
        questionTopic: custom,
        questions: [
          `Introduce your background for this topic: ${custom}.`,
          "Describe a relevant challenge you have handled and the steps you took.",
          "What would you prioritize in your first 30 days for this role or context?",
        ],
      };
    }

    const category = CATEGORIES.find((c) => c.id === selectedId);
    if (!category) {
      return {
        categoryId: "sw-engineer",
        ...SIMULATION_CATEGORIES["sw-engineer"],
      };
    }

    return {
      categoryId: category.id,
      ...SIMULATION_CATEGORIES[category.id],
    };
  }

  function handleContinue() {
    if (!canContinue) return;
    saveSimulationConfig(buildSimulationConfig());
    router.push("/simulation/preflight");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#faf7f2]">
      {/* ── Top nav ── */}
      <nav className="grid h-16 shrink-0 grid-cols-3 items-center border-b border-[#0a0a0a] px-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="size-6 bg-[#0a0a0a]" />
          <span className="text-[14px] font-bold uppercase tracking-[0.7px] text-[#0a0a0a]">
            Lumen
          </span>
        </div>

        {/* Step breadcrumb (centered) */}
        <div className="flex justify-center">
          <span className="text-[11px] uppercase tracking-[1.65px] text-[#bfbfbf]">
            [ Setup · Step 1 / 2 ]
          </span>
        </div>

        {/* Cancel button */}
        <div className="flex justify-end">
          <Link
            href="/dashboard"
            className="border border-[#0a0a0a] bg-[#faf7f2] px-5 py-[11px] text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
          >
            Cancel
          </Link>
        </div>
      </nav>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-[51px] pb-16 pt-6">
          {/* Progress bar */}
          <div className="flex gap-1">
            <div className="h-1 flex-1 bg-[#0a0a0a]" />
            <div className="h-1 flex-1 bg-[#e8e4dc]" />
          </div>

          {/* Eyebrow */}
          <p className="mt-6 text-[11px] uppercase tracking-[2.2px] text-[#bfbfbf]">
            [ New simulation ]
          </p>

          {/* Title */}
          <h1 className="mt-3 text-[48px] font-bold uppercase leading-[48px] tracking-[-1.44px] text-[#0a0a0a]">
            What are you
            <br />
            preparing for?
          </h1>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-[600px] text-center text-[13px] leading-[20.8px] text-[#0a0a0a]">
            Pick a category. We&apos;ll tailor the questions and the scoring rubric. You can also
            write your own topic below.
          </p>

          {/* Category grid */}
          <div className="mt-10 grid grid-cols-3 border border-black bg-white">
            {CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                selected={selectedId === cat.id}
                onClick={() => setSelectedId(cat.id === selectedId ? null : cat.id)}
              />
            ))}
          </div>

          {/* Custom topic */}
          <div className="mt-6 border border-[#0a0a0a] bg-white p-[25px]">
            <p className="text-[14px] font-bold uppercase tracking-[0.28px] text-[#0a0a0a]">
              [ Or write your own ]
            </p>
            <p className="mb-[10px] mt-1.5 text-[11px] tracking-[0.55px] text-[#bfbfbf]">
              Paste a job description, write a role, or describe the company. We&apos;ll generate
              context-aware questions.
            </p>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g., Senior Backend Engineer at a fintech startup..."
              className="w-full border border-[#0a0a0a] bg-[#faf7f2] px-[15px] py-[13px] text-[13px] text-[#0a0a0a] placeholder:text-[#757575] focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between border-t border-[#0a0a0a] pt-8">
            <Link
              href="/dashboard"
              className="border border-[#0a0a0a] bg-[#faf7f2] px-5 py-[15px] text-[12px] font-medium uppercase tracking-[1.2px] text-[#0a0a0a] hover:bg-black/5"
            >
              ← Back
            </Link>

          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className="flex items-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-[25px] py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#faf7f2] transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:border-[#bfbfbf] disabled:bg-[#bfbfbf]"
          >
            Continue to system check
            <AppIcon name="arrow-right" className="size-4" />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
