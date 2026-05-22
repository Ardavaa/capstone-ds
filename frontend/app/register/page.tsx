"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthVisualPanel from "../components/AuthVisualPanel";

const ARROW_RIGHT = "https://www.figma.com/api/mcp/asset/c833f9f6-5d75-4335-a116-2d04c3239539";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="flex h-full border border-[#0a0a0a] bg-[#faf7f2]">
      {/* ── Left: visual panel ── */}
      <div className="hidden w-1/2 lg:block">
        <AuthVisualPanel
          quote={`"Every great interview is rehearsed. Most just don't admit it."`}
        />
      </div>

      {/* ── Right: form ── */}
      <div className="flex w-full flex-col items-start justify-center overflow-y-auto border-l border-[#0a0a0a] px-20 py-24 lg:w-1/2">
        {/* Eyebrow */}
        <p className="mb-4 text-[11px] uppercase tracking-[2.2px] text-[#bfbfbf]">
          [ Begin ]
        </p>

        {/* Title */}
        <h1 className="mb-2 text-[40px] font-bold uppercase leading-[40px] tracking-[-1.2px] text-[#0a0a0a]">
          Create
          <br />
          account.
        </h1>

        {/* Subtitle */}
        <p className="mb-12 text-[13px] text-[#bfbfbf]">Free for students. No credit card.</p>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
          {/* Full name */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[1.65px] text-[#bfbfbf]">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Muhammad Rafif"
              className="w-full border border-[#0a0a0a] bg-[#faf7f2] px-[15px] py-[13px] text-[13px] text-[#0a0a0a] placeholder:text-[#757575] focus:outline-none"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[1.65px] text-[#bfbfbf]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.ac.id"
              className="w-full border border-[#0a0a0a] bg-[#faf7f2] px-[15px] py-[13px] text-[13px] text-[#0a0a0a] placeholder:text-[#757575] focus:outline-none"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[1.65px] text-[#bfbfbf]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full border border-[#0a0a0a] bg-[#faf7f2] px-[15px] py-[13px] text-[13px] text-[#0a0a0a] placeholder:text-[#757575] focus:outline-none"
            />
          </div>

          {/* Terms checkbox */}
          <div className="py-1">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="size-3.5 appearance-none border border-[#0a0a0a] bg-[#faf7f2] checked:bg-[#0a0a0a]"
              />
              <span className="text-[11px] uppercase tracking-[0.55px] text-[#0a0a0a]">
                I agree to the{" "}
                <a href="#" className="underline">
                  terms
                </a>
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!agreed}
            className="flex w-full items-center justify-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-[25px] py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#faf7f2] hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:border-[#bfbfbf] disabled:bg-[#bfbfbf]"
          >
            Create account
            <img src={ARROW_RIGHT} alt="" className="size-4" />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-[#e8e4dc]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">Or</span>
            <div className="h-px flex-1 bg-[#e8e4dc]" />
          </div>

          {/* Google */}
          <button
            type="button"
            className="w-full border border-[#0a0a0a] bg-[#faf7f2] px-[25px] py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#0a0a0a] hover:bg-black/5"
          >
            Continue with Google
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 w-full text-center text-[12px] uppercase tracking-[0.6px] text-[#0a0a0a]">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
