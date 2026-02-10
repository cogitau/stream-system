import { Vertex } from "./vertex";
import { CONFIG } from "./config";
import type { SimplexNoise } from "./noise";
import type { Concept, ConceptType } from "@/lib/types";

// Semantic motion profiles by concept type (sub-perceptual differences)
const TYPE_MOTION: Record<ConceptType, {
  speedMult: number;      // vertical drift speed multiplier
  driftMult: number;      // horizontal wobble multiplier
  lateralBias: number;    // tiny persistent side drift signature
  verticalSway: number;   // tiny vertical sway signature
  pulseSpeed: number;     // breathing cadence
  pulseAmp: number;       // breathing amplitude (fraction of radius)
  noiseSpeed: number;     // deformation speed
  noiseAmplitude: number; // deformation intensity
  viscosity: number;      // smoothness (lower = snappier)
  radiusMult: number;     // base size multiplier
  glowTint: string;       // rim glow tint (very desaturated, ~6% shift from white)
}> = {
  sensation: {
    speedMult: 1.1,
    driftMult: 1.3,
    lateralBias: 0.045,
    verticalSway: 0.08,
    pulseSpeed: 0.030,
    pulseAmp: 0.018,
    noiseSpeed: 0.0028,    // faster, more jittery
    noiseAmplitude: 26,
    viscosity: 0.07,
    radiusMult: 0.95,
    glowTint: "rgba(255, 250, 244, 0.36)",   // warm amber / bone
  },
  cognition: {
    speedMult: 0.95,
    driftMult: 0.85,
    lateralBias: 0.016,
    verticalSway: 0.04,
    pulseSpeed: 0.022,
    pulseAmp: 0.013,
    noiseSpeed: 0.0015,    // slower, smoother
    noiseAmplitude: 18,
    viscosity: 0.05,
    radiusMult: 1.0,
    glowTint: "rgba(248, 251, 255, 0.36)",   // cool blue-gray
  },
  reality: {
    speedMult: 0.85,
    driftMult: 0.9,
    lateralBias: 0.008,
    verticalSway: 0.02,
    pulseSpeed: 0.017,
    pulseAmp: 0.010,
    noiseSpeed: 0.0018,
    noiseAmplitude: 20,
    viscosity: 0.055,
    radiusMult: 1.08,      // larger, heavier
    glowTint: "rgba(248, 253, 250, 0.36)",   // desaturated green-gray / graphite
  },
  meta: {
    speedMult: 0.8,
    driftMult: 0.7,
    lateralBias: 0.004,
    verticalSway: 0.015,
    pulseSpeed: 0.014,
    pulseAmp: 0.008,
    noiseSpeed: 0.0012,    // slowest, most stable
    noiseAmplitude: 16,
    viscosity: 0.045,
    radiusMult: 1.02,
    glowTint: "rgba(255, 255, 255, 0.36)",   // neutral white — the frame, not the content
  },
};

type CachedCanvas = HTMLCanvasElement | OffscreenCanvas;
type CachedText = {
  canvas: CachedCanvas;
  width: number;
  height: number;
};

function createCachedCanvas(width: number, height: number): CachedCanvas | null {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
}

export class Blob {
  concept: Concept;
  x: number;
  y: number;
  speed: number;
  driftSpeed: number;
  driftMult: number;
  lateralBias: number;
  verticalSway: number;
  pulseSpeed: number;
  pulseAmp: number;
  driftSign: number;
  seed: number;

  radius: number;
  targetRadius: number;
  baseRadius: number;
  hoverRadius: number;

  alpha: number;
  targetAlpha: number;
  textAlpha: number;

  noiseOffset: number;
  isDead: boolean;
  vertices: Vertex[];

  // Type-specific motion params
  noiseSpeed: number;
  noiseAmplitude: number;
  viscosity: number;

  // Mouse speed reactivity
  currentWobble: number;
  hoverFrames: number;
  hoverHoldFrames: number;

  // Category glow tint
  glowTint: string;

  // Text caches
  tagText: string;
  private tagCanvas: CachedText | null;
  private titleCanvas: CachedText | null;
  private descCanvas: CachedText | null;

  constructor(concept: Concept, x: number, y: number) {
    this.concept = concept;
    this.x = x;
    this.y = y;

    const motion = TYPE_MOTION[concept.type];

    this.speed = (0.18 + Math.random() * 0.22) * motion.speedMult;
    this.driftSpeed = 0.00045 + Math.random() * 0.001;
    this.driftMult = motion.driftMult;
    this.lateralBias = motion.lateralBias;
    this.verticalSway = motion.verticalSway;
    this.pulseSpeed = motion.pulseSpeed;
    this.pulseAmp = motion.pulseAmp;
    this.driftSign = Math.random() < 0.5 ? -1 : 1;
    this.seed = Math.random() * 1000;

    this.baseRadius = CONFIG.baseRadius * motion.radiusMult;
    this.hoverRadius = CONFIG.hoverRadius * motion.radiusMult;
    this.radius = 0;  // Start from nothing, scale up
    this.targetRadius = this.baseRadius;

    this.alpha = 0;
    this.targetAlpha = 0.48;
    this.textAlpha = 0;

    this.noiseOffset = Math.random() * 100;
    this.isDead = false;

    // Store type-specific params
    this.noiseSpeed = motion.noiseSpeed;
    this.noiseAmplitude = motion.noiseAmplitude;
    this.viscosity = motion.viscosity;
    this.currentWobble = 0;
    this.hoverFrames = 0;
    this.hoverHoldFrames = 0;
    this.glowTint = motion.glowTint;
    this.tagText = (this.concept.tech || this.concept.type).toUpperCase();
    this.tagCanvas = this.renderTextCache(
      this.tagText,
      '300 10px ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif',
      280,
      24
    );
    this.titleCanvas = this.renderTextCache(
      this.concept.title,
      '300 26px ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif',
      520,
      50
    );
    this.descCanvas = this.renderTextCache(
      this.concept.desc,
      '300 11px ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif',
      520,
      24
    );

    this.vertices = [];
    const step = (Math.PI * 2) / CONFIG.vertexCount;
    for (let i = 0; i < CONFIG.vertexCount; i++) {
      this.vertices.push(new Vertex(i * step, i, x, y));
    }
  }

  hitTest(mx: number, my: number) {
    return Math.hypot(mx - this.x, my - this.y) < this.radius;
  }

  private renderTextCache(
    text: string,
    font: string,
    width: number,
    height: number
  ): CachedText | null {
    const canvas = createCachedCanvas(width, height);
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const dpr =
      typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font;
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fillText(text, width / 2, height / 2);

    return { canvas, width, height };
  }

  update(
    noise: SimplexNoise,
    time: number,
    mouseX: number,
    mouseY: number,
    isModalOpen: boolean,
    mouseSpeed: number,
    quality: number
  ) {
    // Mouse speed affects wobble (clamped + quality aware).
    const speedFactor = Math.min(mouseSpeed * (0.6 + quality * 0.2), 1.2);
    this.currentWobble += (speedFactor - this.currentWobble) * (0.04 + quality * 0.03);

    if (!isModalOpen) {
      const swayPhase = time * this.driftSpeed + this.seed;
      this.y -= this.speed;
      this.y += Math.sin(swayPhase * 0.72) * this.verticalSway;
      this.x += Math.sin(swayPhase) * 0.35 * this.driftMult;
      this.x += this.driftSign * this.lateralBias;
    }

    if (this.y < -320) this.isDead = true;

    const isHovered = !isModalOpen && this.hitTest(mouseX, mouseY);
    if (isHovered) {
      this.hoverFrames = Math.min(this.hoverFrames + 1, 12);
      this.hoverHoldFrames = Math.min(this.hoverHoldFrames + 1, 48);
    } else {
      this.hoverFrames = 0;
      this.hoverHoldFrames = Math.max(0, this.hoverHoldFrames - 2);
    }

    // Ease-in hover visuals to avoid abrupt expensive spikes.
    const hoverStrength = Math.min(this.hoverFrames / 7, 1);
    const baseHoverRadius =
      this.baseRadius + (this.hoverRadius - this.baseRadius) * hoverStrength;
    // Breath rhythm: tiny per-type pulse for personality.
    const breathing = 1 + Math.sin(time * this.pulseSpeed + this.seed * 0.31) * this.pulseAmp;
    this.targetRadius = baseHoverRadius * breathing;
    this.targetAlpha = 0.48 + (1 - 0.48) * hoverStrength;

    this.radius += (this.targetRadius - this.radius) * 0.1;
    this.alpha += (this.targetAlpha - this.alpha) * 0.08;

    // Text fades in slightly behind the blob shape
    const targetTextAlpha = this.alpha * 0.95;
    this.textAlpha += (targetTextAlpha - this.textAlpha) * 0.06;

    // Apply mouse speed to noise parameters; low quality = less deformation workload.
    // Sustained hover slightly calms deformation for a subtle "held attention" feel.
    const stillness = 1 - Math.min(this.hoverHoldFrames / 48, 1) * 0.24;
    const wobbleBoost = (1 + this.currentWobble * (0.2 + quality * 0.12)) * stillness;
    const speedNoiseAmp = this.noiseAmplitude * wobbleBoost * (0.72 + quality * 0.28);
    const speedNoiseSpeed = this.noiseSpeed * (1 + this.currentWobble * (0.16 + quality * 0.12));
    const effectiveViscosity = this.viscosity + (1 - quality) * 0.02;

    for (const v of this.vertices) {
      v.update(
        noise,
        time,
        this.x,
        this.y,
        this.radius,
        this.noiseOffset,
        mouseX,
        mouseY,
        speedNoiseSpeed,
        speedNoiseAmp,
        effectiveViscosity,
        quality
      );
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    isHovered: boolean,
    viewAlpha: number = 1,
    quality: number = 1,
    resonance: number = 0
  ) {
    ctx.save();
    ctx.globalAlpha = this.alpha * viewAlpha;

    // Shape
    ctx.beginPath();
    const first = this.vertices[0];
    const last = this.vertices[this.vertices.length - 1];
    ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);

    for (let i = 0; i < this.vertices.length; i++) {
      const curr = this.vertices[i];
      const next = this.vertices[(i + 1) % this.vertices.length];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
    }
    ctx.closePath();

    // Fill
    ctx.fillStyle = CONFIG.colors.fill;
    ctx.fill();

    // Rim glow — tinted per category at ~6% intensity
    ctx.lineWidth = 1;
    const hoverStrength = isHovered ? Math.min(this.hoverFrames / 8, 1) : 0;
    const holdStrength = Math.min(this.hoverHoldFrames / 28, 1);
    const resonanceStrength = Math.max(0, Math.min(1, resonance));
    const glowStrength = Math.max(hoverStrength, resonanceStrength * 0.6);

    if (glowStrength > 0.1) {
      ctx.strokeStyle = CONFIG.colors.strokeActive;
      ctx.shadowColor = this.glowTint;
      ctx.shadowBlur = (7 + quality * 10) * glowStrength;
    } else {
      ctx.strokeStyle = CONFIG.colors.stroke;
      ctx.shadowBlur = 0;
    }
    ctx.stroke();

    // Long-hover second rim: almost subliminal, appears only on sustained hover.
    if (isHovered && holdStrength > 0.22) {
      ctx.save();
      ctx.lineWidth = 0.9;
      ctx.globalAlpha *= 0.2 + holdStrength * 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.shadowColor = this.glowTint;
      ctx.shadowBlur = (4 + quality * 7) * holdStrength;
      ctx.beginPath();
      ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
      for (let i = 0; i < this.vertices.length; i++) {
        const curr = this.vertices[i];
        const next = this.vertices[(i + 1) % this.vertices.length];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Text
    this.drawText(ctx, isHovered);

    ctx.restore();
  }

  private drawText(ctx: CanvasRenderingContext2D, isHovered: boolean) {
    const cx = this.x;
    const cy = this.y;

    // Text alpha is separate from blob alpha for smoother fade-in
    const textOpacity = this.textAlpha;
    if (textOpacity < 0.01) return;

    const tagAlpha = (isHovered ? 0.88 : 0.53) * textOpacity;
    const titleAlpha = (isHovered ? 0.95 : 0.85) * textOpacity;

    if (this.tagCanvas) {
      const tagW = this.tagCanvas.width;
      const tagH = this.tagCanvas.height;
      ctx.save();
      ctx.globalAlpha *= tagAlpha;
      ctx.drawImage(
        this.tagCanvas.canvas as CanvasImageSource,
        cx - tagW / 2,
        cy - 20 - tagH / 2,
        tagW,
        tagH
      );
      ctx.restore();
    }

    if (this.titleCanvas) {
      const titleW = this.titleCanvas.width;
      const titleH = this.titleCanvas.height;
      ctx.save();
      ctx.globalAlpha *= titleAlpha;
      ctx.drawImage(
        this.titleCanvas.canvas as CanvasImageSource,
        cx - titleW / 2,
        cy + 8 - titleH / 2,
        titleW,
        titleH
      );
      ctx.restore();
    }

    // Excerpt on hover
    if (isHovered && textOpacity > 0.5 && this.descCanvas) {
      const descW = this.descCanvas.width;
      const descH = this.descCanvas.height;
      ctx.save();
      ctx.globalAlpha *= 0.76 * textOpacity;
      ctx.drawImage(
        this.descCanvas.canvas as CanvasImageSource,
        cx - descW / 2,
        cy + 34 - descH / 2,
        descW,
        descH
      );
      ctx.restore();
    }
  }
}
