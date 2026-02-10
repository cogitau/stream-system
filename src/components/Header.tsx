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
    </div>
  );
}
