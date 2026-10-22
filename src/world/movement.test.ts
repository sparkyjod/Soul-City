import { describe, expect, test } from 'bun:test';
import { findClearSpot, moveToward, moveWithSlide } from './movement';

const RADIUS = 0.45;

/** Vertical wall occupying x >= wallX, spanning every z. */
const wallAt = (wallX: number) => (x: number, _z: number, r: number) => x + r > wallX;

describe('moveWithSlide', () => {
  test('walks straight ahead in open space', () => {
    const res = moveWithSlide(0, 0, 1, 0, 0.5, RADIUS, () => false);
    expect(res.x).toBeCloseTo(0.5, 5);
    expect(res.z).toBeCloseTo(0, 5);
    expect(res.moved).toBe(true);
    expect(res.slid).toBe(false);
  });

  test('slides along a wall instead of stopping dead', () => {
    const blocked = wallAt(1.8);
    const res = moveWithSlide(1, 0, 1, 0, 0.5, RADIUS, blocked);
    expect(res.moved).toBe(true);
    expect(res.slid).toBe(true);
    // Never penetrates the wall, but does make sideways progress.
    expect(res.x).toBeLessThanOrEqual(1.35);
    expect(Math.abs(res.z)).toBeGreaterThan(0);
  });

  test('cannot move when boxed in on every side', () => {
    // Start is clear, every surrounding position is blocked.
    const res = moveWithSlide(0, 0, 1, 0, 0.5, RADIUS, (x, z) => x !== 0 || z !== 0);
    expect(res.moved).toBe(false);
    expect(res.x).toBe(0);
    expect(res.z).toBe(0);
  });

  test('a body already overlapping geometry can step out of it', () => {
    // Solid box |x| < 1, |z| < 1; body starts inside it.
    const blocked = (x: number, z: number, r: number) => Math.abs(x) + r < 1 && Math.abs(z) + r < 1;
    const res = moveWithSlide(0.8, 0, 1, 0, 0.5, RADIUS, blocked);
    expect(res.x).toBeGreaterThan(0.8);
  });

  test('zero-length direction leaves the body untouched', () => {
    const res = moveWithSlide(3, 4, 0, 0, 1, RADIUS, () => false);
    expect(res.moved).toBe(false);
    expect(res.x).toBe(3);
    expect(res.z).toBe(4);
  });
});

describe('moveToward', () => {
  const box = (cx: number, cz: number, half: number) => (x: number, z: number, r: number) =>
    Math.abs(x - cx) < half + r && Math.abs(z - cz) < half + r;

  test('walks straight at an unobstructed target', () => {
    const res = moveToward(0, 0, 10, 0, 0.5, RADIUS, () => false);
    expect(res.x).toBeCloseTo(0.5, 5);
    expect(res.moved).toBe(true);
  });

  test('rounds an obstacle out of the direct line and keeps closing in', () => {
    const blocked = box(3, 0, 0.6);
    // Mirrors the engine policy: commit to a side, flip it when progress stalls.
    let x = 0;
    let z = 0;
    let side = 0;
    let best = Infinity;
    let stall = 0;
    for (let i = 0; i < 400; i++) {
      const res = moveToward(x, z, 8, 0, 0.4, RADIUS, blocked, side);
      if (res.deviation !== 0) {
        side = Math.sign(res.deviation);
      } else if (res.moved) {
        side = 0;
      }
      x = res.x;
      z = res.z;
      const d = Math.hypot(8 - x, z);
      if (d < best - 0.02) {
        best = d;
        stall = 0;
      } else if (++stall > 15) {
        side = side === 1 ? -1 : 1;
        stall = 0;
      }
    }
    expect(blocked(x, z, RADIUS)).toBe(false);
    expect(Math.hypot(8 - x, z)).toBeLessThan(0.6);
  });

  test('never picks a side that oscillates in place', () => {
    const blocked = box(1.2, 0, 0.6);
    const first = moveToward(0, 0, 4, 0, 0.4, RADIUS, blocked);
    const second = moveToward(0, 0, 4, 0, 0.4, RADIUS, blocked);
    expect(first.x).toBeCloseTo(second.x, 9);
    expect(first.z).toBeCloseTo(second.z, 9);
  });
});

describe('findClearSpot', () => {
  test('returns null when the position is already clear', () => {
    expect(findClearSpot(0, 0, RADIUS, () => false)).toBeNull();
  });

  test('finds the nearest clear position out of a furniture box', () => {
    const blocked = (x: number, z: number, r: number) =>
      Math.abs(x) + r < 1 && Math.abs(z) + r < 1;
    const spot = findClearSpot(0.2, 0.2, RADIUS, blocked, 2.5);
    expect(spot).not.toBeNull();
    if (!spot) return;
    expect(blocked(spot.x, spot.z, RADIUS)).toBe(false);
    // Nearest clear point is just outside the 1 m half-extent plus body radius.
    expect(Math.hypot(spot.x - 0.2, spot.z - 0.2)).toBeLessThanOrEqual(2.5);
  });

  test('gives up when no clear spot exists within range', () => {
    expect(findClearSpot(0, 0, RADIUS, () => true, 2.5)).toBeNull();
  });
});
