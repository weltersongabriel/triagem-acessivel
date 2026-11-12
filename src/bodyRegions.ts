import type { Side } from "./domain";

export const BODY_HEIGHT = 3.45;

export const BODY_REGIONS = [
  "Cabeça",
  "Pescoço",
  "Peito",
  "Barriga",
  "Braço direito",
  "Braço esquerdo",
  "Mão direita",
  "Mão esquerda",
  "Perna direita",
  "Perna esquerda",
  "Pé direito",
  "Pé esquerdo",
] as const;

export const BACK_LABELS: Record<(typeof BODY_REGIONS)[number], string> = {
  Cabeça: "Cabeça (atrás)",
  Pescoço: "Pescoço (atrás)",
  Peito: "Costas (em cima)",
  Barriga: "Costas (embaixo)",
  "Braço direito": "Braço esquerdo (atrás)",
  "Braço esquerdo": "Braço direito (atrás)",
  "Mão direita": "Mão esquerda (atrás)",
  "Mão esquerda": "Mão direita (atrás)",
  "Perna direita": "Perna esquerda (atrás)",
  "Perna esquerda": "Perna direita (atrás)",
  "Pé direito": "Pé esquerdo (atrás)",
  "Pé esquerdo": "Pé direito (atrás)",
};

const FRONT_LABELS = new Map(
  Object.entries(BACK_LABELS).map(([frontLabel, backLabel]) => [backLabel, frontLabel]),
);

export function bodyRegionAt(
  point: { x: number; y: number },
  side: Side,
): string {
  const height = point.y / BODY_HEIGHT;
  const isRightSide = point.x < 0;
  let region: (typeof BODY_REGIONS)[number];

  if (height >= 0.91) region = "Cabeça";
  else if (height >= 0.84) region = "Pescoço";
  else if (Math.abs(point.x) > 0.36 && height >= 0.47 && height < 0.85) {
    region =
      height < 0.55
        ? isRightSide
          ? "Mão direita"
          : "Mão esquerda"
        : isRightSide
          ? "Braço direito"
          : "Braço esquerdo";
  } else if (side === "back" && height >= 0.44 && height < 0.57 && Math.abs(point.x) < 0.3) {
    return "Bumbum";
  } else if (height < 0.07) region = isRightSide ? "Pé direito" : "Pé esquerdo";
  else if (height < 0.49) region = isRightSide ? "Perna direita" : "Perna esquerda";
  else if (height < 0.66) region = "Barriga";
  else if (height < 0.82) region = "Peito";
  else region = "Pescoço";

  return side === "back" ? BACK_LABELS[region] : region;
}

export function markerForRegion(label: string): {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  back: boolean;
} {
  const frontLabel = FRONT_LABELS.get(label) ?? label;
  const back = FRONT_LABELS.has(label) || label === "Bumbum";
  const rightSide = frontLabel.endsWith("direito");
  const x = rightSide ? -1 : 1;
  let y: number;
  let zMagnitude: number;
  let width: number;
  let height: number;

  if (frontLabel.startsWith("Cabeça")) {
    y = 3.2;
    zMagnitude = 0.13;
    width = 0.13;
    height = 0.18;
  } else if (frontLabel.startsWith("Pescoço")) {
    y = 2.92;
    zMagnitude = 0.17;
    width = 0.12;
    height = 0.12;
  } else if (frontLabel.startsWith("Peito")) {
    y = 2.48;
    zMagnitude = 0.4;
    width = 0.24;
    height = 0.22;
  } else if (frontLabel.startsWith("Barriga")) {
    y = 2.02;
    zMagnitude = 0.4;
    width = 0.2;
    height = 0.2;
  } else if (frontLabel.startsWith("Braço")) {
    y = 2.25;
    zMagnitude = 0.14;
    width = 0.12;
    height = 0.23;
  } else if (frontLabel.startsWith("Mão")) {
    y = 1.66;
    zMagnitude = 0.13;
    width = 0.1;
    height = 0.12;
  } else if (frontLabel.startsWith("Perna")) {
    y = 0.94;
    zMagnitude = 0.12;
    width = 0.13;
    height = 0.25;
  } else if (frontLabel.startsWith("Pé")) {
    y = 0.12;
    zMagnitude = 0.15;
    width = 0.14;
    height = 0.1;
  } else if (label === "Bumbum") {
    y = 1.65;
    zMagnitude = 0.38;
    width = 0.24;
    height = 0.2;
  } else if (frontLabel.startsWith("Costas")) {
    y = frontLabel.includes("em cima") ? 2.48 : 2.02;
    zMagnitude = 0.4;
    width = 0.24;
    height = 0.22;
  } else {
    y = 1.65;
    zMagnitude = 0.38;
    width = 0.24;
    height = 0.2;
  }

  if (frontLabel.startsWith("Braço")) return { x: x * 0.75, y, z: back ? -zMagnitude : zMagnitude, width, height, back };
  if (frontLabel.startsWith("Mão")) return { x: x * 0.78, y, z: back ? -zMagnitude : zMagnitude, width, height, back };
  if (frontLabel.startsWith("Perna") || frontLabel.startsWith("Pé")) {
    return { x: x * 0.22, y, z: back ? -zMagnitude : zMagnitude, width, height, back };
  }

  return {
    x: 0,
    y,
    z: back ? -zMagnitude : zMagnitude,
    width,
    height,
    back,
  };
}
