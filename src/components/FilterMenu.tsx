"use client";

import { DOMAINS } from "@/data/domains";
import type { ConceptType } from "@/lib/types";

interface FilterMenuProps {
  activeFilter: ConceptType | "all";
  onFilterChange: (filter: ConceptType | "all") => void;
}

export function FilterMenu({ activeFilter, onFilterChange }: FilterMenuProps) {
  return (
    <div className="absolute right-8 bottom-10 text-right">
      <div className="pointer-events-auto inline-flex flex-col gap-3">
        <div className="text-white/35 text-[9px] uppercase tracking-[0.35em] border-b border-white/10 pb-2">
          Focus
        </div>
        <button
          className={`text-xs font-light tracking-wide transition-colors ${
            activeFilter === "all" ? "text-white/90" : "text-white/45 hover:text-white/80"
          }`}
          onClick={() => onFilterChange("all")}
        >
          All phenomena
        </button>
        {DOMAINS.map((domain) => (
          <button
            key={domain.type}
            className={`text-xs font-light tracking-wide transition-colors ${
              activeFilter === domain.type ? "text-white/90" : "text-white/45 hover:text-white/80"
            }`}
            onClick={() => onFilterChange(domain.type)}
          >
            {domain.label}
          </button>
        ))}
      </div>
    </div>
  );
}
