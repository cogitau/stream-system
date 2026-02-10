"use client";

export function Header() {
  return (
    <div className="absolute left-8 top-10 pointer-events-none">
      <div className="text-white/90 text-3xl md:text-4xl font-light tracking-tight">
        Consciousness Stream
      </div>
      <div className="mt-2 text-white/45 text-sm max-w-md">
        An interactive exploration of attention, perception, and cognition, treated as dynamical systems.
      </div>
      <a
        href="https://cogitau.github.io"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block pointer-events-auto text-[10px] uppercase tracking-[0.28em] text-white/30 hover:text-white/70 transition-colors"
      >
        Bryan U
      </a>
    </div>
  );
}
