"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  DEFAULT_SIMULATION_CONFIG,
  detectFrameEmotion,
  emotionBorderColor,
  type FrameDetection,
  loadSimulationConfig,
  saveRecordingToSession,
  STORAGE_KEYS,
} from "@/app/lib/analysis";

// ─── Icons ─────────────────────────────────────────────────────────────────

function IconMic({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {muted && <line x1="2" y1="2" x2="22" y2="22" />}
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconCamera({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {off && <line x1="2" y1="2" x2="22" y2="22" />}
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

const RECORDER_MIME_CANDIDATES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
  "video/mp4",
] as const;

const MIN_RECORDING_SEC = 1;
const MAX_RECORDING_SEC = 3 * 60;
const COUNTDOWN_WARN_SEC = 30;

function pickRecorderMimeType(): string {
  for (const mime of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

function subscribeToStorage(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSimulationSnapshot(): string {
  return [
    sessionStorage.getItem(STORAGE_KEYS.simulationConfig) ?? "",
    sessionStorage.getItem(STORAGE_KEYS.questionTopic) ?? "",
  ].join("\n");
}



export default function RecordingPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const detectBusyRef = useRef(false);
  const lastDetectionRef = useRef<FrameDetection | null>(null);

  const [currentQ, setCurrentQ] = useState(1); // 1-indexed
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [paused, setPaused] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [liveEmotion, setLiveEmotion] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (video) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        setAspectRatio(w / h);
      }
    }
  }
  const simulationSnapshot = useSyncExternalStore(
    subscribeToStorage,
    getSimulationSnapshot,
    () => "",
  );
  const simulationConfig = useMemo(
    () => (simulationSnapshot ? loadSimulationConfig() : DEFAULT_SIMULATION_CONFIG),
    [simulationSnapshot],
  );

  // ── Direct paint: raw YOLO bbox → canvas, no smoothing ──────────────────
  function _paintOverlay(detection: FrameDetection | null) {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!detection?.bbox) return;

    const { x, y, w, h } = detection.bbox;
    const bx = x * canvas.width;
    const by = y * canvas.height;
    const bw = w * canvas.width;
    const bh = h * canvas.height;
    const color = emotionBorderColor(detection.emotion);

    // Full rectangle — YOLO native style
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.strokeRect(bx, by, bw, bh);

    // Filled label chip at top-left of box — YOLO native style
    const label = `${detection.emotion.toUpperCase()} ${Math.round(detection.confidence * 100)}%`;
    ctx.font = "bold 13px Arial, Helvetica, sans-serif";
    const textW = ctx.measureText(label).width;
    const labelH = 20;
    const PAD = 5;
    const chipY = by >= labelH ? by - labelH : by;
    ctx.fillStyle = color;
    ctx.fillRect(bx, chipY, textW + PAD * 2, labelH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, bx + PAD, chipY + labelH - 5);
  }

  const paintOverlayRef = useRef(_paintOverlay);
  useEffect(() => { paintOverlayRef.current = _paintOverlay; });

  // Repaint on resize so bbox stays aligned with the container
  useEffect(() => {
    const onResize = () => paintOverlayRef.current(lastDetectionRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Server poll: capture frame → backend → draw raw bbox immediately ─────
  useEffect(() => {
    if (!isRecording || !cameraOn || paused) return;

    const POLL_INTERVAL_MS = 300;
    const off = document.createElement("canvas");
    const CAPTURE_WIDTH = 320;

    async function poll() {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || detectBusyRef.current) return;

      detectBusyRef.current = true;
      try {
        const aspect = (video.videoHeight || 480) / (video.videoWidth || 640);
        off.width  = CAPTURE_WIDTH;
        off.height = Math.round(CAPTURE_WIDTH * aspect);
        const offCtx = off.getContext("2d");
        if (!offCtx) return;
        offCtx.drawImage(video, 0, 0, off.width, off.height);

        const blob = await new Promise<Blob | null>((resolve) => {
          off.toBlob((b) => resolve(b), "image/jpeg", 0.75);
        });
        if (!blob) return;

        const detection = await detectFrameEmotion(blob);
        lastDetectionRef.current = detection;
        paintOverlayRef.current(detection);
        setLiveEmotion(detection.bbox ? detection.emotion : null);
      } catch {
        paintOverlayRef.current(null);
        setLiveEmotion(null);
      } finally {
        detectBusyRef.current = false;
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, cameraOn, paused]);

  // Start webcam + mic
  useEffect(() => {
    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          setMediaError(
            "No microphone track detected. Allow mic access and reload the page.",
          );
          return;
        }

        const mimeType = pickRecorderMimeType();

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.start(1000);
        recorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Media error:", err);
        setMediaError("Camera/mic access denied. Please allow permissions and reload.");
      }
    }
    startMedia();
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const remainingSec = Math.max(0, MAX_RECORDING_SEC - elapsed);
  const countdownWarn = remainingSec > 0 && remainingSec <= COUNTDOWN_WARN_SEC;

  // Recording timer (elapsed caps at max; countdown reaches 0 at limit)
  useEffect(() => {
    if (!isRecording || paused || isSaving) return;
    const id = setInterval(
      () =>
        setElapsed((s) => {
          if (s >= MAX_RECORDING_SEC) return s;
          return s + 1;
        }),
      1000,
    );
    return () => clearInterval(id);
  }, [isRecording, paused, isSaving]);

  // Auto-finish and navigate to analyzing when the 3-minute limit is reached
  useEffect(() => {
    if (!isRecording || paused || isSaving) return;
    if (elapsed < MAX_RECORDING_SEC) return;
    handleStop();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to hitting the limit
  }, [elapsed, isRecording, paused, isSaving]);

  function formatTime(s: number) {
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function toggleMic() {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicOn((v) => !v);
  }

  function toggleCamera() {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCameraOn((v) => !v);
  }

  function handleStop() {
    if (isSaving) return;

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setSaveError("No active recording found. Please reload and try again.");
      return;
    }

    if (elapsed < MIN_RECORDING_SEC) {
      setSaveError(`Record at least ${MIN_RECORDING_SEC} seconds before finishing.`);
      return;
    }

    const durationSec = Math.min(elapsed, MAX_RECORDING_SEC);

    setIsSaving(true);
    setSaveError(null);

    recorder.onstop = async () => {
      try {
        const mimeType = recorder.mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size === 0) {
          throw new Error("Recording is empty. Please record again.");
        }

        await saveRecordingToSession(blob, {
          mimeType,
          durationSec,
        });

        streamRef.current?.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        router.push("/simulation/analyzing");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save recording.";
        setSaveError(message);
        setIsSaving(false);
      }
    };

    if (recorder.state === "recording" || recorder.state === "paused") {
      if (typeof recorder.requestData === "function") {
        recorder.requestData();
      }
      recorder.stop();
    }
  }

  function handlePause() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    try {
      if (recorder.state === "recording") {
        recorder.pause();
        setPaused(true);
        return;
      }
      if (recorder.state === "paused") {
        recorder.resume();
        setPaused(false);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to pause recording.");
    }
  }

  const questions = simulationConfig.questions;
  const questionText = questions[currentQ - 1] ?? questions[0];

  return (
    <div className="flex h-full flex-col bg-[#0f1117]">
      {/* ── Top bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-6">
        {/* REC + countdown */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[1.5px] text-[#3a8377]">
            <span className={`size-2 rounded-full ${paused ? "bg-[#c9a227]" : "animate-pulse bg-[#c75240]"}`} />
            {paused ? "[ PAUSED ]" : "[ REC ]"}
          </span>
          <div className="flex items-baseline gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[1.5px] text-[#bfbfbf]">
                Time left
              </span>
              <span
                className={`font-mono text-[15px] font-semibold tracking-[1px] tabular-nums ${
                  countdownWarn ? "text-[#c75240]" : "text-[#faf7f2]"
                }`}
              >
                {formatTime(remainingSec)}
              </span>
            </div>
            <span className="font-mono text-[11px] tracking-[1px] text-[#bfbfbf]/80">
              / {formatTime(MAX_RECORDING_SEC)}
            </span>
          </div>
        </div>

        {/* Title */}
        <span className="text-[13px] font-medium uppercase tracking-[1.5px] text-[#faf7f2]">
          {simulationConfig.categoryLabel} Interview
        </span>

        {/* Progress */}
        <span className="text-[11px] uppercase tracking-[1.5px] text-[#bfbfbf]">
          [ Q {currentQ} / {questions.length} ]
        </span>
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-6 overflow-hidden">

        {/* Video feed — wrapper keeps canvas outside overflow-hidden so bbox isn't clipped */}
        <div
          ref={containerRef}
          className="relative w-full max-w-[660px]"
          style={{ aspectRatio }}
        >
          {/* Inner clip container (rounded corners, bg) */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-[#1a1f2e]">
            {/* Status badges */}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.5px] text-[#faf7f2] backdrop-blur">
                <span className="size-1.5 rounded-full bg-[#3a8377]" /> HD
              </span>
              <span className="flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.5px] text-[#faf7f2] backdrop-blur">
                🎤 {micOn ? "ON" : "OFF"}
              </span>
              {isRecording && (
                <span
                  className={`rounded px-2 py-1 font-mono text-[10px] font-semibold tabular-nums tracking-[0.5px] backdrop-blur ${
                    countdownWarn
                      ? "bg-[#c75240]/80 text-white"
                      : "bg-black/50 text-[#faf7f2]"
                  }`}
                >
                  {formatTime(remainingSec)}
                </span>
              )}
            </div>

            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleLoadedMetadata}
              className={`size-full object-cover ${!cameraOn ? "hidden" : ""}`}
            />

            {/* Fallback silhouette when cam is off or loading */}
            {!cameraOn && (
              <div className="flex size-full items-center justify-center text-white/20">
                <IconUser />
              </div>
            )}

            {/* Media error overlay */}
            {(mediaError || saveError) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center">
                <p className="text-[12px] uppercase tracking-[1px] text-[#c75240]">
                  {mediaError ?? saveError}
                </p>
              </div>
            )}

            {/* Name badge */}
            <div className="absolute bottom-3 left-3 rounded bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.5px] text-[#faf7f2] backdrop-blur">
              Candidate preview
            </div>
          </div>

          {/* Canvas overlay is OUTSIDE overflow-hidden so bbox rect is never clipped */}
          {cameraOn && (
            <canvas
              ref={overlayRef}
              className="pointer-events-none absolute inset-0"
              style={{ width: "100%", height: "100%" }}
            />
          )}

          {liveEmotion && cameraOn && (
            <div className="absolute right-3 top-3 z-20 rounded bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.5px] text-[#faf7f2] backdrop-blur">
              {liveEmotion}
            </div>
          )}
        </div>

        {/* Question card */}
        <div className="w-full max-w-[660px] rounded-2xl bg-[#1a1f2e] px-6 py-5">
          <div className="flex items-start gap-5">
            {/* Question number */}
            <span className="shrink-0 text-[36px] font-bold leading-none tracking-[-1px] text-[#3a8377]">
              {String(currentQ).padStart(2, "0")}
            </span>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[2px] text-[#3a8377]">
                [ Now answering ]
              </span>
              <p className="text-[14px] leading-[22px] text-[#faf7f2]">{questionText}</p>
            </div>
          </div>

          {/* Question navigation */}
          {questions.length > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setCurrentQ((q) => Math.max(1, q - 1))}
                disabled={currentQ === 1}
                className="text-[11px] uppercase tracking-[1px] text-[#bfbfbf] disabled:opacity-30 hover:text-[#faf7f2]"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentQ((q) => Math.min(questions.length, q + 1))}
                disabled={currentQ === questions.length}
                className="text-[11px] uppercase tracking-[1px] text-[#bfbfbf] disabled:opacity-30 hover:text-[#faf7f2]"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div className="shrink-0 border-t border-white/10 py-5">
        <div className="flex items-center justify-center gap-4">
          {/* Mic */}
          <button
            type="button"
            onClick={toggleMic}
            title={micOn ? "Mute mic" : "Unmute mic"}
            className={`flex size-12 items-center justify-center rounded-full transition-colors ${
              micOn
                ? "bg-white/10 text-[#faf7f2] hover:bg-white/20"
                : "bg-[#c75240]/30 text-[#c75240]"
            }`}
          >
            <IconMic muted={!micOn} />
          </button>

          {/* Camera */}
          <button
            type="button"
            onClick={toggleCamera}
            title={cameraOn ? "Turn off camera" : "Turn on camera"}
            className={`flex size-12 items-center justify-center rounded-full transition-colors ${
              cameraOn
                ? "bg-white/10 text-[#faf7f2] hover:bg-white/20"
                : "bg-[#c75240]/30 text-[#c75240]"
            }`}
          >
            <IconCamera off={!cameraOn} />
          </button>

          {/* Stop — primary action */}
          <button
            type="button"
            onClick={handleStop}
            disabled={!isRecording || isSaving}
            title="End interview"
            className="flex size-14 items-center justify-center rounded-full bg-[#c75240] text-white shadow-lg hover:bg-[#b04030] transition-colors disabled:opacity-50"
          >
            <IconStop />
          </button>

          {/* Pause */}
          <button
            type="button"
            onClick={handlePause}
            disabled={!isRecording || isSaving}
            title={paused ? "Resume" : "Pause"}
            className={`flex size-12 items-center justify-center rounded-full transition-colors ${
              paused
                ? "bg-[#3a8377]/30 text-[#3a8377]"
                : "bg-white/10 text-[#faf7f2] hover:bg-white/20"
            }`}
          >
            <IconPause />
          </button>

          {/* Settings */}
          <button
            type="button"
            disabled
            title="Settings unavailable in this demo"
            className="flex size-12 cursor-not-allowed items-center justify-center rounded-full bg-white/5 text-white/25 transition-colors"
          >
            <IconSliders />
          </button>
        </div>
      </div>
    </div>
  );
}
