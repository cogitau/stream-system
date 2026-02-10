import { CONFIG } from "./config";
import type { SimplexNoise } from "./noise";

export class Vertex {
  angle: number;
  index: number;
  cosAngle: number;
  sinAngle: number;
  x: number;
  y: number;

  constructor(angle: number, index: number, x: number, y: number) {
    this.angle = angle;
    this.index = index;
    this.cosAngle = Math.cos(angle);
    this.sinAngle = Math.sin(angle);
    this.x = x;
    this.y = y;
  }

  update(
    noise: SimplexNoise,
    time: number,
    originX: number,
    originY: number,
    currentRadius: number,
    noiseOffset: number,
    mouseX: number,
    mouseY: number,
    noiseSpeed: number,
    noiseAmplitude: number,
    viscosity: number,
    quality: number
  ) {
    const noiseVal = noise(
      this.cosAngle + time * noiseSpeed + noiseOffset,
      this.sinAngle + time * noiseSpeed + noiseOffset
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
        const force = (1 - dist / CONFIG.mouseReach) * CONFIG.mouseForce * (0.8 + quality * 0.2);
        const pull = force * Math.cos(angleDiff);
        offsetX = Math.cos(angleToMouse) * pull;
        offsetY = Math.sin(angleToMouse) * pull;
      }
    }

    const tx = originX + this.cosAngle * r + offsetX;
    const ty = originY + this.sinAngle * r + offsetY;

    this.x += (tx - this.x) * viscosity;
    this.y += (ty - this.y) * viscosity;
  }
}
