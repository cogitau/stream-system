"use client";

import { useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { Blob } from "@/engine/blob";
import { createSimplexNoise } from "@/engine/noise";
import { CONFIG } from "@/engine/config";
import { concepts } from "@/data/concepts";
import type { Concept, ConceptType } from "@/lib/types";

export interface StreamCanvasRef {
  reset: () => void;
}

interface StreamCanvasProps {
  activeFilter: ConceptType | "all";
  isModalOpen: boolean;
  onConceptClick: (concept: Concept) => void;
  introComplete: boolean;
  viewScale?: number;
  viewDim?: number;
  onPerfUpdate?: (stats: { fps: number; quality: number }) => void;
}

const CATEGORY_ORDER: ConceptType[] = ["sensation", "cognition", "reality", "meta"];
const RESONANCE_PROFILE: Record<ConceptType, { reach: number; strength: number }> = {
  // Sensation: wider, softer
  sensation: { reach: 640, strength: 0.45 },
  // Cognition: narrower, cleaner
  cognition: { reach: 500, strength: 0.68 },
  // Reality: medium reach, grounded response
  reality: { reach: 560, strength: 0.58 },
  // Meta: shortest, quietest
  meta: { reach: 420, strength: 0.4 },
};
type Wake = {
  x: number;
  y: number;
  r: number;
  alpha: number;
  grow: number;
  fade: number;
  color: string;
};

export const StreamCanvas = forwardRef<StreamCanvasRef, StreamCanvasProps>(
  function StreamCanvas(
    {
      activeFilter,
      isModalOpen,
      onConceptClick,
      introComplete,
      viewScale = 1,
      viewDim = 0,
      onPerfUpdate,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const blobsRef = useRef<Blob[]>([]);
    const mouseRef = useRef({ x: -1000, y: -1000, speed: 0 });
    const lastMouseRef = useRef({ x: -1000, y: -1000, time: 0 });
    const viewportRef = useRef({ w: 0, h: 0, dpr: 1 });
    const timeRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const nextSpawnRef = useRef(0);
    const spawnCountRef = useRef(0);
    const viewRef = useRef({ scale: 1, dim: 0 });
    const perfRef = useRef({
      frame: 0,
      quality: 1,
      emaFrameMs: 16.7,
      lowStreak: 0,
      highStreak: 0,
      lastTs: 0,
    });
    const lastCursorRef = useRef<string>("default");
    const wakesRef = useRef<Wake[]>([]);
    const parallaxRef = useRef({ x: 0, y: 0 });
    const resetRequestedRef = useRef(true);
    const activeFilterRef = useRef<ConceptType | "all">(activeFilter);
    const isModalOpenRef = useRef(isModalOpen);
    const introCompleteRef = useRef(introComplete);
    const onConceptClickRef = useRef(onConceptClick);
    const onPerfUpdateRef = useRef(onPerfUpdate);

    viewRef.current.scale = viewScale;
    viewRef.current.dim = viewDim;

    const noise = useMemo(() => createSimplexNoise(1337), []);

    useEffect(() => {
      activeFilterRef.current = activeFilter;
      if (introCompleteRef.current) resetRequestedRef.current = true;
    }, [activeFilter]);

    useEffect(() => {
      isModalOpenRef.current = isModalOpen;
    }, [isModalOpen]);

    useEffect(() => {
      const wasComplete = introCompleteRef.current;
      introCompleteRef.current = introComplete;
      if (introComplete && !wasComplete) {
        resetRequestedRef.current = true;
      }
      if (!introComplete) {
        resetRequestedRef.current = true;
      }
    }, [introComplete]);

    useEffect(() => {
      onConceptClickRef.current = onConceptClick;
    }, [onConceptClick]);

    useEffect(() => {
      onPerfUpdateRef.current = onPerfUpdate;
    }, [onPerfUpdate]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          resetRequestedRef.current = true;
        },
      }),
      []
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        viewportRef.current = { w, h, dpr };
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const onMove = (e: MouseEvent) => {
        const now = performance.now();
        if (lastMouseRef.current.time === 0) {
          lastMouseRef.current.x = e.clientX;
          lastMouseRef.current.y = e.clientY;
          lastMouseRef.current.time = now;
          mouseRef.current.x = e.clientX;
          mouseRef.current.y = e.clientY;
          mouseRef.current.speed = 0;
          return;
        }

        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        const dt = Math.max(now - lastMouseRef.current.time, 1);
        const instantSpeed = Math.hypot(dx, dy) / dt;
        mouseRef.current.speed += (instantSpeed - mouseRef.current.speed) * 0.15;
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
        lastMouseRef.current.x = e.clientX;
        lastMouseRef.current.y = e.clientY;
        lastMouseRef.current.time = now;
      };

      const onLeave = () => {
        mouseRef.current.x = -1000;
        mouseRef.current.y = -1000;
      };

      const pickConcept = (): Concept | undefined => {
        const activeIds = new Set<string>();
        for (let i = 0; i < blobsRef.current.length; i++) {
          activeIds.add(blobsRef.current[i].concept.id);
        }

        const filter = activeFilterRef.current;
        const spawnIndex = spawnCountRef.current;
        let data: Concept | undefined;

        if (filter === "all") {
          if (spawnIndex === 0) {
            data = concepts.find((c) => c.id === "presence" && !activeIds.has(c.id));
          } else if (spawnIndex <= CATEGORY_ORDER.length) {
            const targetType = CATEGORY_ORDER[(spawnIndex - 1) % CATEGORY_ORDER.length];
            const typePool = concepts.filter(
              (c) => c.type === targetType && !activeIds.has(c.id)
            );
            if (typePool.length > 0) {
              data = typePool[Math.floor(Math.random() * typePool.length)];
            }
          }

          if (!data) {
            const pool = concepts.filter((c) => !activeIds.has(c.id));
            if (pool.length > 0) {
              data = pool[Math.floor(Math.random() * pool.length)];
            }
          }
        } else {
          const pool = concepts.filter((c) => c.type === filter && !activeIds.has(c.id));
          if (pool.length > 0) {
            data = pool[Math.floor(Math.random() * pool.length)];
          }
        }

        return data;
      };

      const spawnBlob = (immediate: boolean) => {
        if (isModalOpenRef.current) return;
        if (!introCompleteRef.current) return;
        if (blobsRef.current.length >= CONFIG.maxBlobs) return;

        const data = pickConcept();
        if (!data) return;

        const { w, h } = viewportRef.current;
        const x = Math.random() * (w - 260) + 130;
        const y = immediate ? h - (120 + Math.random() * 220) : h + 180;
        blobsRef.current.push(new Blob(data, x, y));
        spawnCountRef.current++;
      };

      const resetSimulation = () => {
        blobsRef.current = [];
        wakesRef.current = [];
        parallaxRef.current.x = 0;
        parallaxRef.current.y = 0;
        spawnCountRef.current = 0;
        if (introCompleteRef.current) {
          spawnBlob(true);
          spawnBlob(true);
          spawnBlob(true);
          nextSpawnRef.current = performance.now() + 450;
        } else {
          nextSpawnRef.current = performance.now() + CONFIG.spawnEveryMs;
        }
      };

      const updateQuality = (ts: number) => {
        const perf = perfRef.current;
        perf.frame++;
        if (perf.lastTs > 0) {
          const dt = ts - perf.lastTs;
          perf.emaFrameMs = perf.emaFrameMs * 0.9 + dt * 0.1;

          if (perf.emaFrameMs > 19.5) {
            perf.lowStreak++;
            perf.highStreak = 0;
            if (perf.lowStreak > 12) {
              perf.quality = Math.max(0.6, perf.quality - 0.08);
              perf.lowStreak = 0;
            }
          } else if (perf.emaFrameMs < 16.3) {
            perf.highStreak++;
            perf.lowStreak = 0;
            if (perf.highStreak > 40) {
              perf.quality = Math.min(1, perf.quality + 0.04);
              perf.highStreak = 0;
            }
          }
        }
        perf.lastTs = ts;

        if (onPerfUpdateRef.current && perf.frame % 12 === 0) {
          const fps = 1000 / Math.max(perf.emaFrameMs, 0.001);
          onPerfUpdateRef.current({
            fps: Math.max(0, Math.min(120, fps)),
            quality: perf.quality,
          });
        }

        return perf.quality;
      };

      const onClick = (e: MouseEvent) => {
        if (isModalOpenRef.current) return;
        const { w, h } = viewportRef.current;
        const scale = viewRef.current.scale;
        const mx = (e.clientX - w / 2) / scale + w / 2 - parallaxRef.current.x;
        const my = (e.clientY - h / 2) / scale + h / 2 - parallaxRef.current.y;
        for (let i = blobsRef.current.length - 1; i >= 0; i--) {
          const b = blobsRef.current[i];
          if (b.hitTest(mx, my)) {
            // Click wake: subtle, short-lived ring that marks inquiry.
            if (wakesRef.current.length >= 10) wakesRef.current.shift();
            wakesRef.current.push({
              x: b.x,
              y: b.y,
              r: Math.max(18, b.radius * 0.22),
              alpha: 0.32,
              grow: 2.2,
              fade: 0.015,
              color: b.glowTint,
            });
            onConceptClickRef.current(b.concept);
            return;
          }
        }
      };

      const loop = (ts: number) => {
        if (resetRequestedRef.current) {
          resetRequestedRef.current = false;
          resetSimulation();
        }

        timeRef.current += 1;
        const time = timeRef.current;
        const quality = updateQuality(ts);
        const { w, h } = viewportRef.current;
        const scale = viewRef.current.scale;
        const dim = viewRef.current.dim;
        const viewAlpha = 1 - dim * 0.28;

        ctx.clearRect(0, 0, w, h);

        // Subtle camera parallax (pointer-driven), smoothed over time.
        const mxScreen = mouseRef.current.x;
        const myScreen = mouseRef.current.y;
        const pointerActive =
          mxScreen >= 0 &&
          mxScreen <= w &&
          myScreen >= 0 &&
          myScreen <= h &&
          !isModalOpenRef.current;
        const targetParallaxX = pointerActive ? ((mxScreen - w / 2) / Math.max(w, 1)) * 20 : 0;
        const targetParallaxY = pointerActive ? ((myScreen - h / 2) / Math.max(h, 1)) * 14 : 0;
        parallaxRef.current.x += (targetParallaxX - parallaxRef.current.x) * 0.08;
        parallaxRef.current.y += (targetParallaxY - parallaxRef.current.y) * 0.08;
        const parallaxX = parallaxRef.current.x;
        const parallaxY = parallaxRef.current.y;

        // Draw and decay inquiry wakes.
        ctx.save();
        ctx.translate(parallaxX, parallaxY);
        for (let i = wakesRef.current.length - 1; i >= 0; i--) {
          const wk = wakesRef.current[i];
          wk.r += wk.grow;
          wk.alpha -= wk.fade;
          if (wk.alpha <= 0.01) {
            wakesRef.current.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.globalAlpha = wk.alpha * viewAlpha;
          ctx.lineWidth = 1;
          ctx.strokeStyle = wk.color;
          ctx.shadowColor = wk.color;
          ctx.shadowBlur = 7 * wk.alpha;
          ctx.beginPath();
          ctx.arc(wk.x, wk.y, wk.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();

        const now = performance.now();
        if (now > nextSpawnRef.current) {
          spawnBlob(false);
          nextSpawnRef.current = now + CONFIG.spawnEveryMs;
        }

        // Keep at least two blobs visible while simulation is active.
        if (
          introCompleteRef.current &&
          !isModalOpenRef.current &&
          blobsRef.current.length < 2
        ) {
          const needed = Math.min(2 - blobsRef.current.length, CONFIG.maxBlobs - blobsRef.current.length);
          for (let i = 0; i < needed; i++) {
            spawnBlob(true);
          }
        }

        const mouseSpeed = mouseRef.current.speed;
        const mx = (mxScreen - w / 2) / scale + w / 2 - parallaxX;
        const my = (myScreen - h / 2) / scale + h / 2 - parallaxY;
        mouseRef.current.speed *= 0.96;

        const doCollision =
          quality >= 0.85 || perfRef.current.frame % 2 === 0;
        if (doCollision) {
          for (let i = 0; i < blobsRef.current.length; i++) {
            for (let j = i + 1; j < blobsRef.current.length; j++) {
              const a = blobsRef.current[i];
              const b = blobsRef.current[j];
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const dist = Math.hypot(dx, dy);
              const minDist = a.radius + b.radius + 20;

              if (dist < minDist && dist > 0) {
                const overlap = (minDist - dist) * 0.02;
                const nx = dx / dist;
                const ny = dy / dist;
                a.x += nx * overlap;
                a.y += ny * overlap;
                b.x -= nx * overlap;
                b.y -= ny * overlap;
              }
            }
          }
        }

        if (!isModalOpenRef.current) {
          let over = false;
          for (let i = blobsRef.current.length - 1; i >= 0; i--) {
            if (blobsRef.current[i].hitTest(mx, my)) {
              over = true;
              break;
            }
          }
          const cursor = over ? "pointer" : "crosshair";
          if (cursor !== lastCursorRef.current) {
            document.body.style.cursor = cursor;
            lastCursorRef.current = cursor;
          }
        } else if (lastCursorRef.current !== "default") {
          document.body.style.cursor = "default";
          lastCursorRef.current = "default";
        }

        let hoveredBlob: Blob | null = null;
        if (!isModalOpenRef.current) {
          for (let i = blobsRef.current.length - 1; i >= 0; i--) {
            const candidate = blobsRef.current[i];
            if (candidate.hitTest(mx, my)) {
              hoveredBlob = candidate;
              break;
            }
          }
        }

        ctx.save();
        ctx.translate(parallaxX, parallaxY);
        for (let i = blobsRef.current.length - 1; i >= 0; i--) {
          const b = blobsRef.current[i];
          b.update(
            noise,
            time,
            mx,
            my,
            isModalOpenRef.current,
            mouseSpeed,
            quality
          );

          const hovered = hoveredBlob === b;
          let resonance = 0;
          if (hoveredBlob && !hovered && hoveredBlob.concept.type === b.concept.type) {
            const dx = b.x - hoveredBlob.x;
            const dy = b.y - hoveredBlob.y;
            const dist = Math.hypot(dx, dy);
            const profile = RESONANCE_PROFILE[hoveredBlob.concept.type];
            const reach = profile.reach;
            if (dist < reach) {
              resonance = (1 - dist / reach) * profile.strength;
            }
          }

          b.draw(ctx, hovered, viewAlpha, quality, resonance);

          if (b.isDead) blobsRef.current.splice(i, 1);
        }
        ctx.restore();

        rafRef.current = requestAnimationFrame(loop);
      };

      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseleave", onLeave);
      window.addEventListener("click", onClick);
      rafRef.current = requestAnimationFrame(loop);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseleave", onLeave);
        window.removeEventListener("click", onClick);
        document.body.style.cursor = "default";
      };
    }, [noise]);

    const opacity = 1 - viewDim * 0.12;

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          opacity,
          transform: viewScale !== 1 ? `scale(${viewScale})` : undefined,
          transformOrigin: "center",
          willChange: "transform, opacity",
          transition: "none",
        }}
      />
    );
  }
);
