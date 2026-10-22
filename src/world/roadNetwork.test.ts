import { describe, expect, test } from 'bun:test';
import {
  LANE_HALF_OFFSET,
  ROADS,
  STOP_LINE_OFFSET,
  TRAFFIC_SIGNALS,
  type SignalPhase,
} from './worldData';
import {
  laneEndsAtSignal,
  movementsByLane,
  trafficNetwork,
  type LaneSegment,
} from './roadNetwork';

const { lanes, laneById, junctions, movements, movementsByLane: byLane } = trafficNetwork;

describe('lane network shape', () => {
  test('every road contributes drivable lanes', () => {
    for (const road of ROADS) {
      const roadLanes = lanes.filter((l) => l.roadId === road.id);
      expect(roadLanes.length).toBeGreaterThanOrEqual(2);
    }
    expect(lanes.length).toBe(16);
  });

  test('lanes sit at the shared lane offset and follow left-hand traffic', () => {
    for (const lane of lanes) {
      const road = ROADS.find((r) => r.id === lane.roadId)!;
      if (lane.axis === 'ns') {
        // northbound keeps the west side, southbound the east side
        const expectedX = road.centerX + (lane.direction === 'northbound' ? -LANE_HALF_OFFSET : LANE_HALF_OFFSET);
        expect(Math.abs(lane.startX - expectedX)).toBeLessThan(1e-6);
        expect(Math.abs(lane.endX - expectedX)).toBeLessThan(1e-6);
        expect(lane.direction === 'northbound' ? lane.dirZ : -lane.dirZ).toBeLessThan(0);
      } else {
        // eastbound keeps the north side, westbound the south side
        const expectedZ = road.centerZ + (lane.direction === 'eastbound' ? -LANE_HALF_OFFSET : LANE_HALF_OFFSET);
        expect(Math.abs(lane.startZ - expectedZ)).toBeLessThan(1e-6);
        expect(Math.abs(lane.endZ - expectedZ)).toBeLessThan(1e-6);
        expect(lane.direction === 'eastbound' ? lane.dirX : -lane.dirX).toBeGreaterThan(0);
      }
      // Lanes stay inside the painted carriageway.
      if (lane.axis === 'ns') {
        expect(Math.abs(lane.startX - road.centerX)).toBeLessThan(road.width / 2);
      } else {
        expect(Math.abs(lane.startZ - road.centerZ)).toBeLessThan(road.width / 2);
      }
    }
  });

  test('no lane runs into the school building', () => {
    // The school occupies x -34…34, z -108…-64; the avenue stops at its junction.
    for (const lane of lanes) {
      for (const p of [
        { x: lane.startX, z: lane.startZ },
        { x: lane.endX, z: lane.endZ },
      ]) {
        const insideSchool = Math.abs(p.x) < 34 && p.z < -64 && p.z > -108;
        expect(insideSchool, `${lane.id} runs through the school`).toBe(false);
      }
    }
  });

  test('lane geometry is consistent (start/end, unit direction, positive length)', () => {
    for (const lane of lanes) {
      expect(lane.length).toBeGreaterThan(1);
      const dx = (lane.endX - lane.startX) / lane.length;
      const dz = (lane.endZ - lane.startZ) / lane.length;
      expect(Math.abs(dx - lane.dirX)).toBeLessThan(1e-6);
      expect(Math.abs(dz - lane.dirZ)).toBeLessThan(1e-6);
      expect(Math.abs(Math.hypot(lane.dirX, lane.dirZ) - 1)).toBeLessThan(1e-6);
    }
  });
});

describe('stop lines and signals', () => {
  const signalByApproach = (lane: LaneSegment) => {
    const directionToApproach: Record<string, string> = {
      northbound: 'north',
      southbound: 'south',
      eastbound: 'east',
      westbound: 'west',
    };
    return TRAFFIC_SIGNALS.find(
      (s) =>
        s.intersectionId === lane.toJunctionId &&
        s.controlsRoadId === lane.roadId &&
        s.approachDirection === directionToApproach[lane.direction]
    );
  };

  test('every signalized lane ends exactly on its shared stop line', () => {
    let checked = 0;
    for (const lane of lanes) {
      if (!laneEndsAtSignal(lane)) continue;
      const signal = signalByApproach(lane);
      expect(signal, `no signal head for ${lane.direction} on ${lane.roadId}`).toBeDefined();
      if (!signal) continue;
      expect(Math.abs(lane.endX - signal.stopLineX)).toBeLessThan(0.001);
      expect(Math.abs(lane.endZ - signal.stopLineZ)).toBeLessThan(0.001);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(8);
  });

  test('stop lines sit STOP_LINE_OFFSET from the junction centre', () => {
    for (const lane of lanes) {
      if (!lane.toJunctionId) continue;
      const junction = junctions.get(lane.toJunctionId)!;
      if (!junction.signalized) continue;
      const alongAxis = lane.axis === 'ns' ? Math.abs(lane.endZ - junction.z) : Math.abs(lane.endX - junction.x);
      expect(Math.abs(alongAxis - STOP_LINE_OFFSET)).toBeLessThan(0.001);
    }
  });

  test('signal phase always matches the approach road orientation', () => {
    for (const lane of lanes) {
      const road = ROADS.find((r) => r.id === lane.roadId)!;
      const expected: SignalPhase = road.orientation === 'north_south' ? 'north_south' : 'east_west';
      expect(lane.signalPhase).toBe(expected);
    }
  });
});

describe('turning connections', () => {
  test('every lane has at least one legal exit', () => {
    for (const lane of lanes) {
      const options = byLane.get(lane.id) ?? [];
      expect(options.length, `${lane.id} is a dead end`).toBeGreaterThan(0);
    }
  });

  test('movements reference real lanes at their own junction', () => {
    for (const movement of movements) {
      const from = laneById.get(movement.fromLaneId);
      const to = laneById.get(movement.toLaneId);
      expect(from).toBeDefined();
      expect(to).toBeDefined();
      if (!from || !to) continue;
      const junction = junctions.get(movement.junctionId)!;
      expect(junction.inboundLaneIds).toContain(from.id);
      expect(junction.outboundLaneIds).toContain(to.id);
      expect(from.toJunctionId).toBe(junction.id);
      expect(to.fromJunctionId).toBe(junction.id);
      expect(movement.path.length).toBeGreaterThanOrEqual(2);
      expect(movement.length).toBeGreaterThan(0);
    }
  });

  test('turn paths start on the stop line and end on the receiving lane', () => {
    for (const movement of movements) {
      const from = laneById.get(movement.fromLaneId)!;
      const to = laneById.get(movement.toLaneId)!;
      const first = movement.path[0];
      const last = movement.path[movement.path.length - 1];
      expect(Math.hypot(first.x - from.endX, first.z - from.endZ)).toBeLessThan(0.001);
      expect(Math.hypot(last.x - to.startX, last.z - to.startZ)).toBeLessThan(0.001);
    }
  });

  test('conflicts are symmetric and never self-referential', () => {
    for (const movement of movements) {
      expect(movement.conflicts).not.toContain(movement.id);
      for (const otherId of movement.conflicts) {
        const other = trafficNetwork.movementById.get(otherId);
        expect(other).toBeDefined();
        expect(other!.conflicts).toContain(movement.id);
      }
    }
  });

  test('opposing left turns conflict, parallel straight-throughs do not', () => {
    const straightNorth = movements.find((m) => m.type === 'straight' && m.fromLaneId.startsWith('northbound'));
    const straightSouth = movements.find((m) => m.type === 'straight' && m.fromLaneId.startsWith('southbound'));
    expect(straightNorth).toBeDefined();
    expect(straightSouth).toBeDefined();
    if (straightNorth && straightSouth && straightNorth.junctionId === straightSouth.junctionId) {
      expect(straightNorth.conflicts).not.toContain(straightSouth.id);
    }
  });

  test('the lane graph is strongly connected: every lane is reachable from every other', () => {
    for (const start of lanes) {
      const seen = new Set<string>([start.id]);
      const queue = [start.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const movement of movementsByLane.get(current) ?? []) {
          if (!seen.has(movement.toLaneId)) {
            seen.add(movement.toLaneId);
            queue.push(movement.toLaneId);
          }
        }
      }
      expect(seen.size, `unreachable lanes from ${start.id}`).toBe(lanes.length);
    }
  });
});
