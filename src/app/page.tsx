"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { StreamCanvas, StreamCanvasRef } from "@/components/StreamCanvas";
import { ContentPanel } from "@/components/ContentPanel";
import { Header } from "@/components/Header";
import { FilterMenu } from "@/components/FilterMenu";
import { Intro } from "@/components/Intro";
import type { Concept, ConceptType } from "@/lib/types";

const CATEGORY_RING: ConceptType[] = ["sensation", "cognition", "reality", "meta"];

export default function Home() {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [activeFilter, setActiveFilter] = useState<ConceptType | "all">("all");
  const [introComplete, setIntroComplete] = useState(false);
  const [showPerf, setShowPerf] = useState(false);
  const [perfStats, setPerfStats] = useState({ fps: 0, quality: 1 });
  const canvasRef = useRef<StreamCanvasRef>(null);
  const zoomIntentRef = useRef(0);
  const zoomRafRef = useRef<number | null>(null);
  const lastWheelTsRef = useRef(0);
  const switchedRef = useRef(false);
  const switchCooldownUntilRef = useRef(0);
  const gestureDirectionRef = useRef<0 | 1 | -1>(0);
  const settleLockUntilRef = useRef(0);
  const [viewScale, setViewScale] = useState(1);
  const [viewDim, setViewDim] = useState(0);

  const closeModal = useCallback(() => setSelectedConcept(null), []);

  const killAndReset = useCallback((type: ConceptType | "all") => {
    setActiveFilter(type);
    canvasRef.current?.reset();
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  const handlePerfUpdate = useCallback((stats: { fps: number; quality: number }) => {
    setPerfStats(stats);
  }, []);

  const cycleCategory = useCallback((step: 1 | -1) => {
    setActiveFilter((prev) => {
      let nextType: ConceptType;
      if (prev === "all") {
        nextType = step > 0 ? CATEGORY_RING[0] : CATEGORY_RING[CATEGORY_RING.length - 1];
      } else {
        const currentIndex = CATEGORY_RING.indexOf(prev);
        const nextIndex =
          (currentIndex + step + CATEGORY_RING.length) % CATEGORY_RING.length;
        nextType = CATEGORY_RING[nextIndex];
      }
      return nextType;
    });
    canvasRef.current?.reset();
  }, []);

  useEffect(() => {
    const tickZoom = () => {
      const now = performance.now();
      let intent = zoomIntentRef.current;

      // Trigger category switch once per gesture as we approach max zoom intent.
      if (!switchedRef.current && Math.abs(intent) >= 0.92) {
        cycleCategory(intent > 0 ? 1 : -1);
        switchedRef.current = true;
        switchCooldownUntilRef.current = now + 700;
        intent *= 0.56;
      }

      // Continuous zoom response (positive intent = zoom out, negative = zoom in).
      const targetScale = 1 - intent * 0.16;
      const targetDim = Math.min(Math.abs(intent) * 0.9, 1);
      setViewScale((prev) => prev + (targetScale - prev) * 0.28);
      setViewDim((prev) => prev + (targetDim - prev) * 0.24);

      // Decay intent once wheel input calms down.
      if (now - lastWheelTsRef.current > 40) {
        intent *= 0.86;
      }
      zoomIntentRef.current = intent;

      // Unlock switching only after cooldown + full settle.
      if (
        switchedRef.current &&
        now > switchCooldownUntilRef.current &&
        Math.abs(intent) < 0.08 &&
        now - lastWheelTsRef.current > 140
      ) {
        switchedRef.current = false;
      }

      const done =
        Math.abs(intent) < 0.012 &&
        Math.abs(targetScale - 1) < 0.008 &&
        now - lastWheelTsRef.current > 120;

      if (done) {
        zoomIntentRef.current = 0;
        setViewScale(1);
        setViewDim(0);
        gestureDirectionRef.current = 0;
        switchedRef.current = false;
        settleLockUntilRef.current = now + 180;
        zoomRafRef.current = null;
        return;
      }

      zoomRafRef.current = window.requestAnimationFrame(tickZoom);
    };

    const onWheel = (e: WheelEvent) => {
      if (!introComplete || selectedConcept) return;
      e.preventDefault();
      const now = performance.now();

      // Absorb inertial tail right after a settle.
      if (now < settleLockUntilRef.current) return;

      // Ignore inertial tail after a switch so it doesn't retrigger.
      if (switchedRef.current && now < switchCooldownUntilRef.current) return;

      const magnitude = Math.abs(e.deltaY);
      // Filter tiny wheel noise/inertia values.
      if (magnitude < 3) return;

      const filtered = Math.sign(e.deltaY) * (magnitude - 3);
      const direction: 1 | -1 = filtered > 0 ? 1 : -1;

      // Lock gesture direction until the zoom fully settles.
      if (gestureDirectionRef.current === 0) {
        gestureDirectionRef.current = direction;
      } else if (direction !== gestureDirectionRef.current) {
        return;
      }

      const clamped = Math.max(-120, Math.min(120, filtered));
      zoomIntentRef.current = Math.max(
        -1.25,
        Math.min(1.25, zoomIntentRef.current + clamped * 0.0034)
      );
      lastWheelTsRef.current = now;

      if (!zoomRafRef.current) {
        zoomRafRef.current = window.requestAnimationFrame(tickZoom);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (zoomRafRef.current) {
        window.cancelAnimationFrame(zoomRafRef.current);
        zoomRafRef.current = null;
      }
    };
  }, [cycleCategory, introComplete, selectedConcept]);

  return (
    <div className="fixed inset-0 bg-[#030303] overflow-hidden">
      <StreamCanvas
        ref={canvasRef}
        activeFilter={activeFilter}
        isModalOpen={selectedConcept !== null}
        onConceptClick={setSelectedConcept}
        introComplete={introComplete}
        viewScale={viewScale}
        viewDim={viewDim}
        onPerfUpdate={handlePerfUpdate}
      />

      {/* UI layer */}
      <div className="absolute inset-0 pointer-events-none">
        <Header />
        <FilterMenu
          activeFilter={activeFilter}
          onFilterChange={killAndReset}
        />
        <button
          type="button"
          aria-label={showPerf ? "Hide performance stats" : "Show performance stats"}
          onClick={() => setShowPerf((v) => !v)}
          className="pointer-events-auto absolute top-5 right-6 text-white/18 hover:text-white/55 transition-colors text-xl leading-none"
        >
          •
        </button>
        {showPerf && (
          <div className="pointer-events-none absolute top-12 right-6 bg-black/45 border border-white/10 rounded px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.24em] text-white/35 mb-1">
              Perf
            </div>
            <div className="text-[11px] text-white/80 tabular-nums">
              FPS {Math.round(perfStats.fps)}
            </div>
            <div className="text-[11px] text-white/55 tabular-nums">
              Quality {Math.round(perfStats.quality * 100)}%
            </div>
          </div>
        )}
      </div>

      <ContentPanel
        concept={selectedConcept}
        onClose={closeModal}
      />

      <Intro onComplete={handleIntroComplete} />
    </div>
  );
}
