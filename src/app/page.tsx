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
  const canvasRef = useRef<StreamCanvasRef>(null);
  const zoomDeltaRef = useRef(0);
  const lastZoomChangeRef = useRef(0);
  const transitionRef = useRef<{ swap?: number; settle?: number }>({});
  const inFlightRef = useRef(false);
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

  const cycleCategory = useCallback(
    (step: 1 | -1) => {
      let nextType: ConceptType;
      if (activeFilter === "all") {
        nextType = step > 0 ? CATEGORY_RING[0] : CATEGORY_RING[CATEGORY_RING.length - 1];
      } else {
        const currentIndex = CATEGORY_RING.indexOf(activeFilter);
        const nextIndex =
          (currentIndex + step + CATEGORY_RING.length) % CATEGORY_RING.length;
        nextType = CATEGORY_RING[nextIndex];
      }
      killAndReset(nextType);
    },
    [activeFilter, killAndReset]
  );

  const transitionCategory = useCallback(
    (step: 1 | -1) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Zoom direction matches gesture:
      // - step=+1 (scroll down / "zoom out") => zoom out
      // - step=-1 (scroll up / "zoom in")  => zoom in
      setViewScale(step > 0 ? 0.86 : 1.14);
      setViewDim(1);

      // Swap category at "furthest" point, then ease back in.
      transitionRef.current.swap = window.setTimeout(() => {
        cycleCategory(step);
      }, 180);

      transitionRef.current.settle = window.setTimeout(() => {
        setViewScale(1);
        setViewDim(0);
        inFlightRef.current = false;
      }, 620);
    },
    [cycleCategory]
  );

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!introComplete || selectedConcept) return;

      // Support both:
      // - pinch-to-zoom out (ctrl+wheel in modern browsers)
      // - plain wheel/scroll as an intentional category traversal gesture
      e.preventDefault();

      const now = performance.now();
      if (now - lastZoomChangeRef.current < 280) return;

      zoomDeltaRef.current += e.deltaY;
      const threshold = 90;
      if (Math.abs(zoomDeltaRef.current) < threshold) return;

      if (zoomDeltaRef.current > 0) {
        transitionCategory(1);
      } else {
        transitionCategory(-1);
      }
      zoomDeltaRef.current = 0;
      lastZoomChangeRef.current = now;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [transitionCategory, introComplete, selectedConcept]);

  useEffect(() => {
    return () => {
      if (transitionRef.current.swap) window.clearTimeout(transitionRef.current.swap);
      if (transitionRef.current.settle) window.clearTimeout(transitionRef.current.settle);
    };
  }, []);

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
      />

      {/* UI layer */}
      <div className="absolute inset-0 pointer-events-none">
        <Header />
        <FilterMenu
          activeFilter={activeFilter}
          onFilterChange={killAndReset}
        />
      </div>

      <ContentPanel
        concept={selectedConcept}
        onClose={closeModal}
      />

      <Intro onComplete={handleIntroComplete} />
    </div>
  );
}
