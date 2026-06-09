"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { login } from "@/app/auth/actions";

// Helper components for the visual enhancement
function CheckmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function LoginPage() {
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const [remember, setRemember] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  async function handleSubmit(formData: FormData) {
    setErrorMsg("");
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      
      {/* Left Form Side */}
      <div className="relative flex w-full flex-col justify-center px-8 py-16 sm:px-16 md:px-24 lg:w-[55%] xl:px-32 bg-white overflow-hidden">
        
        {/* Subtle radial gradient background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(circle at top left, rgba(99, 102, 241, 0.03), transparent 600px)"
        }} />

        <div className="relative z-10 mx-auto w-full max-w-[440px]">
          {/* Social Proof Badge */}
          <div className="mb-8 flex items-center gap-3 rounded-full border border-slate-100 bg-slate-50 py-1.5 pl-2 pr-4 shadow-sm w-fit">
            <div className="flex -space-x-2">
              {[
                "/testi-user/ardava.png",
                "/testi-user/dian.png",
                "/testi-user/emir.jpeg",
                "/testi-user/nauval.jfif",
                "/testi-user/Jewdomelvin.jfif"
              ].map((src, i) => (
                <img key={i} src={src} alt="User" className="size-6 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
            <div className="flex flex-col">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} />)}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                join hundreds of users
              </span>
            </div>
          </div>
          
          <h1 className="text-[36px] font-semibold tracking-tight text-slate-900" style={{ fontFamily: "'Manrope', 'Space Grotesk', 'Google Sans', sans-serif" }}>
            Sign in to Lumen
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
            Sign in to access your dashboard and continue practicing.
          </p>

          <form action={handleSubmit} className="mt-10 flex flex-col gap-5">
            {errorMsg && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {errorMsg}
              </div>
            )}
            
            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-slate-800">
                Email address
              </label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isEmailFocused ? 'text-indigo-500' : 'text-slate-400'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
                    <path d="M2 4l10 8 10-8"/>
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-[15px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-slate-800">
                Password
              </label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isPasswordFocused ? 'text-indigo-500' : 'text-slate-400'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type="password"
                  name="password"
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-[15px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between py-1">
              <label className="flex cursor-pointer items-center gap-2.5 group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border border-slate-200 bg-white checked:bg-indigo-600 checked:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 appearance-none flex items-center justify-center after:content-['✓'] after:text-white after:text-[10px] after:font-bold after:hidden checked:after:block transition-all cursor-pointer"
                />
                <span className="text-[13px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                  Remember me
                </span>
              </label>
              
              <Link href="#" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-500 hover:underline underline-offset-4">
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:bg-indigo-500 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isPending ? "Signing in..." : "Sign In"}
              {!isPending && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-x-0 h-px bg-slate-100" />
              <span className="relative bg-white px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Or continue with
              </span>
            </div>

            {/* Google Button */}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[14px] font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </form>

          {/* Footer Navigation */}
          <p className="mt-8 text-center lg:text-left text-[13px] text-slate-500 leading-relaxed">
            New here?{" "}
            <Link href="/register" className="font-medium text-indigo-600 underline-offset-4 hover:underline">
              Create an account here
            </Link>
          </p>
        </div>
      </div>

      {/* Right Info Side (Dark Glassmorphism) */}
      <div className="relative hidden w-[45%] overflow-hidden bg-[#0A0D14] lg:block">
        
        {/* Subtle Background Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />

        {/* Abstract background glows (animated) */}
        <motion.div 
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.25, 0.38, 0.25],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-20 -top-20 size-96 rounded-full bg-indigo-600/30 blur-[100px]" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.28, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute -bottom-20 -left-20 size-96 rounded-full bg-violet-600/20 blur-[100px]" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.08, 0.18, 0.08],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute top-1/2 left-1/3 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-600/10 blur-[100px]" 
        />
        
        <div className="relative z-20 flex h-full flex-col justify-between p-14 xl:p-20">
          <div>
            <div className="flex items-center gap-2.5 mb-16">
              <div className="flex items-center justify-center text-white">
                <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="9" width="1.5" height="6" rx="0.5" />
                  <rect x="5" y="6" width="1.5" height="12" rx="0.5" />
                  <rect x="8" y="3" width="1.5" height="18" rx="0.5" />
                  <rect x="11" y="5" width="1.5" height="14" rx="0.5" />
                  <rect x="14" y="2" width="1.5" height="20" rx="0.5" />
                  <rect x="17" y="7" width="1.5" height="10" rx="0.5" />
                  <rect x="20" y="10" width="1.5" height="4" rx="0.5" />
                </svg>
              </div>
              <span className="text-[20px] font-medium tracking-tight text-white">Lumen</span>
            </div>
            
            <h2 className="text-[44px] font-semibold leading-[1.1] tracking-[-1.5px] text-white max-w-[440px]" style={{ fontFamily: "'Manrope', 'Space Grotesk', 'Google Sans', sans-serif" }}>
              Realize the potential of AI-driven coaching.
            </h2>

            <ul className="mt-8 flex flex-col gap-4">
              {[
                "Get instant quantified feedback on every answer.",
                "Track your progress across multiple dimensions.",
                "Completely private and bias-free evaluation."
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                    <CheckmarkIcon />
                  </span>
                  <span className="text-[15px] font-light text-white/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-auto pt-10">
            <p className="text-[14px] text-white/50 leading-relaxed font-light">
              Experiencing issues?
              <br />
              Contact us at <a href="mailto:support@lumen.ai" className="font-medium text-white/80 hover:text-white hover:underline underline-offset-4 transition-colors">support@lumen.ai</a>
            </p>
          </div>
        </div>
        
        {/* Animated Floating Glassmorphism Shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Shape 1: Large Floating Glass Pill/Capsule */}
          <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            dragTransition={{ bounceStiffness: 200, bounceDamping: 15 }}
            whileHover={{ scale: 1.03 }}
            whileDrag={{ scale: 1.08 }}
            animate={{
              y: [-10, 15, -10],
              rotate: [12, 18, 12],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute right-[8%] top-[25%] w-72 h-40 rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-2xl backdrop-blur-xl pointer-events-auto cursor-grab active:cursor-grabbing"
            style={{ boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)" }}
          />

          {/* Shape 2: Overlapping Glass Circle */}
          <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.7}
            dragTransition={{ bounceStiffness: 180, bounceDamping: 12 }}
            whileHover={{ scale: 1.03 }}
            whileDrag={{ scale: 1.08 }}
            animate={{
              y: [15, -15, 15],
              x: [-10, 10, -10],
            }}
            transition={{
              duration: 11,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute right-[22%] top-[42%] size-48 rounded-full border border-white/10 bg-gradient-to-tr from-white/5 to-white/0 shadow-2xl backdrop-blur-md pointer-events-auto cursor-grab active:cursor-grabbing"
            style={{ boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)" }}
          />

          {/* Shape 3: Floating Tilted Glass Square */}
          <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.65}
            dragTransition={{ bounceStiffness: 220, bounceDamping: 14 }}
            whileHover={{ scale: 1.03 }}
            whileDrag={{ scale: 1.08 }}
            animate={{
              y: [-20, 20, -20],
              rotate: [-25, -15, -25],
            }}
            transition={{
              duration: 13,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute right-[4%] top-[52%] size-36 rounded-[28px] border border-white/10 bg-gradient-to-bl from-white/5 to-white/0 shadow-2xl backdrop-blur-lg pointer-events-auto cursor-grab active:cursor-grabbing"
            style={{ boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)" }}
          />

          {/* Shape 4: Small glass sphere */}
          <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.8}
            dragTransition={{ bounceStiffness: 250, bounceDamping: 10 }}
            whileHover={{ scale: 1.03 }}
            whileDrag={{ scale: 1.08 }}
            animate={{
              y: [5, -10, 5],
              x: [10, -5, 10],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
            className="absolute right-[36%] top-[20%] size-20 rounded-full border border-white/20 bg-white/10 shadow-xl backdrop-blur-sm pointer-events-auto cursor-grab active:cursor-grabbing"
          />

          {/* Shape 5: Bottom Glass shape (animated) */}
          <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.5}
            dragTransition={{ bounceStiffness: 150, bounceDamping: 18 }}
            whileHover={{ scale: 1.03 }}
            whileDrag={{ scale: 1.08 }}
            animate={{
              y: [0, -12, 0],
              rotate: [32, 38, 32],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-16 right-32 h-64 w-64 rounded-[48px] border border-white/10 bg-gradient-to-tr from-white/5 to-transparent backdrop-blur-2xl shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing"
          />
        </div>
      </div>

    </div>
  );
}
