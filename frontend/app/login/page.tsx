"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AppIcon from "../components/AppIcon";
import AuthVisualPanel from "../components/AuthVisualPanel";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="flex h-full border border-[#0a0a0a] bg-[#faf7f2]">
      {/* ── Left: visual panel ── */}
      <div className="hidden w-1/2 lg:block">
        <AuthVisualPanel
          quote={`"The interview is a conversation. Lumen listens to the parts you didn't realize you were saying."`}
        />
      </div>

      {/* ── Right: form ── */}
      <div className="flex w-full flex-col items-start justify-center overflow-y-auto border-l border-[#0a0a0a] px-20 py-40 lg:w-1/2">
        {/* Eyebrow */}
        <p className="mb-4 text-[11px] uppercase tracking-[2.2px] text-[#bfbfbf]">
          [ Welcome back ]
        </p>

        {/* Title */}
        <h1 className="mb-2 text-[40px] font-bold uppercase leading-[40px] tracking-[-1.2px] text-[#0a0a0a]">
          Sign in.
        </h1>

        {/* Subtitle */}
        <p className="mb-12 text-[13px] text-[#bfbfbf]">
          Local demo mode only. Accounts are not persisted yet.
        </p>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
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
              placeholder="••••••••••"
              className="w-full border border-[#0a0a0a] bg-[#faf7f2] px-[15px] py-[13px] text-[13px] text-[#0a0a0a] placeholder:text-[#0a0a0a] focus:outline-none"
            />
          </div>

          {/* Remember me + forgot password */}
          <div className="flex items-center justify-between py-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-3.5 appearance-none border border-[#0a0a0a] bg-[#faf7f2] checked:bg-[#0a0a0a]"
              />
              <span className="text-[11px] uppercase tracking-[0.55px] text-[#0a0a0a]">
                Remember me
              </span>
            </label>
            <span className="text-[11px] uppercase tracking-[0.55px] text-[#bfbfbf]">
              Password reset unavailable
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-[25px] py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#faf7f2] hover:bg-[#1a1a1a]"
          >
            Continue locally
            <AppIcon name="arrow-right" className="size-4" />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-[#e8e4dc]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">
              Or continue with
            </span>
            <div className="h-px flex-1 bg-[#e8e4dc]" />
          </div>

          {/* Google */}
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed border border-[#bfbfbf] bg-[#faf7f2] px-[25px] py-[15px] text-[13px] font-medium uppercase tracking-[1.3px] text-[#bfbfbf]"
          >
            Google unavailable
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 w-full text-center text-[12px] uppercase tracking-[0.6px] text-[#0a0a0a]">
          New here?{" "}
          <Link href="/register" className="underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
