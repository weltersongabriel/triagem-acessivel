import { describe, expect, it } from "vitest";
import { bodyRegionAt, markerForRegion } from "./bodyRegions";

describe("3D body region mapping", () => {
  it("maps front and back arm taps to distinguishable labels", () => {
    const point = { x: -0.7, y: 2.4 };

    expect(bodyRegionAt(point, "front")).toBe("Braço direito");
    expect(bodyRegionAt(point, "back")).toBe("Braço direito (atrás)");
  });

  it("keeps back leg labels aligned with their anatomical marker positions", () => {
    const rightLeg = bodyRegionAt({ x: -0.22, y: 1 }, "back");
    const leftLeg = bodyRegionAt({ x: 0.22, y: 1 }, "back");

    expect(rightLeg).toBe("Perna direita (atrás)");
    expect(leftLeg).toBe("Perna esquerda (atrás)");
    expect(markerForRegion(rightLeg).x).toBeLessThan(0);
    expect(markerForRegion(leftLeg).x).toBeGreaterThan(0);
    expect(markerForRegion(leftLeg).back).toBe(true);
  });

  it("maps the back of the pelvis to the buttocks", () => {
    expect(bodyRegionAt({ x: 0, y: 1.7 }, "back")).toBe("Bumbum");
  });

  it("places selected back regions on the posterior side of the model", () => {
    const marker = markerForRegion("Costas (em cima)");

    expect(marker.back).toBe(true);
    expect(marker.z).toBeLessThan(0);
  });
});
