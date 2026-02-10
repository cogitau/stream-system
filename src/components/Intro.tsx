"use client";

import { useEffect, useState } from "react";

interface IntroProps {
  onComplete: () => void;
}

export function Intro({ onComplete }: IntroProps) {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible");

  useEffect(() => {
    // Start fade out after 3 seconds
    const fadeTimer = setTimeout(() => {
      setPhase("fading");
    }, 3000);

    // Complete after fade animation (2.5s)
    const completeTimer = setTimeout(() => {
      setPhase("hidden");
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`absolute inset-0 z-[200] flex flex-col items-center justify-center bg-[#030303] pointer-events-auto transition-opacity duration-[2500ms] ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      <h1 className="text-5xl md:text-7xl font-thin mb-8 tracking-[0.1em] text-center text-white/90 uppercase">
        <span className="inline-block opacity-0 animate-[fadeInUp_2s_ease-out_forwards]">
          Observe
        </span>
      </h1>
      <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] opacity-0 animate-[fadeInUp_2s_ease-out_1.5s_forwards] text-center">
        Entering the stream
      </p>
    </div>
  );
}
