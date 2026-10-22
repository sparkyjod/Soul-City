import { describe, expect, test } from 'bun:test';
import {
  CROSSWALKS,
  HOME_PLOTS,
  INTERSECTIONS,
  LANDMARK_FOOTPRINTS,
  PEDESTRIAN_NETWORK,
  ROADS,
  SIDEWALKS,
  TRAFFIC_SIGNALS,
} from './worldData';

describe('worldData invariants', () => {
  test('road network is non-empty and every road has sane dimensions', () => {
    expect(ROADS.length).toBeGreaterThan(0);
    for (const road of ROADS) {
      expect(road.width).toBeGreaterThan(0);
      expect(road.length).toBeGreaterThan(road.width);
    }
    expect(SIDEWALKS.length).toBeGreaterThan(0);
  });

  test('every crosswalk belongs to a known intersection', () => {
    const intersectionIds = new Set(INTERSECTIONS.map((ix) => ix.id));
    expect(CROSSWALKS.length).toBe(INTERSECTIONS.length * 2);
    for (const cw of CROSSWALKS) {
      expect(intersectionIds.has(cw.intersectionId)).toBe(true);
    }
  });

  test('traffic signals: exactly four heads per intersection, valid road refs, phase matches road orientation', () => {
    for (const ix of INTERSECTIONS) {
      const signals = TRAFFIC_SIGNALS.filter((s) => s.intersectionId === ix.id);
      expect(signals.length).toBe(4);
    }
    for (const sig of TRAFFIC_SIGNALS) {
      const road = ROADS.find((r) => r.id === sig.controlsRoadId);
      expect(road).toBeDefined();
      if (road) {
        expect(sig.phase).toBe(road.orientation);
      }
    }
  });

  test('every intersection references two existing roads that cross', () => {
    for (const ix of INTERSECTIONS) {
      const roads = ix.roads.map((id) => ROADS.find((r) => r.id === id));
      expect(roads[0]).toBeDefined();
      expect(roads[1]).toBeDefined();
      if (roads[0] && roads[1]) {
        expect(roads[0].orientation).not.toBe(roads[1].orientation);
      }
    }
  });

  test('landmark footprints have unique ids and positive sizes', () => {
    const ids = new Set(LANDMARK_FOOTPRINTS.map((f) => f.id));
    expect(ids.size).toBe(LANDMARK_FOOTPRINTS.length);
    for (const f of LANDMARK_FOOTPRINTS) {
      if (f.shape === 'rect') {
        expect(f.width).toBeGreaterThan(0);
        expect(f.depth).toBeGreaterThan(0);
      } else {
        expect(f.radius).toBeGreaterThan(0);
      }
    }
  });

  test('home plots are unique and match the 7-character roster positions', () => {
    const xs = new Set(HOME_PLOTS.map((h) => h.x));
    expect(xs.size).toBe(HOME_PLOTS.length);
    expect(HOME_PLOTS.length).toBe(7);
  });

  test('pedestrian network is fully connected from the school hub', () => {
    const nodes = new Map(PEDESTRIAN_NETWORK.nodes.map((n) => [n.id, n]));
    expect(nodes.has('school_avenue_center')).toBe(true);

    const seen = new Set<string>(['school_avenue_center']);
    const queue = ['school_avenue_center'];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nb of nodes.get(cur)?.neighbors ?? []) {
        expect(nodes.has(nb)).toBe(true); // no dangling references
        if (!seen.has(nb)) {
          seen.add(nb);
          queue.push(nb);
        }
      }
    }
    expect(seen.size).toBe(PEDESTRIAN_NETWORK.nodes.length);
  });

  test('pedestrian edges are symmetric (every walk can be reversed)', () => {
    const nodes = new Map(PEDESTRIAN_NETWORK.nodes.map((n) => [n.id, n]));
    for (const n of PEDESTRIAN_NETWORK.nodes) {
      for (const nb of n.neighbors) {
        const reverse = nodes.get(nb)?.neighbors.includes(n.id) ?? false;
        expect(reverse, `missing reverse edge ${nb} -> ${n.id}`).toBe(true);
      }
    }
  });

  test('home doorway nodes align with the built house plots (front at z=-48, door at z=-38)', () => {
    const nodes = PEDESTRIAN_NETWORK.nodes;
    for (const plot of HOME_PLOTS) {
      const front = nodes.find((n) => n.z === -48 && n.x === plot.x);
      const door = nodes.find((n) => n.z === -38 && n.x === plot.x);
      expect(front, `no front node at house x for ${plot.ownerId}`).toBeDefined();
      expect(door, `no door node at house x for ${plot.ownerId}`).toBeDefined();
    }
  });

  test('homes are entered through the front doorway, never straight through a wall', () => {
    const nodes = new Map(PEDESTRIAN_NETWORK.nodes.map((n) => [n.id, n]));
    const suffix: Record<string, string> = {
      anirudh: 'ani',
      vaishnavi: 'vaishu',
      chirag: 'chirag',
      shreya: 'shreya',
      zannat: 'zan',
      shagun: 'shagun',
      jatin: 'jatin',
    };

    for (const plot of HOME_PLOTS) {
      const s = suffix[plot.ownerId];
      const front = nodes.get(`home_${s}_front`);
      const door = nodes.get(`res_${s}_door`);
      const yard = nodes.get(`home_${s}_yard`);
      expect(front, `home_${s}_front missing`).toBeDefined();
      expect(door, `res_${s}_door missing`).toBeDefined();
      expect(yard, `home_${s}_yard missing`).toBeDefined();
      if (!front || !door || !yard) continue;

      // The straight front→door link punched through the house's back wall (z -44).
      expect(
        front.neighbors.includes(`res_${s}_door`),
        `${s} still has a wall-piercing front→door edge`
      ).toBe(false);

      // Entry goes around the house to the street-facing doorway (walls at z -44 / -36).
      expect(yard.z).toBeGreaterThan(-36);
      expect(yard.x).toBe(plot.x);
      expect(yard.neighbors.includes(`res_${s}_door`)).toBe(true);
    }
  });

  test('no pedestrian node stands inside the plaza fountain footprint', () => {
    // Fountain is a solid 9×9 basin at the plaza centre; walkers go around it.
    for (const n of PEDESTRIAN_NETWORK.nodes) {
      const insideFountain = Math.abs(n.x) < 5.4 && Math.abs(n.z) < 5.4;
      expect(insideFountain, `node ${n.id} sits in the fountain`).toBe(false);
    }
  });
});
