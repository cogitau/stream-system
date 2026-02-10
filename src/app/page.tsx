"use client";

import { useState, useCallback, useRef } from "react";
import { StreamCanvas, StreamCanvasRef } from "@/components/StreamCanvas";
import { ContentPanel } from "@/components/ContentPanel";
import { Header } from "@/components/Header";
import { FilterMenu } from "@/components/FilterMenu";
import { Intro } from "@/components/Intro";
import type { Concept, ConceptType } from "@/lib/types";

export default function Home() {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [activeFilter, setActiveFilter] = useState<ConceptType | "all">("all");
  const [introComplete, setIntroComplete] = useState(false);
  const canvasRef = useRef<StreamCanvasRef>(null);

  const closeModal = useCallback(() => setSelectedConcept(null), []);

  const killAndReset = useCallback((type: ConceptType | "all") => {
    setActiveFilter(type);
    canvasRef.current?.reset();
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#030303] overflow-hidden">
      <StreamCanvas
        ref={canvasRef}
        activeFilter={activeFilter}
        isModalOpen={selectedConcept !== null}
        onConceptClick={setSelectedConcept}
        introComplete={introComplete}
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
