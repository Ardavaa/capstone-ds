"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Figma asset URLs — valid 7 days from 2026-05-22
const ASSET = {
  code:       "https://www.figma.com/api/mcp/asset/f616f157-027b-4199-a7a0-a7ef9dcabac7",
  chart:      "https://www.figma.com/api/mcp/asset/d01232c9-5eee-44e6-b588-d4fbdd2fa11f",
  briefcase:  "https://www.figma.com/api/mcp/asset/59f3bea5-4da7-46fd-ba77-37e8d7cff40c",
  megaphone:  "https://www.figma.com/api/mcp/asset/3a42a07b-1a41-4d2f-8a0e-22f7f75c5e8a",
  palette:    "https://www.figma.com/api/mcp/asset/2252fb98-204e-45a8-af2c-bd85e9999705",
  message:    "https://www.figma.com/api/mcp/asset/723552c2-bd14-432c-ac10-7d50e7b40c93",
  arrowRight: "https://www.figma.com/api/mcp/asset/38d9321d-ed34-4457-a5a4-a9751057d1b4",
};

type CategoryId = "sw-engineer" | "data-analyst" | "product-mgr" | "marketing" | "ui-ux" | "general";

type Category = {
  id: CategoryId;
  icon: string;
  name: string;
  meta: string;
};

const CATEGORIES: Category[] = [
  { id: "sw-engineer",  icon: ASSET.code,      name: "SW Engineer",  meta: "Technical · 3 Q" },
  { id: "data-analyst", icon: ASSET.chart,     name: "Data Analyst", meta: "Case · 3 Q" },
  { id: "product-mgr",  icon: ASSET.briefcase, name: "Product Mgr",  meta: "Behavioral · 3 Q" },
  { id: "marketing",    icon: ASSET.megaphone,  name: "Marketing",    meta: "Case · 3 Q" },
  { id: "ui-ux",        icon: ASSET.palette,   name: "UI / UX",      meta: "Portfolio · 3 Q" },
  { id: "general",      icon: ASSET.message,   name: "General",      meta: "Intro · 3 Q" },
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
        <img src={category.icon} alt="" className="size-5" />
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
            onClick={() => canContinue && router.push("/simulation/recording")}
            className="flex items-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-[25px] py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#faf7f2] transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:border-[#bfbfbf] disabled:bg-[#bfbfbf]"
          >
            Continue to recording
            <img src={ASSET.arrowRight} alt="" className="size-4" />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
