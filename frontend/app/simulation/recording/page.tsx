"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const QUESTIONS = [
  "Tell me about yourself and why you're applying for this role.",
  "Tell me about a time you had to debug a complex production issue. Walk me through your process.",
  "How do you approach system design for a high-traffic application?",
];

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

export default function RecordingPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [currentQ, setCurrentQ] = useState(1); // 1-indexed
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [paused, setPaused] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

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
      } catch (err) {
        console.error("Media error:", err);
        setMediaError("Camera/mic access denied. Please allow permissions and reload.");
      }
    }
    startMedia();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Recording timer
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

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
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push("/simulation/analyzing");
  }

  function handlePause() {
    setPaused((v) => !v);
  }

  const questionText = QUESTIONS[currentQ - 1] ?? QUESTIONS[0];

  return (
    <div className="flex h-full flex-col bg-[#0f1117]">
      {/* ── Top bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-6">
        {/* REC + timer */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[1.5px] text-[#3a8377]">
            <span className="size-2 animate-pulse rounded-full bg-[#c75240]" />
            [ REC ]
          </span>
          <span className="font-mono text-[13px] tracking-[1px] text-[#faf7f2]">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Title */}
        <span className="text-[13px] font-medium uppercase tracking-[1.5px] text-[#faf7f2]">
          SW Engineer Interview
        </span>

        {/* Progress */}
        <span className="text-[11px] uppercase tracking-[1.5px] text-[#bfbfbf]">
          [ Q {currentQ} / {QUESTIONS.length} ]
        </span>
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-6 overflow-hidden">

        {/* Video feed */}
        <div className="relative w-full max-w-[660px] overflow-hidden rounded-2xl bg-[#1a1f2e]" style={{ aspectRatio: "16/9" }}>
          {/* Status badges */}
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.5px] text-[#faf7f2] backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#3a8377]" /> HD
            </span>
            <span className="flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.5px] text-[#faf7f2] backdrop-blur">
              🎤 {micOn ? "ON" : "OFF"}
            </span>
          </div>

          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`size-full object-cover ${!cameraOn ? "hidden" : ""}`}
          />

          {/* Fallback silhouette when cam is off or loading */}
          {!cameraOn && (
            <div className="flex size-full items-center justify-center text-white/20">
              <IconUser />
            </div>
          )}

          {/* Media error overlay */}
          {mediaError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center">
              <p className="text-[12px] uppercase tracking-[1px] text-[#c75240]">{mediaError}</p>
            </div>
          )}

          {/* Name badge */}
          <div className="absolute bottom-3 left-3 rounded bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.5px] text-[#faf7f2] backdrop-blur">
            Rafif R.
          </div>
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
          {QUESTIONS.length > 1 && (
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
                onClick={() => setCurrentQ((q) => Math.min(QUESTIONS.length, q + 1))}
                disabled={currentQ === QUESTIONS.length}
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
            title="End interview"
            className="flex size-14 items-center justify-center rounded-full bg-[#c75240] text-white shadow-lg hover:bg-[#b04030] transition-colors"
          >
            <IconStop />
          </button>

          {/* Pause */}
          <button
            type="button"
            onClick={handlePause}
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
            title="Settings"
            className="flex size-12 items-center justify-center rounded-full bg-white/10 text-[#faf7f2] hover:bg-white/20 transition-colors"
          >
            <IconSliders />
          </button>
        </div>
      </div>
    </div>
  );
}
