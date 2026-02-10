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
}

export const StreamCanvas = forwardRef<StreamCanvasRef, StreamCanvasProps>(
  function StreamCanvas({ activeFilter, isModalOpen, onConceptClick, introComplete }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<Blob[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, speed: 0 });
  const lastMouseRef = useRef({ x: -1000, y: -1000, time: 0 });
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const nextSpawnRef = useRef(0);
  const spawnCountRef = useRef(0);

  const noise = useMemo(() => createSimplexNoise(1337), []);

  // Category rotation for guided entry (after Presence)
  const categoryOrder: ConceptType[] = ["sensation", "cognition", "reality", "meta", "contemplative"];

  useImperativeHandle(ref, () => ({
    reset: () => {
      blobsRef.current = [];
      spawnCountRef.current = 0;
      nextSpawnRef.current = performance.now() + 250;
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      const dt = Math.max(now - lastMouseRef.current.time, 1);
      const instantSpeed = Math.hypot(dx, dy) / dt;
      
      // Smooth the speed value (exponential moving average)
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

    const spawnBlob = (immediate = false) => {
      if (isModalOpen) return;
      if (!introComplete) return;
      if (blobsRef.current.length >= CONFIG.maxBlobs) return;

      // Get IDs of currently visible concepts to prevent duplicates
      const activeIds = new Set(blobsRef.current.map((b) => b.concept.id));

      let data: Concept | undefined;
      const spawnIndex = spawnCountRef.current;

      if (activeFilter === "all") {
        // Intentional arrival logic
        if (spawnIndex === 0) {
          // First blob: always Presence
          data = concepts.find((c) => c.id === "presence" && !activeIds.has(c.id));
        } else if (spawnIndex <= categoryOrder.length) {
          // Next few: rotate through categories
          const targetType = categoryOrder[(spawnIndex - 1) % categoryOrder.length];
          const typePool = concepts.filter((c) => c.type === targetType && !activeIds.has(c.id));
          if (typePool.length > 0) {
            data = typePool[Math.floor(Math.random() * typePool.length)];
          }
        }

        // Fallback to random if guided selection unavailable or after rotation
        if (!data) {
          const pool = concepts.filter((c) => !activeIds.has(c.id));
          if (pool.length > 0) {
            data = pool[Math.floor(Math.random() * pool.length)];
          }
        }
      } else {
        // Filtered mode: just random from that type
        const pool = concepts.filter((c) => c.type === activeFilter && !activeIds.has(c.id));
        if (pool.length > 0) {
          data = pool[Math.floor(Math.random() * pool.length)];
        }
      }

      if (!data) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = Math.random() * (w - 260) + 130;
      const y = immediate ? h - (120 + Math.random() * 220) : h + 180;
      blobsRef.current.push(new Blob(data, x, y));
      spawnCountRef.current++;
    };

    const loop = () => {
      timeRef.current += 1;
      const time = timeRef.current;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // spawn
      const now = performance.now();
      if (now > nextSpawnRef.current) {
        spawnBlob(false);
        nextSpawnRef.current = now + CONFIG.spawnEveryMs;
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mouseSpeed = mouseRef.current.speed;
      
      // Decay mouse speed toward stillness
      mouseRef.current.speed *= 0.96;

      // Blob collision avoidance (gentle repulsion)
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

      // cursor hint
      if (!isModalOpen) {
        let over = false;
        for (let i = blobsRef.current.length - 1; i >= 0; i--) {
          if (blobsRef.current[i].hitTest(mx, my)) {
            over = true;
            break;
          }
        }
        document.body.style.cursor = over ? "pointer" : "crosshair";
      } else {
        document.body.style.cursor = "default";
      }

      // update/draw
      for (let i = blobsRef.current.length - 1; i >= 0; i--) {
        const b = blobsRef.current[i];
        b.update({ noise, time, mouseX: mx, mouseY: my, isModalOpen, mouseSpeed });

        const isHovered = !isModalOpen && b.hitTest(mx, my);
        b.draw(ctx, isHovered);

        if (b.isDead) blobsRef.current.splice(i, 1);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    // Immediate presence (only after intro)
    blobsRef.current = [];
    if (introComplete) {
      spawnBlob(true);
      spawnBlob(true);
      spawnBlob(true);
    }
    nextSpawnRef.current = performance.now() + 450;

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      document.body.style.cursor = "default";
    };
  }, [activeFilter, isModalOpen, introComplete, noise]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isModalOpen) return;
      const mx = e.clientX;
      const my = e.clientY;
      for (let i = blobsRef.current.length - 1; i >= 0; i--) {
        const b = blobsRef.current[i];
        if (b.hitTest(mx, my)) {
          onConceptClick(b.concept);
          return;
        }
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [isModalOpen, onConceptClick]);

  return <canvas ref={canvasRef} className="absolute inset-0" />;
});
