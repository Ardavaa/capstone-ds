"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const coachSchema = z.object({
  rewrite: z.object({
    originalTextExcerpt: z.string().describe("A snippet of what the user actually said that needs improvement."),
    improvedAnswer: z.string().describe("How they should have phrased it (cleaner, STAR method)."),
    reasoning: z.string().describe("Why the new phrasing is better."),
  }),
  coaching: z.object({
    strengths: z.array(z.string()).describe("List of 2 things they did well."),
    weaknesses: z.array(z.string()).describe("List of 2 things they need to fix."),
    tips: z.array(z.string()).describe("One actionable pro-tip for next time."),
  }),
});

export type CoachResult = z.infer<typeof coachSchema>;

export async function askAICoach(
  questionText: string, 
  transcript: string,
  context: {
    finalScore: number;
    contentScore: number;
    deliveryScore: number;
    nonVerbalScore: number;
  }
): Promise<CoachResult> {
  const result = await generateObject({
    model: google("models/gemma-4-31b-it"),
    system: "You are an expert interview coach analyzing a candidate's answer. Provide highly constructive feedback.",
    prompt: `The candidate achieved the following overall scores in their interview simulation:
- Overall Score: ${context.finalScore}/100
- Content Quality: ${context.contentScore}/100
- Delivery & Fluency: ${context.deliveryScore}/100
- Non-Verbal Presence: ${context.nonVerbalScore}/100

Question asked: "${questionText}"
Candidate's answer: "${transcript}"

Analyze the candidate's answer taking into account their overall performance context. Provide structured, actionable coaching.`,
    schema: coachSchema,
  });

  return result.object;
}
