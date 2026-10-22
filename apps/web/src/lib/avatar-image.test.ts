import { describe, expect, it } from "vitest";
import {
  avatarCoverScale,
  avatarDisplaySize,
  clampAvatarCropOffset,
  cropSourceSquare,
} from "./avatar-image";

describe("avatarCoverScale", () => {
  it("fills the viewport with the shorter edge", () => {
    expect(avatarCoverScale(800, 600, 280)).toBeCloseTo(280 / 600);
    expect(avatarCoverScale(400, 800, 200)).toBeCloseTo(200 / 400);
  });
});

describe("clampAvatarCropOffset", () => {
  it("keeps pan inside a landscape image at zoom 1", () => {
    const crop = {
      imageWidth: 800,
      imageHeight: 600,
      viewportSize: 280,
      zoom: 1,
      offsetX: 999,
      offsetY: 999,
    };
    const clamped = clampAvatarCropOffset(crop);
    const { width, height } = avatarDisplaySize({ ...crop, ...clamped });
    expect(width).toBeGreaterThan(280);
    expect(height).toBeCloseTo(280);
    expect(clamped.offsetY).toBe(0);
    expect(Math.abs(clamped.offsetX)).toBeCloseTo((width - 280) / 2);
  });

  it("allows more pan when zoomed in", () => {
    const base = {
      imageWidth: 800,
      imageHeight: 600,
      viewportSize: 280,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    };
    const zoomed = { ...base, zoom: 2, offsetX: 999, offsetY: 999 };
    const at1 = clampAvatarCropOffset(base);
    const at2 = clampAvatarCropOffset(zoomed);
    expect(Math.abs(at2.offsetX)).toBeGreaterThan(Math.abs(at1.offsetX));
    expect(Math.abs(at2.offsetY)).toBeGreaterThan(0);
  });
});

describe("cropSourceSquare", () => {
  it("returns a centered square covering the shorter side at zoom 1", () => {
    const crop = {
      imageWidth: 800,
      imageHeight: 600,
      viewportSize: 280,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    };
    const square = cropSourceSquare(crop);
    expect(square.size).toBeCloseTo(600);
    expect(square.y).toBeCloseTo(0);
    expect(square.x).toBeCloseTo(100);
  });

  it("stays within image bounds when panned hard", () => {
    const crop = {
      imageWidth: 800,
      imageHeight: 600,
      viewportSize: 280,
      zoom: 1.5,
      offsetX: -10_000,
      offsetY: 10_000,
    };
    const clamped = clampAvatarCropOffset(crop);
    const square = cropSourceSquare({ ...crop, ...clamped });
    expect(square.x).toBeGreaterThanOrEqual(0);
    expect(square.y).toBeGreaterThanOrEqual(0);
    expect(square.x + square.size).toBeLessThanOrEqual(800 + 1e-6);
    expect(square.y + square.size).toBeLessThanOrEqual(600 + 1e-6);
  });
});
