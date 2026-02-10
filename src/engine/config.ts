export const CONFIG = {
  vertexCount: 22,
  noiseSpeed: 0.002,
  baseRadius: 135,
  hoverRadius: 158,
  mouseReach: 300,
  mouseForce: 38,
  viscosity: 0.06,
  spawnEveryMs: 1200,
  maxBlobs: 8,
  colors: {
    fill: "rgba(8, 8, 12, 0.65)",
    stroke: "rgba(255, 255, 255, 0.32)",
    strokeActive: "rgba(255, 255, 255, 0.85)",
    glow: "rgba(255, 255, 255, 0.28)",
    text: "rgba(255, 255, 255, 0.95)",
    textMuted: "rgba(255, 255, 255, 0.58)",
  },
} as const;
