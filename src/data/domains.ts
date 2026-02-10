import type { Domain, ConceptType } from "@/lib/types";

export const DOMAINS: Domain[] = [
  { type: "sensation", label: "Sensation", color: "#e07a5f" },
  { type: "cognition", label: "Cognition", color: "#7eb8da" },
  { type: "reality", label: "Reality", color: "#9b8ac4" },
  { type: "meta", label: "Meta", color: "#81b29a" },
  { type: "contemplative", label: "Contemplative", color: "#b8a9c9" },
];

export const DOMAIN_MAP: Record<ConceptType, Domain> = Object.fromEntries(
  DOMAINS.map((d) => [d.type, d])
) as Record<ConceptType, Domain>;

export const ALL_TYPES: ConceptType[] = DOMAINS.map((d) => d.type);
