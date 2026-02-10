"use client";

import type { ConceptBlock, Source } from "@/lib/types";

interface NoteViewProps {
  body: ConceptBlock[];
  sources?: Source[];
}

function renderBlock(block: ConceptBlock, index: number) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p key={index} className="text-white/70 font-light leading-relaxed text-sm tracking-wide mb-4">
          {block.text}
        </p>
      );

    case "heading":
      return (
        <h3 key={index} className="text-white/80 text-lg font-light mt-6 mb-3">
          {block.text}
        </h3>
      );

    case "quote":
      return (
        <blockquote key={index} className="my-4 pl-4 border-l border-white/20">
          <p className="text-white/60 italic text-sm">{block.text}</p>
          {block.attribution && (
            <cite className="block text-white/40 text-xs mt-2 not-italic">— {block.attribution}</cite>
          )}
        </blockquote>
      );

    case "insight":
      return (
        <div key={index} className="my-4 p-4 bg-white/5 border-l-2 border-white/30 text-white/80 text-sm font-light">
          {block.text}
        </div>
      );

    case "question":
      return (
        <p key={index} className="my-4 text-white/60 italic text-sm">
          {block.text}
        </p>
      );

    case "list":
      return (
        <ul key={index} className="my-4 pl-5 list-disc text-white/70 text-sm font-light space-y-1">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case "separator":
      return <hr key={index} className="my-6 border-t border-white/10 w-12 mx-auto" />;

    default:
      return null;
  }
}

export function NoteView({ body, sources }: NoteViewProps) {
  return (
    <div className="text-left">
      {body.map((block, index) => renderBlock(block, index))}

      {sources && sources.length > 0 && (
        <div className="mt-8 pt-4 border-t border-white/10">
          <div className="text-[9px] text-white/35 uppercase tracking-[0.3em] mb-3">Sources</div>
          {sources.map((source, index) => (
            <div key={index} className="text-white/50 text-xs mb-2">
              <span className="text-white/70">{source.title}</span>
              {source.author && <span> — {source.author}</span>}
              {source.note && <span className="block text-white/40 mt-0.5">{source.note}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
