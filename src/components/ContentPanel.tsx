"use client";

import { useEffect, useCallback } from "react";
import { NoteView } from "./NoteView";
import type { Concept, ConceptBlock } from "@/lib/types";

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

  /** Split body into: first paragraph (lead) + everything else (rest). */
  const splitBody = (body: ConceptBlock[]) => {
    if (body.length === 0) return { lead: null as ConceptBlock | null, rest: [] as ConceptBlock[] };

    // The lead is the first paragraph block.
    const leadIdx = body.findIndex((b) => b.kind === "paragraph");
    const lead = leadIdx >= 0 ? body[leadIdx] : null;

    // Rest is everything else, skipping the lead paragraph and any leading separator.
    let rest = leadIdx >= 0
      ? [...body.slice(0, leadIdx), ...body.slice(leadIdx + 1)]
      : [...body];
    while (rest.length > 0 && rest[0]?.kind === "separator") {
      rest = rest.slice(1);
    }

    return { lead, rest };
  };

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-[1000ms] pointer-events-auto ${
        concept ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: "rgba(2,2,2,0.97)" }}
      onClick={onClose}
    >
      <div
        className="relative w-[90%] max-w-[560px] py-16 md:py-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-8 right-0 text-white/20 hover:text-white/60 transition-colors text-xl font-light"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {concept && (
          <div className="text-left animate-[fadeInUp_1.2s_ease-out]">
            {(() => {
              const { lead, rest } = splitBody(concept.body);
              const hasRest = rest.length > 0;

              return (
                <>
                  {/* Header */}
                  <div className="mb-10">
                    <div className="text-[10px] text-white/30 uppercase tracking-[0.5em]">
                      {concept.tech}
                    </div>
                    <h2 className="text-4xl md:text-6xl font-light mt-4 text-white/90 tracking-tight">
                      {concept.title}
                    </h2>
                    <div className="mt-3 text-white/40 text-sm font-light max-w-md">
                      {concept.desc}
                    </div>
                  </div>

                  {/* Lead paragraph — one paragraph, the hook */}
                  {lead && (
                    <div className="max-w-lg text-white/70 font-light leading-relaxed text-sm tracking-wide">
                      <NoteView body={[lead]} />
                    </div>
                  )}

                  {/* Mechanism — scientific grounding */}
                  {concept.mechanism && (
                    <details className="mt-8 group max-w-lg" open>
                      <summary className="cursor-pointer select-none text-[10px] uppercase tracking-[0.4em] text-white/30 hover:text-white/60 transition-colors">
                        Mechanism
                      </summary>
                      <p className="mt-4 text-white/50 font-light leading-relaxed text-xs tracking-wide">
                        {concept.mechanism}
                      </p>
                    </details>
                  )}

                  {/* More — remaining body blocks */}
                  {hasRest && (
                    <details className="mt-8 group max-w-lg">
                      <summary className="cursor-pointer select-none text-[10px] uppercase tracking-[0.4em] text-white/30 hover:text-white/60 transition-colors">
                        More
                      </summary>
                      <div className="mt-6 text-white/70 font-light leading-relaxed text-sm tracking-wide whitespace-pre-line">
                        <NoteView body={rest} />
                      </div>
                    </details>
                  )}

                  {/* Sources */}
                  {concept.sources && concept.sources.length > 0 && (
                    <details className="mt-6 group max-w-lg">
                      <summary className="cursor-pointer select-none text-[10px] uppercase tracking-[0.4em] text-white/30 hover:text-white/60 transition-colors">
                        Sources
                      </summary>
                      <div className="mt-5 text-white/55 text-xs leading-relaxed">
                        {concept.sources.map((s, i) => (
                          <div key={i} className="mb-3">
                            <span className="text-white/70">{s.title}</span>
                            {s.author && <span> — {s.author}</span>}
                            {s.note && <div className="text-white/40 mt-1">{s.note}</div>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
