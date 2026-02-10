import { CONFIG } from "./config";
import type { SimplexNoise } from "./noise";

export class Vertex {
  angle: number;
  index: number;
  x: number = 0;
  y: number = 0;

  constructor(angle: number, index: number) {
    this.angle = angle;
    this.index = index;
  }

  update(params: {
    noise: SimplexNoise;
    time: number;
    originX: number;
    originY: number;
    currentRadius: number;
    noiseOffset: number;
    mouseX: number;
    mouseY: number;
    noiseSpeed: number;
    noiseAmplitude: number;
    viscosity: number;
  }) {
    const { noise, time, originX, originY, currentRadius, noiseOffset, mouseX, mouseY, noiseSpeed, noiseAmplitude, viscosity } = params;

    const noiseVal = noise(
      Math.cos(this.angle) + time * noiseSpeed + noiseOffset,
      Math.sin(this.angle) + time * noiseSpeed + noiseOffset
    );

    const r = currentRadius + noiseVal * noiseAmplitude;

    // Mouse deformation (subtle pull on the facing side)
    let offsetX = 0;
    let offsetY = 0;
    const dx = mouseX - originX;
    const dy = mouseY - originY;
    const dist = Math.hypot(dx, dy);

    if (dist < CONFIG.mouseReach) {
      const angleToMouse = Math.atan2(dy, dx);
      let angleDiff = this.angle - angleToMouse;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < Math.PI / 2) {
        const force = (1 - dist / CONFIG.mouseReach) * CONFIG.mouseForce;
        const pull = force * Math.cos(angleDiff);
        offsetX = Math.cos(angleToMouse) * pull;
        offsetY = Math.sin(angleToMouse) * pull;
      }
    }

    const tx = originX + Math.cos(this.angle) * r + offsetX;
    const ty = originY + Math.sin(this.angle) * r + offsetY;

    this.x += (tx - this.x) * viscosity;
    this.y += (ty - this.y) * viscosity;
  }
}
