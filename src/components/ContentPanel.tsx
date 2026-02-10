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
      className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-[800ms] pointer-events-auto ${
        concept ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: "rgba(3,3,3,0.95)" }}
      onClick={onClose}
    >
      <div className="relative w-[85%] max-w-[620px]" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute -top-12 right-0 text-white/40 hover:text-white/80 transition-colors"
          onClick={onClose}
        >
          ✕
        </button>

        {concept && (
          <div className="text-center">
            <div className="mb-8 inline-block">
              <span className="text-[9px] text-white/45 uppercase tracking-[0.4em] border-b border-white/10 pb-2">
                {concept.tech}
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-light mb-8 text-white/90 tracking-tight">
              {concept.title}
            </h2>

            <div className="mx-auto max-w-lg">
              <NoteView body={concept.body} sources={concept.sources} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
