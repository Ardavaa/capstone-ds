"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// ─── Navbar Scroll Effect ───────────────────────────────────────────────────
export function ScrollNavbar({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll(); // initial check
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none">
      <nav
        className={`group pointer-events-auto flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? "is-scrolled w-[calc(100%-40px)] max-w-[860px] rounded-[32px] mt-4 px-4 py-2.5"
            : "w-full max-w-full rounded-none mt-0 px-8 py-5 md:px-12"
        }`}
        style={{
          background: scrolled ? "rgba(10, 13, 20, 0.85)" : "rgba(10, 13, 20, 0)",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "blur(0px) saturate(100%)",
          boxShadow: scrolled
            ? "0 8px 32px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset"
            : "0 0px 0px rgba(0,0,0,0), 0 0px 0 rgba(255,255,255,0) inset",
          border: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0)",
        }}
      >
        {children}
      </nav>
    </div>
  );
}

// ─── Reveal on Scroll ───────────────────────────────────────────────────────
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: RevealProps) {
  const directionVariants = {
    up: { y: 48, opacity: 0 },
    down: { y: -48, opacity: 0 },
    left: { x: -48, opacity: 0 },
    right: { x: 48, opacity: 0 },
    none: { opacity: 0 },
  };

  return (
    <motion.div
      className={className}
      initial={directionVariants[direction]}
      whileInView={{ x: 0, y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{
        duration: 0.8,
        delay: delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger Children ───────────────────────────────────────────────────────
export function StaggerReveal({
  children,
  className = "",
  staggerMs = 120,
}: {
  children: React.ReactNode[];
  className?: string;
  staggerMs?: number;
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerMs / 1000,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };


  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
    >
      {children.map((child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
