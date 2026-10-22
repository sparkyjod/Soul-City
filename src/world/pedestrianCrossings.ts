/**
 * pedestrianCrossings.ts — the shared pedestrian-crossing model.
 *
 * Every zebra from worldData.CROSSWALKS becomes one `CrossingZone`: a rectangle
 * of carriageway that pedestrians may occupy only while their walk phase is
 * green. The same zones are used by three consumers, so they can never disagree:
 *
 *  - the pedestrian logic (GameEngine) holds a walker at the kerb until the
 *    zone's signal allows the crossing,
 *  - the vehicle simulation stops a car before its stop line while a walker is
 *    on a zone that its turn path crosses,
 *  - the tests exercise both of the above headlessly.
 *
 * Deliberately Three.js-free.
 */

import { CROSSWALKS, type Crosswalk, type SignalPhase } from './worldData';
import type { SignalController } from './trafficSignals';

export interface CrossingZone {
  /** Zebra id from worldData. */
  id: string;
  intersectionId: string;
  /** Road the zebra crosses. */
  crossesRoadId: string;
  /** Traffic phase pedestrians walk with. */
  walkPhase: SignalPhase;
  /** Direction pedestrians travel across the zone. */
  walkAxis: 'x' | 'z';
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

/** How far a walker's body extends from its position (used for occupancy). */
export const PEDESTRIAN_RADIUS = 0.55;
/** Extra clearance a car keeps when checking a crossing for walkers. */
export const CROSSING_CLEARANCE = 0.9;

const toZone = (cw: Crosswalk): CrossingZone => ({
  id: cw.id,
  intersectionId: cw.intersectionId,
  crossesRoadId: cw.crossesRoadId,
  walkPhase: cw.walkPhase,
  // Pedestrians walk along the zebra's long dimension.
  walkAxis: cw.width >= cw.depth ? 'x' : 'z',
  x: cw.x,
  z: cw.z,
  halfWidth: cw.width / 2,
  halfDepth: cw.depth / 2,
});

export const crossingZones: CrossingZone[] = CROSSWALKS.map(toZone);

export const zoneById: Map<string, CrossingZone> = new Map(
  crossingZones.map((zone) => [zone.id, zone])
);

export const zoneContains = (zone: CrossingZone, x: number, z: number, margin = 0): boolean =>
  Math.abs(x - zone.x) <= zone.halfWidth + margin &&
  Math.abs(z - zone.z) <= zone.halfDepth + margin;

/** The crossing a body at (x, z) is standing on, if any. */
export const zoneAt = (x: number, z: number, margin = 0): CrossingZone | null => {
  for (const zone of crossingZones) {
    if (zoneContains(zone, x, z, margin)) return zone;
  }
  return null;
};

/**
 * May a pedestrian step onto this crossing right now?
 *
 * Walkers only go on a green for their own walk phase; amber and both-red read
 * as "wait", which also gives turning traffic a clean all-red window to clear.
 */
export const walkStateFor = (
  zone: CrossingZone,
  signals: SignalController,
  time: number
): 'walk' | 'wait' =>
  signals.colorFor(zone.intersectionId, zone.walkPhase, time) === 'green' ? 'walk' : 'wait';

const segmentsIntersectRect = (
  ax: number,
  az: number,
  bx: number,
  bz: number,
  halfWidth: number,
  halfDepth: number
): boolean => {
  // Slab test in the rectangle's local frame (axis-aligned, so plain slabs).
  const dx = bx - ax;
  const dz = bz - az;
  let tMin = 0;
  let tMax = 1;

  for (const [origin, delta, half] of [
    [ax, dx, halfWidth],
    [az, dz, halfDepth],
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (Math.abs(origin) > half) return false;
      continue;
    }
    const t1 = (-half - origin) / delta;
    const t2 = (half - origin) / delta;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
    if (tMin > tMax) return false;
  }
  return true;
};

/** Every crossing a straight segment runs over. */
export const zonesOnSegment = (
  a: { x: number; z: number },
  b: { x: number; z: number },
  margin = 0
): CrossingZone[] =>
  crossingZones.filter((zone) =>
    segmentsIntersectRect(
      a.x - zone.x,
      a.z - zone.z,
      b.x - zone.x,
      b.z - zone.z,
      zone.halfWidth + margin,
      zone.halfDepth + margin
    )
  );

/** Zone ids currently covered by at least one walker. */
export const occupiedZoneIds = (
  pedestrians: readonly { x: number; z: number }[],
  margin = PEDESTRIAN_RADIUS
): Set<string> => {
  const occupied = new Set<string>();
  for (const ped of pedestrians) {
    for (const zone of crossingZones) {
      if (zoneContains(zone, ped.x, ped.z, margin)) occupied.add(zone.id);
    }
  }
  return occupied;
};

/** Zones a turn movement's path sweeps through. Cached per movement id. */
const movementZoneCache = new Map<string, CrossingZone[]>();

export const zonesForMovementPath = (
  movementId: string,
  path: readonly { x: number; z: number }[]
): CrossingZone[] => {
  const cached = movementZoneCache.get(movementId);
  if (cached) return cached;

  const found = new Map<string, CrossingZone>();
  for (let i = 1; i < path.length; i++) {
    for (const zone of zonesOnSegment(path[i - 1], path[i], CROSSING_CLEARANCE)) {
      found.set(zone.id, zone);
    }
  }
  const zones = [...found.values()];
  movementZoneCache.set(movementId, zones);
  return zones;
};
