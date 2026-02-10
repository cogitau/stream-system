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
}

const CATEGORY_ORDER: ConceptType[] = ["sensation", "cognition", "reality", "meta"];

export const StreamCanvas = forwardRef<StreamCanvasRef, StreamCanvasProps>(
  function StreamCanvas(
    { activeFilter, isModalOpen, onConceptClick, introComplete, viewScale = 1, viewDim = 0 },
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
    const resetRequestedRef = useRef(true);
    const activeFilterRef = useRef<ConceptType | "all">(activeFilter);
    const isModalOpenRef = useRef(isModalOpen);
    const introCompleteRef = useRef(introComplete);
    const onConceptClickRef = useRef(onConceptClick);

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
        return perf.quality;
      };

      const onClick = (e: MouseEvent) => {
        if (isModalOpenRef.current) return;
        const { w, h } = viewportRef.current;
        const scale = viewRef.current.scale;
        const mx = (e.clientX - w / 2) / scale + w / 2;
        const my = (e.clientY - h / 2) / scale + h / 2;
        for (let i = blobsRef.current.length - 1; i >= 0; i--) {
          const b = blobsRef.current[i];
          if (b.hitTest(mx, my)) {
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

        const now = performance.now();
        if (now > nextSpawnRef.current) {
          spawnBlob(false);
          nextSpawnRef.current = now + CONFIG.spawnEveryMs;
        }

        const mxScreen = mouseRef.current.x;
        const myScreen = mouseRef.current.y;
        const mouseSpeed = mouseRef.current.speed;
        const mx = (mxScreen - w / 2) / scale + w / 2;
        const my = (myScreen - h / 2) / scale + h / 2;
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

          const hovered = !isModalOpenRef.current && b.hitTest(mx, my);
          b.draw(ctx, hovered, viewAlpha, quality);

          if (b.isDead) blobsRef.current.splice(i, 1);
        }

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
          transition: "transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease",
        }}
      />
    );
  }
);
