import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const result = streamText({
      model: google('models/gemma-4-31b-it'),
      system: "You are an expert interview evaluator providing an overall summary of the candidate's performance. Read the candidate's scores and feedback, then write a single highly cohesive overall performance summary (3-4 sentences). Highlight the most critical metrics or keywords using **double asterisks** for UI styling. Focus on the overall picture, DO NOT evaluate question by question.",
      prompt,
    });

    return new Response(result.textStream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
