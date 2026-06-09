"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;
  const experience = formData.get("experience") as string;
  const goal = formData.get("goal") as string;
  
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "You must be logged in to complete onboarding." };
  }

  // Update user metadata in Supabase
  const { error } = await supabase.auth.updateUser({
    data: {
      setup_complete: true,
      full_name: fullName,
      job_title: role,
      experience_level: experience,
      primary_goal: goal,
    }
  });

  if (error) {
    return { error: error.message };
  }
  
  redirect("/dashboard");
}
