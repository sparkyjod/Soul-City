import { describe, expect, test } from 'bun:test';
import { CROSSWALKS, INTERSECTIONS } from './worldData';
import {
  crossingZones,
  occupiedZoneIds,
  walkStateFor,
  zoneAt,
  zoneById,
  zonesForMovementPath,
  zonesOnSegment,
} from './pedestrianCrossings';
import { SignalController, DEFAULT_SIGNAL_TIMINGS } from './trafficSignals';
import { trafficNetwork } from './roadNetwork';

const controller = new SignalController(
  trafficNetwork.junctionList.map((j) => ({ id: j.id, offset: j.signalOffset })),
  DEFAULT_SIGNAL_TIMINGS
);
const cycle = controller.cycleLength;

describe('crossing zones mirror the shared crosswalk data', () => {
  test('one zone per painted zebra', () => {
    expect(crossingZones.length).toBe(CROSSWALKS.length);
    for (const cw of CROSSWALKS) {
      const zone = zoneById.get(cw.id);
      expect(zone, `missing zone for ${cw.id}`).toBeDefined();
      expect(zone!.x).toBe(cw.x);
      expect(zone!.z).toBe(cw.z);
      expect(zone!.halfWidth).toBe(cw.width / 2);
      expect(zone!.halfDepth).toBe(cw.depth / 2);
    }
  });

  test('walkers cross along the zebra long side, opposite to the road it crosses', () => {
    for (const cw of CROSSWALKS) {
      const zone = zoneById.get(cw.id)!;
      expect(zone.walkAxis).toBe(cw.width >= cw.depth ? 'x' : 'z');
      // walkPhase is always the orientation of the OTHER road at the junction.
      const ix = INTERSECTIONS.find((i) => i.id === cw.intersectionId)!;
      expect(ix.roads).toContain(cw.crossesRoadId);
    }
  });

  test('a walker is only on a crossing while actually standing on the paint', () => {
    const zone = zoneById.get(CROSSWALKS[0].id)!;
    expect(zoneAt(zone.x, zone.z)).toBe(zone);
    expect(zoneAt(zone.x + zone.halfWidth + 2, zone.z)).not.toBe(zone);
    const occupants = occupiedZoneIds([{ x: zone.x, z: zone.z }]);
    expect(occupants.has(zone.id)).toBe(true);
    const passing = occupiedZoneIds([{ x: zone.x + zone.halfWidth + 4, z: zone.z }]);
    expect(passing.has(zone.id)).toBe(false);
  });
});

describe('pedestrian walk phases coordinate with vehicle signals', () => {
  test('a crossing is walkable exactly when its walk phase is green', () => {
    for (const zone of crossingZones) {
      for (let t = 0; t < cycle * 2; t += 0.5) {
        const color = controller.colorFor(zone.intersectionId, zone.walkPhase, t);
        expect(walkStateFor(zone, controller, t)).toBe(color === 'green' ? 'walk' : 'wait');
      }
    }
  });

  test('pedestrians at a junction never get a walk while the crossed road is green', () => {
    for (const ix of INTERSECTIONS) {
      for (let t = 0; t < cycle * 2; t += 0.25) {
        for (const zone of crossingZones.filter((z) => z.intersectionId === ix.id)) {
          const crossingTrafficPhase = zone.walkPhase === 'north_south' ? 'east_west' : 'north_south';
          const crossingTraffic = controller.colorFor(ix.id, crossingTrafficPhase, t);
          if (walkStateFor(zone, controller, t) === 'walk') {
            expect(crossingTraffic, `walk on ${zone.id} while ${crossingTrafficPhase} is green`).not.toBe('green');
          }
        }
      }
    }
  });

  test('there is always a red window (all-red) between the two walk phases', () => {
    const ix = INTERSECTIONS[0];
    const zones = crossingZones.filter((z) => z.intersectionId === ix.id);
    let bothWaiting = 0;
    for (let t = 0; t < cycle; t += 0.25) {
      if (zones.every((z) => walkStateFor(z, controller, t) === 'wait')) bothWaiting++;
    }
    expect(bothWaiting).toBeGreaterThan(0);
  });
});

describe('crossings are connected to turn paths', () => {
  test('a segment across a zebra is detected, a parallel offset one is not', () => {
    const zone = zoneById.get(`${INTERSECTIONS[0].id}_north`)!;
    const across = zonesOnSegment(
      { x: zone.x - zone.halfWidth - 3, z: zone.z },
      { x: zone.x + zone.halfWidth + 3, z: zone.z }
    );
    expect(across.map((z) => z.id)).toContain(zone.id);

    const beside = zonesOnSegment(
      { x: zone.x - zone.halfWidth - 3, z: zone.z + zone.halfDepth + 6 },
      { x: zone.x + zone.halfWidth + 3, z: zone.z + zone.halfDepth + 6 }
    );
    expect(beside.map((z) => z.id)).not.toContain(zone.id);
  });

  test('turning traffic really does sweep over crosswalks (so yielding matters)', () => {
    const pathsThatCross = trafficNetwork.movements.filter(
      (m) => zonesForMovementPath(m.id, m.path).length > 0
    );
    expect(pathsThatCross.length).toBeGreaterThan(0);
  });
});
