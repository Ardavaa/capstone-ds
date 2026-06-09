"use client";

import { useState, useTransition, useEffect } from "react";
import { completeOnboarding } from "./actions";
import { createClient } from "@/utils/supabase/client";

export default function OnboardingPage() {
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [initialName, setInitialName] = useState("");

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setInitialName(user.user_metadata.full_name);
      }
    }
    loadUser();
  }, []);

  async function handleSubmit(formData: FormData) {
    setErrorMsg("");
    startTransition(async () => {
      const result = await completeOnboarding(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 py-12" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Complete your profile</h1>
          <p className="mt-2 text-sm text-slate-500">Help us personalize your interview simulations.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100">
            {errorMsg}
          </div>
        )}

        <form action={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              required
              defaultValue={initialName}
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-700">
              Target Role
            </label>
            <input
              type="text"
              id="role"
              name="role"
              required
              placeholder="e.g. Software Engineer, Product Manager"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label htmlFor="experience" className="mb-2 block text-sm font-medium text-slate-700">
              Experience Level
            </label>
            <select
              id="experience"
              name="experience"
              required
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="" disabled>Select your level</option>
              <option value="Entry-level">Entry-level (0-2 years)</option>
              <option value="Mid-level">Mid-level (3-5 years)</option>
              <option value="Senior">Senior (5+ years)</option>
              <option value="Executive">Executive / Director</option>
            </select>
          </div>

          <div>
            <label htmlFor="goal" className="mb-2 block text-sm font-medium text-slate-700">
              Primary Goal
            </label>
            <select
              id="goal"
              name="goal"
              required
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="" disabled>What do you want to achieve?</option>
              <option value="Build confidence">Build confidence</option>
              <option value="Practice technical questions">Practice technical questions</option>
              <option value="Improve English communication">Improve communication</option>
              <option value="Prepare for an upcoming interview">Prepare for an upcoming interview</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <span>Saving...</span>
              </div>
            ) : (
              "Complete Setup"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
