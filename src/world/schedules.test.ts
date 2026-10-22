import { describe, expect, test } from 'bun:test';
import { CHARACTERS, CHARACTER_LIST } from '../data/characters';
import { LOCATION_SPOTS } from '../data/locations';
import { HOME_PLOTS } from '../world/worldData';
import { navigationNetwork } from '../world/navigationNetwork';

describe('character roster', () => {
  test('roster is exactly the seven approved friends', () => {
    expect(CHARACTER_LIST.map((c) => c.id).sort()).toEqual(
      ['anirudh', 'chirag', 'jatin', 'shagun', 'shreya', 'vaishnavi', 'zannat'].sort()
    );
  });

  test('every relationship targets a roster member', () => {
    for (const c of CHARACTER_LIST) {
      for (const rel of Object.values(c.relationships)) {
        expect(CHARACTERS[rel.targetId]).toBeDefined();
      }
    }
  });
});

describe('daily schedules', () => {
  test('every schedule entry references an existing location and has valid hours', () => {
    for (const c of CHARACTER_LIST) {
      expect(c.schedule.length).toBeGreaterThan(0);
      for (const s of c.schedule) {
        expect(LOCATION_SPOTS[s.locationId]).toBeDefined();
        expect(s.startHour).toBeGreaterThanOrEqual(0);
        expect(s.endHour).toBeLessThanOrEqual(24);
        expect(s.endHour).toBeGreaterThan(s.startHour);
        for (const v of s.targetPos) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  test('schedule entries never overlap and are sorted', () => {
    for (const c of CHARACTER_LIST) {
      for (let i = 1; i < c.schedule.length; i++) {
        expect(c.schedule[i].startHour).toBeGreaterThanOrEqual(
          c.schedule[i - 1].endHour
        );
      }
    }
  });

  test('every routine transition is walkable: a valid graph path exists between consecutive destinations', () => {
    for (const c of CHARACTER_LIST) {
      for (let i = 0; i < c.schedule.length; i++) {
        const from = c.schedule[i].targetPos;
        // Next destination is the following entry, wrapping midnight to the first entry.
        const to = c.schedule[(i + 1) % c.schedule.length].targetPos;
        const path = navigationNetwork.findPath(from[0], from[2], to[0], to[2]);
        expect(path.length, `${c.id} transition #${i} produced no path`).toBeGreaterThan(0);
        for (const p of path) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.z)).toBe(true);
        }
        expect(path[path.length - 1]).toEqual({ x: to[0], z: to[2] });
      }
    }
  });

  test('home entries stand clear inside the owner\'s built house (no wall/furniture clipping)', () => {
    for (const c of CHARACTER_LIST) {
      const plot = HOME_PLOTS.find((h) => h.ownerId === c.id);
      expect(plot, `no home plot for ${c.id}`).toBeDefined();
      if (!plot) continue;
      for (const s of c.schedule) {
        if (!s.locationId.startsWith('home_')) continue;
        // At least 0.5m clear of the interior walls on both axes.
        expect(
          Math.abs(s.targetPos[0] - plot.x),
          `${c.id} home x clips walls`
        ).toBeLessThanOrEqual(plot.width / 2 - 0.5);
        expect(
          Math.abs(s.targetPos[2] - plot.z),
          `${c.id} home z clips walls`
        ).toBeLessThanOrEqual(plot.depth / 2 - 0.5);
      }
    }
  });
});
