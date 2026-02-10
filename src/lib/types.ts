export type ConceptType =
  | "sensation"
  | "cognition"
  | "reality"
  | "meta";

export type ConceptBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string; attribution?: string }
  | { kind: "insight"; text: string }
  | { kind: "question"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "separator" };

export type Source = {
  title: string;
  author?: string;
  note?: string;
};

export type Concept = {
  id: string;
  type: ConceptType;
  title: string;
  tech: string;
  desc: string;
  mechanism?: string;
  body: ConceptBlock[];
  sources?: Source[];
};

export type Domain = {
  type: ConceptType;
  label: string;
  color: string;
};
