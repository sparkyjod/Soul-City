import { describe, expect, test } from 'bun:test';
import { NavigationNetwork, RouteFollower, navigationNetwork } from './navigationNetwork';
import { PEDESTRIAN_NETWORK } from './worldData';

const NODE_COORDS = new Set(
  PEDESTRIAN_NETWORK.nodes.map((n) => `${n.x},${n.z}`)
);

describe('NavigationNetwork pathfinding', () => {
  const net = new NavigationNetwork();

  test('graph loads with every shared node', () => {
    expect(net.nodes.size).toBe(PEDESTRIAN_NETWORK.nodes.length);
  });

  test('path from Anirudh\'s home to the beach pier follows graph nodes and ends at the target', () => {
    const targetX = 0;
    const targetZ = 95;
    const path = net.findPath(-38, -44, targetX, targetZ);
    expect(path.length).toBeGreaterThan(3);
    // Final point is always the exact requested destination.
    expect(path[path.length - 1]).toEqual({ x: targetX, z: targetZ });
    // Every intermediate point is a real node coordinate (no invented waypoints).
    for (const p of path.slice(0, -1)) {
      expect(NODE_COORDS.has(`${p.x},${p.z}`)).toBe(true);
    }
  });

  test('path from home to school corridor exists (regression: reverse-edge fix)', () => {
    const path = net.findPath(-2, -44, 0, -78); // Shreya's home -> school corridor
    expect(path.length).toBeGreaterThan(2);
    expect(path[path.length - 1]).toEqual({ x: 0, z: -78 });
  });

  test('path to a location already at returns just the target point', () => {
    const path = net.findPath(0, -52, 0.2, -52.1);
    expect(path.length).toBe(1);
  });

  test('paths never contain NaN and are self-consistent between consecutive points', () => {
    const path = net.findPath(-38, -44, 28, 22); // Ani home -> arcade interior
    expect(path.length).toBeGreaterThan(2);
    for (const p of path) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });
});

describe('RouteFollower', () => {
  test('walks a straight route exactly through its waypoint and reports done', () => {
    const f = new RouteFollower([{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    let x = 0;
    let z = 0;
    let steps = 0;
    while (!f.done && steps < 100) {
      const s = f.advance(x, z, 2);
      x = s.x;
      z = s.z;
      steps++;
    }
    expect(f.done).toBe(true);
    expect(x).toBeCloseTo(10, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  test('empty route is immediately done', () => {
    const f = new RouteFollower([]);
    expect(f.done).toBe(true);
    const s = f.advance(5, 5, 1);
    expect(s.x).toBe(5);
    expect(s.z).toBe(5);
    expect(s.dirX).toBe(0);
  });

  test('never overshoots a waypoint: steps clamp to it', () => {
    const f = new RouteFollower([{ x: 5, z: 0 }]);
    const s = f.advance(0, 0, 99); // giant step
    expect(s.x).toBeCloseTo(5, 5);
    expect(f.done).toBe(true);
  });

  test('skips waypoints already within the arrival threshold', () => {
    const f = new RouteFollower([
      { x: 0.1, z: 0 },
      { x: 10, z: 0 },
    ]);
    const s = f.advance(0, 0, 1);
    // First waypoint is inside threshold (0.5) so it is skipped; heads for the second.
    expect(f.progressIndex).toBeGreaterThanOrEqual(1);
    expect(s.x).toBeGreaterThan(0);
  });

  test('reports travel direction for facing/animation', () => {
    const f = new RouteFollower([{ x: 0, z: 10 }]);
    const s = f.advance(0, 0, 1);
    expect(s.dirX).toBeCloseTo(0, 5);
    expect(s.dirZ).toBeCloseTo(1, 5);
  });

  test('multi-leg route visits every leg in order', () => {
    const f = new RouteFollower([
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
    ]);
    const visited: string[] = [];
    let x = 0;
    let z = 0;
    let steps = 0;
    while (!f.done && steps < 200) {
      const before = f.progressIndex;
      const s = f.advance(x, z, 1.5);
      x = s.x;
      z = s.z;
      if (f.progressIndex !== before) visited.push(`${x},${z}`);
      steps++;
    }
    expect(f.done).toBe(true);
    expect(visited.length).toBe(3);
  });
});
