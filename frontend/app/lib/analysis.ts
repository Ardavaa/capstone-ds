/** Shared types and API helpers for interview analysis. */

export const STORAGE_KEYS = {
  recording: "lumenRecording",
  recordingMeta: "lumenRecordingMeta",
  questionTopic: "lumenQuestionTopic",
  analysisResult: "lumenAnalysisResult",
} as const;

export type DeliveryMetrics = {
  wpm: number;
  filler_count: number;
  filler_rate: number;
  avg_pause_sec: number;
  longest_silence_sec: number;
  duration_sec: number;
};

export type EmotionMetrics = {
  dominant_emotion: string;
  emotion_distribution: Record<string, number>;
  stability_score: number;
  nervous_rate: number;
  emotion_score: number;
  chunks_analyzed: number;
};

export type AnalyzeResponse = {
  final_score: number;
  content_score: number;
  delivery_score: number;
  non_verbal_score: number;
  transcription: string;
  delivery_metrics: DeliveryMetrics;
  emotion_metrics: EmotionMetrics;
  feedback: {
    content: string;
    delivery: string;
    non_verbal: string;
  };
  file_name: string;
  file_size_bytes: number;
};

export type RecordingMeta = {
  mimeType: string;
  durationSec: number;
  recordedAt: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  return API_BASE;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read recording as data URL."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed."));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/db2e86cb-5d4e-4a13-9324-b4da1cb46e7e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b2f3ba'},body:JSON.stringify({sessionId:'b2f3ba',location:'analysis.ts:dataUrlToBlob',message:'split result',data:{dataUrlPrefix:dataUrl.slice(0,120),header,base64Prefix:(base64??'').slice(0,60),base64Length:(base64??'').length,totalCommas:(dataUrl.match(/,/g)||[]).length},timestamp:Date.now(),hypothesisId:'H-A',runId:'run1'})}).catch(()=>{});
  // #endregion
  const mime = header?.match(/:(.*?);/)?.[1] ?? "video/webm";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function saveRecordingToSession(
  blob: Blob,
  meta: Omit<RecordingMeta, "recordedAt"> & { recordedAt?: string },
): Promise<void> {
  const dataUrl = await blobToDataUrl(blob);
  try {
    sessionStorage.setItem(STORAGE_KEYS.recording, dataUrl);
    sessionStorage.setItem(
      STORAGE_KEYS.recordingMeta,
      JSON.stringify({
        mimeType: meta.mimeType,
        durationSec: meta.durationSec,
        recordedAt: meta.recordedAt ?? new Date().toISOString(),
      } satisfies RecordingMeta),
    );
  } catch {
    throw new Error(
      "Recording is too large for browser storage. Try a shorter clip (under ~1 minute).",
    );
  }
}

export function loadRecordingFromSession(): {
  blob: Blob;
  meta: RecordingMeta | null;
} | null {
  const dataUrl = sessionStorage.getItem(STORAGE_KEYS.recording);
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/db2e86cb-5d4e-4a13-9324-b4da1cb46e7e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b2f3ba'},body:JSON.stringify({sessionId:'b2f3ba',location:'analysis.ts:loadRecordingFromSession',message:'sessionStorage read',data:{found:!!dataUrl,prefix:dataUrl?.slice(0,80),lengthKB:dataUrl?Math.round(dataUrl.length/1024):0},timestamp:Date.now(),hypothesisId:'H-B',runId:'run1'})}).catch(()=>{});
  // #endregion
  if (!dataUrl) return null;

  const metaRaw = sessionStorage.getItem(STORAGE_KEYS.recordingMeta);
  let meta: RecordingMeta | null = null;
  if (metaRaw) {
    try {
      meta = JSON.parse(metaRaw) as RecordingMeta;
    } catch {
      meta = null;
    }
  }

  return { blob: dataUrlToBlob(dataUrl), meta };
}

export function getQuestionTopic(): string {
  return (
    sessionStorage.getItem(STORAGE_KEYS.questionTopic)?.trim() ||
    "software engineer technical interview problem solving"
  );
}

export function setQuestionTopic(topic: string): void {
  sessionStorage.setItem(STORAGE_KEYS.questionTopic, topic.trim());
}

export function saveAnalysisResult(result: AnalyzeResponse): void {
  sessionStorage.setItem(STORAGE_KEYS.analysisResult, JSON.stringify(result));
}

export function loadAnalysisResult(): AnalyzeResponse | null {
  const raw = sessionStorage.getItem(STORAGE_KEYS.analysisResult);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalyzeResponse;
  } catch {
    return null;
  }
}

export async function analyzeRecording(
  file: Blob,
  questionTopic: string,
): Promise<AnalyzeResponse> {
  const form = new FormData();
  const filename =
    file.type.includes("webm") ? "interview-recording.webm" : "interview-recording.mp4";
  form.append("file", file, filename);
  form.append("question_topic", questionTopic);

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let detail = `Analysis failed (${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }

  return (await response.json()) as AnalyzeResponse;
}

export function performanceLabel(score: number): string {
  if (score >= 85) return "Strong performance";
  if (score >= 70) return "Solid performance";
  if (score >= 55) return "Room to improve";
  return "Needs work";
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
