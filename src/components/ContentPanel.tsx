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

  /**
   * Split body into:
   * - lead: first paragraph (always visible)
   * - question: any question block (always visible, above "More")
   * - rest: everything else (collapsed under "More")
   */
  const splitBody = (body: ConceptBlock[]) => {
    if (body.length === 0) {
      return {
        lead: null as ConceptBlock | null,
        question: null as ConceptBlock | null,
        rest: [] as ConceptBlock[],
      };
    }

    // The lead is the first paragraph block.
    const leadIdx = body.findIndex((b) => b.kind === "paragraph");
    const lead = leadIdx >= 0 ? body[leadIdx] : null;

    // The question is the last question block (if any).
    let questionIdx = -1;
    for (let i = body.length - 1; i >= 0; i--) {
      if (body[i]?.kind === "question") {
        questionIdx = i;
        break;
      }
    }
    const question = questionIdx >= 0 ? body[questionIdx] : null;

    // Rest is everything else, excluding lead and question (and any leading separator).
    let rest = body.filter((_, idx) => idx !== leadIdx && idx !== questionIdx);
    while (rest.length > 0 && rest[0]?.kind === "separator") {
      rest = rest.slice(1);
    }

    return { lead, question, rest };
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
              const { lead, question, rest } = splitBody(concept.body);
              const hasRest = rest.length > 0;
              const hasSources = Boolean(concept.sources && concept.sources.length > 0);
              const hasMore = hasRest || hasSources;

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
                  </div>

                  {/* Lead paragraph — one paragraph, the hook */}
                  {lead && (
                    <div className="max-w-lg text-white/70 font-light leading-relaxed text-sm tracking-wide">
                      <NoteView body={[lead]} />
                    </div>
                  )}

                  {/* How — one-line process note */}
                  {concept.mechanism && (
                    <section className="mt-8 max-w-lg rounded-sm border border-white/10 bg-white/[0.02] px-4 py-3">
                      <div className="text-[9px] uppercase tracking-[0.3em] text-white/40">
                        How
                      </div>
                      <p className="mt-2 text-white/60 font-light leading-relaxed text-xs tracking-normal">
                        {concept.mechanism}
                      </p>
                    </section>
                  )}

                  {/* Question — always visible (not inside "More") */}
                  {question && (
                    <div className="mt-8 max-w-lg text-white/65 font-light leading-relaxed text-sm tracking-wide">
                      <NoteView body={[question]} />
                    </div>
                  )}

                  {/* More — remaining body blocks + sources */}
                  {hasMore && (
                    <details className="mt-8 group max-w-lg">
                      <summary className="cursor-pointer select-none text-[10px] uppercase tracking-[0.4em] text-white/30 hover:text-white/60 transition-colors">
                        More
                      </summary>
                      {hasRest && (
                        <div className="mt-6 text-white/70 font-light leading-relaxed text-sm tracking-wide whitespace-pre-line">
                          <NoteView body={rest} />
                        </div>
                      )}

                      {hasSources && (
                        <div className={`${hasRest ? "mt-6 pt-5 border-t border-white/10" : "mt-5"} text-white/55 text-xs leading-relaxed`}>
                          <div className="text-[9px] uppercase tracking-[0.28em] text-white/35 mb-3">
                            Sources
                          </div>
                          {concept.sources!.map((s, i) => (
                            <div key={i} className="mb-3">
                              <span className="text-white/70">{s.title}</span>
                              {s.author && <span> — {s.author}</span>}
                              {s.note && <div className="text-white/40 mt-1">{s.note}</div>}
                            </div>
                          ))}
                        </div>
                      )}
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
