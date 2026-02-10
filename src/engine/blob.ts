import { Vertex } from "./vertex";
import { CONFIG } from "./config";
import type { SimplexNoise } from "./noise";
import type { Concept, ConceptType } from "@/lib/types";

// Semantic motion profiles by concept type (sub-perceptual differences)
const TYPE_MOTION: Record<ConceptType, {
  speedMult: number;      // vertical drift speed multiplier
  driftMult: number;      // horizontal wobble multiplier
  noiseSpeed: number;     // deformation speed
  noiseAmplitude: number; // deformation intensity
  viscosity: number;      // smoothness (lower = snappier)
  radiusMult: number;     // base size multiplier
}> = {
  sensation: {
    speedMult: 1.1,
    driftMult: 1.3,
    noiseSpeed: 0.0028,    // faster, more jittery
    noiseAmplitude: 26,
    viscosity: 0.07,
    radiusMult: 0.95,
  },
  cognition: {
    speedMult: 0.95,
    driftMult: 0.85,
    noiseSpeed: 0.0015,    // slower, smoother
    noiseAmplitude: 18,
    viscosity: 0.05,
    radiusMult: 1.0,
  },
  reality: {
    speedMult: 0.85,
    driftMult: 0.9,
    noiseSpeed: 0.0018,
    noiseAmplitude: 20,
    viscosity: 0.055,
    radiusMult: 1.08,      // larger, heavier
  },
  meta: {
    speedMult: 0.8,
    driftMult: 0.7,
    noiseSpeed: 0.0012,    // slowest, most stable
    noiseAmplitude: 16,
    viscosity: 0.045,
    radiusMult: 1.02,
  },
  contemplative: {
    speedMult: 0.75,
    driftMult: 0.65,
    noiseSpeed: 0.001,     // very slow, serene
    noiseAmplitude: 15,
    viscosity: 0.04,
    radiusMult: 1.05,
  },
};

export class Blob {
  concept: Concept;
  x: number;
  y: number;
  speed: number;
  driftSpeed: number;
  driftMult: number;
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

  constructor(concept: Concept, x: number, y: number) {
    this.concept = concept;
    this.x = x;
    this.y = y;

    const motion = TYPE_MOTION[concept.type];

    this.speed = (0.18 + Math.random() * 0.22) * motion.speedMult;
    this.driftSpeed = 0.00045 + Math.random() * 0.001;
    this.driftMult = motion.driftMult;
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

    this.vertices = [];
    const step = (Math.PI * 2) / CONFIG.vertexCount;
    for (let i = 0; i < CONFIG.vertexCount; i++) {
      this.vertices.push(new Vertex(i * step, i));
    }
  }

  hitTest(mx: number, my: number) {
    return Math.hypot(mx - this.x, my - this.y) < this.radius;
  }

  update(params: {
    noise: SimplexNoise;
    time: number;
    mouseX: number;
    mouseY: number;
    isModalOpen: boolean;
    mouseSpeed: number;
  }) {
    const { noise, time, mouseX, mouseY, isModalOpen, mouseSpeed } = params;

    // Mouse speed affects wobble (clamped, subtle)
    const speedFactor = Math.min(mouseSpeed * 0.8, 1.5);
    this.currentWobble += (speedFactor - this.currentWobble) * 0.05;

    if (!isModalOpen) {
      this.y -= this.speed;
      this.x += Math.sin(time * this.driftSpeed + this.seed) * 0.35 * this.driftMult;
    }

    if (this.y < -320) this.isDead = true;

    const isHovered = !isModalOpen && this.hitTest(mouseX, mouseY);

    if (isHovered) {
      this.targetRadius = this.hoverRadius;
      this.targetAlpha = 1.0;
    } else {
      this.targetRadius = this.baseRadius;
      this.targetAlpha = 0.48;
    }

    this.radius += (this.targetRadius - this.radius) * 0.1;
    this.alpha += (this.targetAlpha - this.alpha) * 0.08;
    
    // Text fades in slightly behind the blob shape
    const targetTextAlpha = this.alpha * 0.95;
    this.textAlpha += (targetTextAlpha - this.textAlpha) * 0.06;

    // Apply mouse speed to noise parameters
    const wobbleBoost = 1 + this.currentWobble * 0.4;
    const speedNoiseAmp = this.noiseAmplitude * wobbleBoost;
    const speedNoiseSpeed = this.noiseSpeed * (1 + this.currentWobble * 0.3);

    for (const v of this.vertices) {
      v.update({
        noise,
        time,
        originX: this.x,
        originY: this.y,
        currentRadius: this.radius,
        noiseOffset: this.noiseOffset,
        mouseX,
        mouseY,
        noiseSpeed: speedNoiseSpeed,
        noiseAmplitude: speedNoiseAmp,
        viscosity: this.viscosity,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, isHovered: boolean) {
    ctx.save();
    ctx.globalAlpha = this.alpha;

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

    // Rim glow
    ctx.lineWidth = 1;
    if (isHovered) {
      ctx.strokeStyle = CONFIG.colors.strokeActive;
      ctx.shadowColor = CONFIG.colors.glow;
      ctx.shadowBlur = 34;
    } else {
      ctx.strokeStyle = CONFIG.colors.stroke;
      ctx.shadowBlur = 0;
    }
    ctx.stroke();

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

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Meta tag
    ctx.font = '300 10px ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif';
    const tagAlpha = isHovered ? 0.88 : 0.45;
    ctx.fillStyle = `rgba(255,255,255,${tagAlpha * textOpacity})`;
    const tag = (this.concept.tech || this.concept.type).toUpperCase();
    ctx.fillText(tag, cx, cy - 20);

    // Title
    ctx.font = '300 26px ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif';
    const titleAlpha = isHovered ? 0.95 : 0.85;
    ctx.fillStyle = `rgba(255,255,255,${titleAlpha * textOpacity})`;
    ctx.fillText(this.concept.title, cx, cy + 8);

    // Excerpt on hover
    if (isHovered && textOpacity > 0.5) {
      ctx.font = '300 11px ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif';
      ctx.fillStyle = `rgba(255,255,255,${0.68 * textOpacity})`;
      ctx.fillText(this.concept.desc, cx, cy + 34);
    }
  }
}
