"use client";

import * as React from "react";
import { useRef, useState, useEffect } from "react";
import { useScroll, motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Reveal } from "@/components/ui/scroll-effects";
import Aurora from "@/components/ui/Aurora";

// We copy the SVG icons from page.tsx so this component is self-contained
function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconArrowUpRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

interface ScrollCTAProps {
  words: string[];
}

export default function ScrollCTA({ words }: ScrollCTAProps) {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [width, setWidth] = useState("auto");
  const measureRef = useRef<HTMLDivElement>(null);

  // Update index based on scroll
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      // Avoid letting index go out of bounds
      const nextIndex = Math.min(
        words.length - 1,
        Math.floor(latest * words.length)
      );
      if (nextIndex !== currentIndex) {
        setCurrentIndex(nextIndex);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress, words.length, currentIndex]);

  // Measure word width
  useEffect(() => {
    if (measureRef.current) {
      const elements = measureRef.current.children;
      if (elements.length > currentIndex) {
        const newWidth = elements[currentIndex].getBoundingClientRect().width;
        setWidth(`${newWidth}px`);
      }
    }
  }, [currentIndex]);

  const containerVariants = {
    hidden: { 
      y: -20,
      opacity: 0,
      filter: "blur(8px)"
    },
    visible: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: { 
      y: 20,
      opacity: 0,
      filter: "blur(8px)",
      transition: { 
        duration: 0.3, 
        ease: "easeIn"
      }
    },
  };

  return (
    <section ref={containerRef} className="relative bg-[#0A0D14]" style={{ height: `${words.length * 60}vh` }}>
      {/* Sticky container that stays on screen while scrolling the section */}
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden px-6 text-center">
        
        {/* Animated Aurora Background */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <Aurora
            colorStops={["#e1dede","#383777","#a2a4f7"]}
            blend={0.74}
            amplitude={1.0}
            speed={1.6}
          />
        </div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay pointer-events-none" />

        {/* Top & Bottom Fade Overlays for seamless blending */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#0A0D14] to-[#0A0D14]/0 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0A0D14] to-[#0A0D14]/0 pointer-events-none" />

        <Reveal className="relative z-10 mx-auto max-w-[800px]">
          <h2 className="text-[40px] font-light leading-tight tracking-[-1px] text-white sm:text-[56px] lg:text-[64px]">
            Your <span className="relative inline-block">
              {/* Hidden measurement div */}
              <div 
                ref={measureRef} 
                aria-hidden="true"
                className="absolute opacity-0 pointer-events-none"
                style={{ visibility: "hidden" }}
              >
                {words.map((word, i) => (
                  <span key={i} className="font-semibold text-white">
                    {word}
                  </span>
                ))}
              </div>

              {/* Visible animated word */}
              <motion.span 
                className="relative inline-block text-white font-semibold"
                animate={{ 
                  width,
                  transition: { 
                    type: "spring",
                    stiffness: 150,
                    damping: 15,
                    mass: 1.2,
                  }
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={currentIndex}
                    className="inline-block"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {words[currentIndex]}
                  </motion.span>
                </AnimatePresence>
              </motion.span>
            </span> <br className="hidden sm:block" /> deserves better preparation.
          </h2>

          <p className="mx-auto mt-5 max-w-[480px] text-[17px] leading-relaxed text-white/90">
            Join thousands of candidates who use Lumen to turn interview anxiety into interview confidence.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/simulation/setup"
              className="inline-flex items-center justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative text-[15px] font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-12 hover:pe-8 w-fit overflow-hidden cursor-pointer bg-[#0A0D14] text-white hover:bg-white hover:text-black border border-white/10 hover:border-white shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <span className="relative z-10 block transition-all duration-500 ease-out group-hover:translate-x-3 text-white group-hover:text-black">
                Start Simulation
              </span>
              <div className="absolute right-1 w-10 h-10 bg-white text-[#0A0D14] rounded-full flex items-center justify-center transition-all duration-500 group-hover:bg-[#0A0D14] group-hover:text-white group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-inherit">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </div>
            </Link>
            <Link
              href="/register"
              className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#0A0D14] shadow-[0_0_15px_rgba(255,255,255,0.05)] px-8 h-12 text-[15px] font-medium text-white transition-all duration-300 hover:border-white hover:bg-white hover:text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Create an Account
            </Link>
          </div>

          <p className="mt-6 text-[13px] text-white/60">
            No credit card required &middot; Takes 5 minutes &middot; Instant results
          </p>
        </Reveal>

      </div>
    </section>
  );
}
