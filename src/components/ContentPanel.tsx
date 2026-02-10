"use client";

import { useEffect, useCallback } from "react";
import { NoteView } from "./NoteView";
import type { Concept } from "@/lib/types";

interface ContentPanelProps {
  concept: Concept | null;
  onClose: () => void;
}

export function ContentPanel({ concept, onClose }: ContentPanelProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (concept) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [concept, handleKeyDown]);

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-[1000ms] pointer-events-auto ${
        concept ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: "rgba(2,2,2,0.97)" }}
      onClick={onClose}
    >
      <div className="relative w-[90%] max-w-[580px] py-20" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute top-8 right-0 text-white/20 hover:text-white/60 transition-colors text-xl font-light"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {concept && (
          <div className="text-left animate-[fadeInUp_1.2s_ease-out]">
            <div>
              <span className="text-[10px] text-white/30 uppercase tracking-[0.5em]">
                {concept.tech}
              </span>
              <h2 className="text-4xl md:text-6xl font-light mb-8 mt-4 text-white/90 tracking-tight">
                {concept.title}
              </h2>
            </div>

            <div className="mx-auto max-w-lg text-white/70 font-light leading-relaxed text-sm tracking-wide whitespace-pre-line">
              <NoteView body={concept.body} sources={concept.sources} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
