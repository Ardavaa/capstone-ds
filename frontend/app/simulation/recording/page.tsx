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
import Link from "next/link";
import AppIcon, { type IconName } from "@/app/components/AppIcon";

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

function IconLogo({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="9" width="1.5" height="6" rx="0.5" />
      <rect x="5" y="6" width="1.5" height="12" rx="0.5" />
      <rect x="8" y="3" width="1.5" height="18" rx="0.5" />
      <rect x="11" y="5" width="1.5" height="14" rx="0.5" />
      <rect x="14" y="2" width="1.5" height="20" rx="0.5" />
      <rect x="17" y="7" width="1.5" height="10" rx="0.5" />
      <rect x="20" y="10" width="1.5" height="4" rx="0.5" />
    </svg>
  );
}

function SidebarNavItem({
  icon,
  label,
  active = false,
  href,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  href?: string;
}) {
  const content = (
    <div
      title={label}
      className={`flex size-12 cursor-pointer items-center justify-center rounded-2xl transition-all duration-200 ${
        active
          ? "bg-slate-100 text-slate-900 font-bold border border-slate-200/50 shadow-xs"
          : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      }`}
    >
      <AppIcon name={icon} className={`size-5 ${active ? "text-slate-900" : ""}`} strokeWidth={active ? 2.6 : 2} />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

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

function getCategoryIcon(label: string): IconName {
  const l = label.toLowerCase();
  if (l.includes("software") || l.includes("dev") || l.includes("engineer") || l.includes("code") || l.includes("sw")) return "code";
  if (l.includes("product") || l.includes("pm")) return "briefcase";
  if (l.includes("design") || l.includes("ux") || l.includes("ui")) return "palette";
  if (l.includes("marketing")) return "megaphone";
  if (l.includes("data") || l.includes("analyst") || l.includes("analytics")) return "chart";
  return "target"; // default fallback
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
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(6));

  // Device settings states
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

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

  const avgLevel = useMemo(() => {
    if (phase !== "answering" || !micOn) return 0;
    const sum = audioLevels.reduce((a, b) => a + b, 0);
    const avg = sum / audioLevels.length;
    const pct = Math.min(100, Math.max(0, ((avg - 4) / 32) * 100));
    return pct;
  }, [audioLevels, phase, micOn]);

  // ── Web Audio Analyser effect for voice detection ─────────────────────────
  useEffect(() => {
    if (phase !== "answering" || !micOn || !streamRef.current) {
      setAudioLevels(new Array(16).fill(6));
      return;
    }

    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;

      source = audioContext.createMediaStreamSource(streamRef.current);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        const newLevels = [];
        const barsCount = 16;
        const step = Math.floor(bufferLength / barsCount) || 1;

        for (let i = 0; i < barsCount; i++) {
          let sum = 0;
          const start = i * step;
          for (let j = 0; j < step && (start + j) < bufferLength; j++) {
            sum += dataArray[start + j];
          }
          const average = sum / step;
          
          // Apply Gaussian distribution weight to shape the visualizer like a normal distribution (bell curve)
          const center = 7.5;
          const sigma = 3.2; // controls the spread of the bell curve
          const weight = Math.exp(-Math.pow(i - center, 2) / (2 * Math.pow(sigma, 2)));

          const minHeight = 4;
          const maxHeight = 36;
          // Scale the volume-driven height variation by the Gaussian weight
          const height = minHeight + (average / 255) * (maxHeight - minHeight) * weight;
          newLevels.push(Math.round(height));
        }

        setAudioLevels(newLevels);
        animationFrameId = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error("Failed to initialize Web Audio API:", err);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (source) source.disconnect();
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, [phase, micOn]);

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
        setMediaStream(stream);
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

  const changeDevices = useCallback(async (audioId: string, videoId: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: videoId ? { exact: videoId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          deviceId: audioId ? { exact: audioId } : undefined,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      stream.getAudioTracks().forEach((t) => { t.enabled = micOn; });
      stream.getVideoTracks().forEach((t) => { t.enabled = cameraOn; });

      setSelectedAudioId(audioId);
      setSelectedVideoId(videoId);
    } catch (err) {
      console.error("Failed to change media devices:", err);
      setMediaError("Failed to apply selected camera/microphone. Please try again.");
    }
  }, [micOn, cameraOn]);

  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === "audioinput");
        const videos = devices.filter((d) => d.kind === "videoinput");
        setAudioDevices(audios);
        setVideoDevices(videos);

        if (streamRef.current) {
          const audioTrack = streamRef.current.getAudioTracks()[0];
          const videoTrack = streamRef.current.getVideoTracks()[0];
          if (audioTrack && !selectedAudioId) setSelectedAudioId(audioTrack.getSettings().deviceId || "");
          if (videoTrack && !selectedVideoId) setSelectedVideoId(videoTrack.getSettings().deviceId || "");
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    }

    if (showSettings) {
      void getDevices();
    }
  }, [showSettings, selectedAudioId, selectedVideoId]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ── SIDEBAR ── */}
      <aside className="flex w-[80px] shrink-0 flex-col items-center justify-between border-r border-slate-200 bg-white py-6">
        <div className="flex flex-col items-center gap-8">
          {/* Lumen Brand Logo */}
          <div className="text-[#1C1C1E]">
            <IconLogo size={32} />
          </div>

          {/* Navigation Items (redesigned icon style) */}
          <nav className="flex flex-col gap-6">
            <SidebarNavItem icon="clock" label="History" href="/history" />
            <SidebarNavItem icon="dashboard" label="Dashboard" href="/dashboard" />
            <SidebarNavItem icon="eye" label="Simulation" active />
            <SidebarNavItem icon="user" label="Profile" />
            <SidebarNavItem icon="chart" label="Analytics" href="/report-cards" />
          </nav>
        </div>

        {/* User Profile Avatar */}
        <div className="size-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-white bg-indigo-600 text-sm shadow-inner">
          U
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50 p-6">
        
        {/* ── HEADER ── */}
        <div className="flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to exit this simulation? Progress will be lost.")) {
                    router.push("/simulation/setup");
                  }
                }}
                className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {questionText || "Mock Interview Session"}
                  </h1>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    <AppIcon name={getCategoryIcon(config.categoryLabel || "")} className="size-3.5 text-slate-500" />
                    <span>{config.categoryLabel || "AI Simulation"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── STATS BAR ── */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <AppIcon name="file" className="size-4 text-slate-400" />
                <span>Question: <strong className="text-slate-800">{currentQ} of {questions.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <AppIcon name="clock" className="size-4 text-slate-400" />
                <span>Required: <strong className="text-slate-800">{MIN_ANSWER_SEC}s</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <AppIcon name="target" className="size-4 text-slate-400" />
                <span>Maximum: <strong className="text-slate-800">{formatTime(MAX_ANSWER_SEC)}</strong></span>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm("Are you sure you want to end this simulation? Progress will be lost.")) {
                  router.push("/simulation/setup");
                }
              }}
              className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Exit Simulation
            </button>
          </div>
        </div>

        {/* ── WEBCAM AND ASIDE CHECKLIST PANEL ── */}
        <div className="relative mt-6 flex flex-1 items-stretch gap-6 min-h-0 overflow-hidden">
          
          {/* Main Recording Video Box */}
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-slate-900/10 min-h-[350px]">

            {/* Overlay Time Limit / Recording Pill */}
            <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-white backdrop-blur-md">
              <span className={`size-2 rounded-full ${phase === "answering" ? "bg-red-500 animate-pulse" : "bg-yellow-500"}`} />
              <span className="font-mono text-xs font-semibold tracking-wider">
                {phase === "answering" ? formatTime(elapsed) : "00:00"}
              </span>
            </div>

            {/* Webcam video track */}
            <div ref={containerRef} className="relative flex-1 size-full flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleLoadedMetadata}
                className={`size-full object-cover ${!cameraOn ? "hidden" : ""}`}
              />

              {!cameraOn && (
                <div className="flex size-full flex-col items-center justify-center text-white/20 bg-slate-800/80">
                  <IconUser />
                  <p className="mt-2 text-xs text-white/45">Camera turned off</p>
                </div>
              )}

              {/* Dynamic canvas bounding-box paint for face recognition */}
              {cameraOn && (
                <canvas
                  ref={overlayRef}
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{ width: "100%", height: "100%" }}
                />
              )}

              {/* Countdown loading view */}
              {phase === "countdown" && !mediaError && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-white/40">
                    Q{currentQ} of {questions.length} · Starting in
                  </p>
                  <div
                    key={countdown}
                    className="text-[96px] font-black leading-none tabular-nums text-white"
                    style={{ animation: "countdownPop 0.9s ease-out both" }}
                  >
                    {countdown === 0 ? "GO" : countdown}
                  </div>
                  <p className="mt-4 max-w-[400px] text-center text-sm leading-relaxed text-white/60 px-4">
                    {questionText}
                  </p>
                </div>
              )}

              {/* Between questions saved view */}
              {phase === "between" && !mediaError && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-slate-950/95 backdrop-blur-md">
                  <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="text-center px-6">
                    <p className="text-xs font-semibold uppercase tracking-[3px] text-emerald-500">Answer Saved</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      Ready for Question {currentQ}?
                    </p>
                    <p className="mt-2 max-w-[400px] text-xs leading-relaxed text-white/40">
                      {questions[currentQ - 1]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPhase("countdown"); setCountdown(PRE_ROLL_SEC); }}
                    className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    Start Question {currentQ} <IconArrowRight />
                  </button>
                </div>
              )}

              {/* Media Error block */}
              {(mediaError || saveError) && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-6 text-center">
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
            </div>

            {/* Bottom Controls Panel inside video frame overlay */}
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/40 p-2 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setShowChecklist((v) => !v)}
                title={showChecklist ? "Hide checklist" : "Show checklist"}
                className={`flex size-11 items-center justify-center rounded-full transition-all hover:scale-105 ${
                  showChecklist ? "bg-white/20 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                <AppIcon name="dashboard" className="size-4" />
              </button>

              <button
                onClick={toggleMic}
                className={`flex size-11 items-center justify-center rounded-full transition-all hover:scale-105 ${
                  micOn ? "bg-white/10 text-white/80 hover:bg-white/20" : "bg-rose-500/20 text-rose-500 ring-1 ring-rose-500/30"
                }`}
              >
                <IconMic muted={!micOn} />
              </button>

              {/* End/Proceed button (Red rounded hang-up button) */}
              <button
                onClick={() => void commitAnswer()}
                disabled={!canAdvance || isSaving}
                className={`flex h-11 items-center justify-center rounded-2xl px-6 font-semibold transition-all hover:scale-[1.02] ${
                  canAdvance && !isSaving
                    ? "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20 cursor-pointer"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
              >
                {isSaving ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="rotate-[135deg]">
                      <path d="M21 16.5a1.5 1.5 0 0 1-1-1.5v-2.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V15a1.5 1.5 0 0 1-1 1.5H2v1.5a1.5 1.5 0 0 0 1.5 1.5h17a1.5 1.5 0 0 0 1.5-1.5v-1.5h-1z" />
                    </svg>
                    <span className="text-xs uppercase tracking-wider font-bold">
                      {isLastQ ? "Finish" : "Next Q"}
                    </span>
                  </div>
                )}
              </button>

              <button
                onClick={toggleCamera}
                className={`flex size-11 items-center justify-center rounded-full transition-all hover:scale-105 ${
                  cameraOn ? "bg-white/10 text-white/80 hover:bg-white/20" : "bg-rose-500/20 text-rose-500 ring-1 ring-rose-500/30"
                }`}
              >
                <IconCamera off={!cameraOn} />
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-all hover:scale-105"
              >
                <AppIcon name="settings" className="size-4" />
              </button>
            </div>

            {/* ── Google Meet Style Settings Popover ── */}
            {showSettings && (
              <div className="absolute bottom-20 left-1/2 z-30 w-[320px] -translate-x-1/2 rounded-2xl border border-white/5 bg-[#141414]/98 p-4 text-white shadow-2xl backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device Settings</span>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Microphone Section */}
                  <div className="flex flex-col gap-1.5">
                    <span className="px-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Microphone</span>
                    <div className="flex flex-col max-h-[110px] overflow-y-auto gap-0.5 device-scroll">
                      {audioDevices.map((d) => {
                        const isSelected = d.deviceId === selectedAudioId;
                        return (
                          <button
                            key={d.deviceId}
                            type="button"
                            onClick={() => void changeDevices(d.deviceId, selectedVideoId)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-white/10 text-white font-medium shadow-sm"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <span className="flex size-3.5 shrink-0 items-center justify-center">
                              {isSelected && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-white">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                            <span className="truncate">{d.label || `Microphone ${d.deviceId.slice(0, 5)}`}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Mic volume progress bar */}
                    <div className="mt-1.5 flex items-center gap-2 px-1 py-1 border-t border-white/5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                      <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-75" style={{ width: `${avgLevel}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Camera Section */}
                  <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                    <span className="px-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Camera</span>
                    <div className="flex flex-col max-h-[110px] overflow-y-auto gap-0.5 device-scroll">
                      {videoDevices.map((d) => {
                        const isSelected = d.deviceId === selectedVideoId;
                        return (
                          <button
                            key={d.deviceId}
                            type="button"
                            onClick={() => void changeDevices(selectedAudioId, d.deviceId)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-white/10 text-white font-medium shadow-sm"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <span className="flex size-3.5 shrink-0 items-center justify-center">
                              {isSelected && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-white">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                            <span className="truncate">{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checklist of Questions Sidebar Panel */}
          {showChecklist && (
            <aside className="w-[180px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Checklist
              </div>

              {questions.map((q, idx) => {
                const isCurrent = idx + 1 === currentQ;
                const isDone = idx + 1 < currentQ;
                const isFuture = idx + 1 > currentQ;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col gap-1.5 rounded-2xl border p-3.5 transition-all ${
                      isCurrent
                        ? "border-indigo-200 bg-indigo-50/50 shadow-sm"
                        : isDone
                        ? "border-slate-100 bg-slate-50 opacity-60"
                        : "border-slate-100 bg-white"
                    } ${isFuture ? "blur-sm select-none opacity-30 pointer-events-none" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                        Question {idx + 1}
                      </span>
                      {isDone && (
                        <span className="flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <IconCheck />
                        </span>
                      )}
                      {isFuture && (
                        <span className="text-[9px] font-medium text-slate-400">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-[11px] text-slate-500 leading-normal">
                      {isFuture ? "Question is locked" : q}
                    </p>
                  </div>
                );
              })}
            </aside>
          )}
        </div>

        {/* ── FOOTER: Waveform & Subtitle transcript area ── */}
        <footer className="mt-6 flex items-center gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shrink-0">
          <div className="flex items-end gap-1 h-8 shrink-0">
            {audioLevels.map((h, i) => (
              <span
                key={i}
                className={`w-[3px] rounded-full transition-all duration-75 ${
                  phase === 'answering' && micOn ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                style={{
                  height: `${h}px`
                }}
              />
            ))}
          </div>

          <div className="flex-1 text-xs text-slate-500 leading-relaxed font-light italic">
            {phase === "answering" && micOn ? (
              "Listening... Speak clearly. Your voice is being processed locally by Lumen AI."
            ) : phase === "countdown" ? (
              "Please wait... prepare your answer, camera recording starts in a few seconds."
            ) : (
              "Microphone is standby. Start recording to enable real-time transcript capture."
            )}
          </div>
        </footer>
      </main>

      {/* ── Styles ── */}
      <style>{`
        @keyframes countdownPop {
          0%   { opacity: 0; transform: scale(1.6); }
          30%  { opacity: 1; transform: scale(1.0); }
          85%  { opacity: 1; transform: scale(1.0); }
          100% { opacity: 0; transform: scale(0.7); }
        }
        /* Custom scrollbar for device settings list */
        .device-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .device-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 999px;
        }
        .device-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
        }
        .device-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
}
