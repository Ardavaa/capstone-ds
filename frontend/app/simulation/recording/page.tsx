"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";

import {
  clearSessionAnswers,
  DEFAULT_SIMULATION_CONFIG,
  detectFrameEmotion,
  emotionBorderColor,
  type FrameDetection,
  loadSimulationConfig,
  saveAnswerToSession,
  STORAGE_KEYS,
} from "@/app/lib/analysis";

// ─── Design tokens ─────────────────────────────────────────────────────────
// Dark tech palette from design system:
// bg: #0F172A · surface: #1E293B · accent: #22C55E · text: #F8FAFC
// Typography: Space Grotesk / DM Sans (loaded via next/font or CSS import)

// ─── SVG Icons ──────────────────────────────────────────────────────────────

function IconMic({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {muted && <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2" />}
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconCamera({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {off && <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2" />}
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RECORDER_MIME_CANDIDATES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
  "video/mp4",
] as const;

const MIN_ANSWER_SEC = 30;       // minimum before "Next / Finish" unlocks
const MAX_ANSWER_SEC = 3 * 60;   // hard auto-stop per question
const COUNTDOWN_WARN_SEC = 30;
const PRE_ROLL_SEC = 5;          // 5-4-3-2-1 before answer starts

function pickRecorderMimeType(): string {
  for (const mime of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

function subscribeToStorage(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSimulationSnapshot(): string {
  return [
    sessionStorage.getItem(STORAGE_KEYS.simulationConfig) ?? "",
    sessionStorage.getItem(STORAGE_KEYS.questionTopic) ?? "",
  ].join("\n");
}

// ─── Phases ─────────────────────────────────────────────────────────────────
type Phase =
  | "camera-init"     // loading camera/mic
  | "countdown"       // 5-4-3-2-1 overlay before answer
  | "answering"       // actively recording this question
  | "between"         // saving + brief "ready for next Q" screen
  | "done";           // all Qs answered, submitting

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RecordingPage() {
  const router = useRouter();

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef       = useRef<HTMLVideoElement>(null);
  const overlayRef     = useRef<HTMLCanvasElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const detectBusyRef  = useRef(false);
  const lastDetRef     = useRef<FrameDetection | null>(null);
  const paintRef       = useRef<(d: FrameDetection | null) => void>(() => {});

  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState<Phase>("camera-init");
  const [currentQ, setCurrentQ]   = useState(1);
  const [countdown, setCountdown] = useState(PRE_ROLL_SEC);
  const [elapsed, setElapsed]     = useState(0);
  const [micOn, setMicOn]         = useState(true);
  const [cameraOn, setCameraOn]   = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [liveEmotion, setLiveEmotion] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [isSaving, setIsSaving]     = useState(false);

  // ── Simulation config ──────────────────────────────────────────────────────
  const snap = useSyncExternalStore(subscribeToStorage, getSimulationSnapshot, () => "");
  const config = useMemo(
    () => (snap ? loadSimulationConfig() : DEFAULT_SIMULATION_CONFIG),
    [snap],
  );
  const questions = config.questions;
  const questionText = questions[currentQ - 1] ?? questions[0];

  // ── Derived ────────────────────────────────────────────────────────────────
  const remainingSec   = Math.max(0, MAX_ANSWER_SEC - elapsed);
  const countdownWarn  = remainingSec > 0 && remainingSec <= COUNTDOWN_WARN_SEC;
  const canAdvance     = elapsed >= MIN_ANSWER_SEC && phase === "answering";
  const isLastQ        = currentQ === questions.length;

  // ── Canvas paint ──────────────────────────────────────────────────────────
  function _paint(detection: FrameDetection | null) {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width  = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!detection?.bbox) return;
    const { x, y, w, h } = detection.bbox;
    const bx = x * canvas.width, by = y * canvas.height;
    const bw = w * canvas.width,  bh = h * canvas.height;
    const color = emotionBorderColor(detection.emotion);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.strokeRect(bx, by, bw, bh);
    const label = `${detection.emotion.toUpperCase()} ${Math.round(detection.confidence * 100)}%`;
    ctx.font = "bold 12px 'Space Grotesk', Arial, sans-serif";
    const textW = ctx.measureText(label).width;
    const chipY = by >= 20 ? by - 20 : by;
    ctx.fillStyle = color;
    ctx.fillRect(bx, chipY, textW + 10, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, bx + 5, chipY + 15);
  }

  useEffect(() => { paintRef.current = _paint; });
  useEffect(() => {
    const onResize = () => paintRef.current(lastDetRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Frame emotion poll ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "answering" || !cameraOn) return;
    const POLL_MS = 350;
    const off = document.createElement("canvas");
    async function poll() {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || detectBusyRef.current) return;
      detectBusyRef.current = true;
      try {
        const aspect = (video.videoHeight || 480) / (video.videoWidth || 640);
        off.width  = 320;
        off.height = Math.round(320 * aspect);
        const offCtx = off.getContext("2d");
        if (!offCtx) return;
        offCtx.drawImage(video, 0, 0, off.width, off.height);
        const blob = await new Promise<Blob | null>((res) => off.toBlob(res, "image/jpeg", 0.75));
        if (!blob) return;
        const det = await detectFrameEmotion(blob);
        lastDetRef.current = det;
        paintRef.current(det);
        setLiveEmotion(det.bbox ? det.emotion : null);
      } catch {
        paintRef.current(null);
        setLiveEmotion(null);
      } finally {
        detectBusyRef.current = false;
      }
    }
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cameraOn]);

  // ── Start camera ──────────────────────────────────────────────────────────
  useEffect(() => {
    clearSessionAnswers(); // fresh interview
    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (stream.getAudioTracks().length === 0) {
          setMediaError("No microphone detected. Allow mic access and reload.");
          return;
        }
        // Ready — start countdown for Q1
        setPhase("countdown");
        setCountdown(PRE_ROLL_SEC);
      } catch (err) {
        console.error(err);
        setMediaError("Camera/mic access denied. Allow permissions and reload.");
      }
    }
    initMedia();
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      startAnswering();
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  // ── Answer timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "answering" || isSaving) return;
    const id = setInterval(() => {
      setElapsed((s) => {
        if (s >= MAX_ANSWER_SEC) return s;
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, isSaving]);

  // ── Auto-stop when max time reached ───────────────────────────────────────
  useEffect(() => {
    if (phase !== "answering" || isSaving) return;
    if (elapsed < MAX_ANSWER_SEC) return;
    void commitAnswer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, phase, isSaving]);

  // ── Start answering for current question ──────────────────────────────────
  function startAnswering() {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = pickRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setElapsed(0);
    setPhase("answering");
    setSaveError(null);
  }

  // ── Commit current answer and move to next question or done ───────────────
  const commitAnswer = useCallback(async () => {
    if (isSaving) return;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setIsSaving(true);
    setSaveError(null);

    const qText    = questions[currentQ - 1] ?? questions[0] ?? "";
    const qIndex   = currentQ;
    const durSec   = Math.min(elapsed, MAX_ANSWER_SEC);
    const mimeType = recorder.mimeType || "video/webm";

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          if (blob.size === 0) throw new Error("Recording was empty. Please try again.");
          await saveAnswerToSession(blob, {
            questionIndex: qIndex,
            questionText: qText,
            mimeType,
            durationSec: durSec,
            recordedAt: new Date().toISOString(),
          });

          recorderRef.current = null;
          chunksRef.current = [];
          setIsSaving(false);

          if (isLastQ || qIndex >= questions.length) {
            setPhase("done");
          } else {
            setCurrentQ((q) => q + 1);
            setPhase("between");
          }
          resolve();
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : "Failed to save. Try again.");
          setIsSaving(false);
          resolve();
        }
      };

      if (recorder.state === "recording" || recorder.state === "paused") {
        if (typeof recorder.requestData === "function") recorder.requestData();
        recorder.stop();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaving, currentQ, elapsed, questions, isLastQ]);

  // ── Phase: done → navigate to analyzing ───────────────────────────────────
  useEffect(() => {
    if (phase !== "done") return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push("/simulation/analyzing");
  }, [phase, router]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (v?.videoWidth && v?.videoHeight) setAspectRatio(v.videoWidth / v.videoHeight);
  }

  function toggleMic() {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicOn((v) => !v);
  }
  function toggleCamera() {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCameraOn((v) => !v);
  }

  function formatTime(s: number) {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // ── Progress dots ─────────────────────────────────────────────────────────
  function ProgressDots() {
    return (
      <div className="flex items-center gap-2">
        {questions.map((_, i) => {
          const qi = i + 1;
          const done = phase === "answering" ? qi < currentQ : qi <= currentQ;
          const active = qi === currentQ && phase === "answering";
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
                  done
                    ? "bg-[#22C55E] text-white"
                    : active
                    ? "bg-white text-[#0F172A] ring-2 ring-white/40 ring-offset-2 ring-offset-[#0F172A]"
                    : "border border-white/20 text-white/30"
                }`}
              >
                {done ? <IconCheck /> : qi}
              </div>
              {i < questions.length - 1 && (
                <div className={`h-px w-6 transition-colors duration-500 ${done ? "bg-[#22C55E]" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="relative flex h-full flex-col bg-[#0F172A]" style={{ fontFamily: "'Space Grotesk', 'DM Sans', system-ui, sans-serif" }}>

      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
        {/* Left: REC indicator + timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${
                phase === "answering"
                  ? "animate-pulse bg-[#EF4444]"
                  : phase === "countdown"
                  ? "bg-[#F59E0B] animate-ping"
                  : "bg-white/20"
              }`}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[2px] text-white/50">
              {phase === "answering" ? "REC" : phase === "countdown" ? "STARTING" : "STANDBY"}
            </span>
          </div>
          {phase === "answering" && (
            <div className={`font-mono text-[15px] font-semibold tabular-nums transition-colors ${countdownWarn ? "text-[#EF4444]" : "text-white/80"}`}>
              {formatTime(elapsed)}<span className="text-white/20 mx-1">/</span>{formatTime(MAX_ANSWER_SEC)}
            </div>
          )}
        </div>

        {/* Center: session title */}
        <span className="text-[11px] font-semibold uppercase tracking-[2px] text-white/40">
          {config.categoryLabel} Interview
        </span>

        {/* Right: progress */}
        <ProgressDots />
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-6 py-5">

        {/* ── Camera feed ── */}
        <div
          ref={containerRef}
          className="relative w-full max-w-[640px]"
          style={{ aspectRatio }}
        >
          {/* Inner clipped area */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-[#1E293B]">
            {/* Top-left badges */}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-[#22C55E]" /> LIVE
              </span>
              <span className={`flex items-center gap-1.5 rounded-md bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm ${micOn ? "text-white/80" : "text-[#EF4444]"}`}>
                <IconMic muted={!micOn} />
                {micOn ? "MIC ON" : "MUTED"}
              </span>
              {phase === "answering" && (
                <span className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-bold tabular-nums tracking-wide backdrop-blur-sm ${countdownWarn ? "bg-[#EF4444]/80 text-white" : "bg-black/50 text-white/70"}`}>
                  {formatTime(remainingSec)} left
                </span>
              )}
            </div>

            {/* Live emotion top-right */}
            {liveEmotion && cameraOn && phase === "answering" && (
              <div className="absolute right-3 top-3 z-20 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-sm">
                {liveEmotion}
              </div>
            )}

            {/* Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleLoadedMetadata}
              className={`size-full object-cover ${!cameraOn ? "hidden" : ""}`}
            />

            {/* Camera off placeholder */}
            {!cameraOn && (
              <div className="flex size-full items-center justify-center text-white/10">
                <IconUser />
              </div>
            )}

            {/* Media / save error overlay */}
            {(mediaError || saveError) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
                <div className="max-w-xs">
                  <p className="text-[12px] font-medium uppercase tracking-[1px] text-[#EF4444]">
                    {mediaError ?? saveError}
                  </p>
                  {saveError && (
                    <button
                      type="button"
                      onClick={() => { setSaveError(null); setPhase("countdown"); setCountdown(PRE_ROLL_SEC); }}
                      className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── COUNTDOWN overlay ── */}
            {phase === "countdown" && !mediaError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0F172A]/90 backdrop-blur-sm">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
                  Q{currentQ} of {questions.length} · Starting in
                </p>
                <div
                  key={countdown}
                  className="text-[96px] font-black leading-none tabular-nums text-white"
                  style={{ animation: "countdownPop 0.9s ease-out both" }}
                >
                  {countdown === 0 ? "GO" : countdown}
                </div>
                <p className="mt-4 max-w-[340px] text-center text-[12px] leading-relaxed text-white/30">
                  {questionText}
                </p>
              </div>
            )}

            {/* ── BETWEEN-Q overlay ── */}
            {phase === "between" && !mediaError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-[#0F172A]/95 backdrop-blur-sm">
                <div className="flex size-16 items-center justify-center rounded-full bg-[#22C55E]/20 text-[#22C55E]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[3px] text-[#22C55E]">Answer Saved</p>
                  <p className="mt-1 text-[15px] font-semibold text-white">
                    Ready for Question {currentQ}?
                  </p>
                  <p className="mt-2 max-w-[300px] text-[12px] leading-relaxed text-white/40">
                    {questions[currentQ - 1]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPhase("countdown"); setCountdown(PRE_ROLL_SEC); }}
                  className="flex items-center gap-2 rounded-xl bg-[#22C55E] px-6 py-3 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-[#16A34A] transition-colors cursor-pointer"
                >
                  Start Q{currentQ} <IconArrowRight />
                </button>
              </div>
            )}

            {/* Name badge */}
            <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/60 backdrop-blur-sm">
              Candidate
            </div>
          </div>

          {/* Canvas overlay OUTSIDE overflow-hidden */}
          {cameraOn && (
            <canvas
              ref={overlayRef}
              className="pointer-events-none absolute inset-0"
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </div>

        {/* ── Question card ── */}
        {phase === "answering" && (
          <div className="w-full max-w-[640px] rounded-2xl border border-white/[0.07] bg-[#1E293B] px-6 py-5">
            <div className="flex items-start gap-5">
              {/* Big Q number */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[2px] text-white/30">Q</span>
                <span className="text-[40px] font-black leading-none tracking-tight text-[#22C55E]">
                  {String(currentQ).padStart(2, "0")}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[#22C55E]/70">
                  Now answering
                </span>
                <p className="text-[14px] leading-[22px] text-white/85">
                  {questionText}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${countdownWarn ? "bg-[#EF4444]" : "bg-[#22C55E]"}`}
                style={{ width: `${Math.min(100, (elapsed / MAX_ANSWER_SEC) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-[10px] text-white/25">
                {elapsed < MIN_ANSWER_SEC ? `min ${MIN_ANSWER_SEC}s needed` : "ready to advance"}
              </span>
              <span className={`text-[10px] ${countdownWarn ? "text-[#EF4444]" : "text-white/25"}`}>
                {formatTime(remainingSec)} remaining
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="shrink-0 border-t border-white/[0.06] py-5">
        <div className="flex items-center justify-center gap-4">
          {/* Mic toggle */}
          <button
            type="button"
            onClick={toggleMic}
            title={micOn ? "Mute mic" : "Unmute mic"}
            className={`flex size-12 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
              micOn ? "bg-white/8 text-white/70 hover:bg-white/15" : "bg-[#EF4444]/20 text-[#EF4444] ring-1 ring-[#EF4444]/30"
            }`}
          >
            <IconMic muted={!micOn} />
          </button>

          {/* Camera toggle */}
          <button
            type="button"
            onClick={toggleCamera}
            title={cameraOn ? "Turn off camera" : "Turn on camera"}
            className={`flex size-12 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
              cameraOn ? "bg-white/8 text-white/70 hover:bg-white/15" : "bg-[#EF4444]/20 text-[#EF4444] ring-1 ring-[#EF4444]/30"
            }`}
          >
            <IconCamera off={!cameraOn} />
          </button>

          {/* Primary action: Next Q or Finish */}
          {phase === "answering" && (
            <button
              type="button"
              onClick={() => void commitAnswer()}
              disabled={!canAdvance || isSaving}
              title={
                !canAdvance
                  ? `Keep answering — at least ${MIN_ANSWER_SEC}s required`
                  : isLastQ
                  ? "Finish interview"
                  : "Save answer & go to next question"
              }
              className={`relative flex h-12 items-center gap-2.5 rounded-full px-6 text-[13px] font-bold uppercase tracking-wide transition-all duration-300 cursor-pointer ${
                canAdvance && !isSaving
                  ? isLastQ
                    ? "bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/20 hover:bg-[#16A34A]"
                    : "bg-white text-[#0F172A] shadow-lg shadow-white/10 hover:bg-white/90"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
            >
              {isSaving ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : isLastQ ? (
                <>
                  <IconCheck />
                  Finish Interview
                </>
              ) : (
                <>
                  Next Question
                  <IconArrowRight />
                </>
              )}
              {/* Unlock progress ring when not yet eligible */}
              {!canAdvance && phase === "answering" && elapsed < MIN_ANSWER_SEC && (
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-white/25">
                  {MIN_ANSWER_SEC - elapsed}s until unlocked
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Countdown animation keyframes ── */}
      <style>{`
        @keyframes countdownPop {
          0%   { opacity: 0; transform: scale(1.6); }
          30%  { opacity: 1; transform: scale(1.0); }
          85%  { opacity: 1; transform: scale(1.0); }
          100% { opacity: 0; transform: scale(0.7); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap');
      `}</style>
    </div>
  );
}
