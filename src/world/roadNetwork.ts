/**
 * roadNetwork.ts — DRIVABLE LANE NETWORK, DERIVED FROM THE SHARED ROAD DATA.
 *
 * Nothing here is hand-placed: every lane, stop line, junction and turn
 * connection is computed from worldData.ROADS / INTERSECTIONS / TRAFFIC_SIGNALS,
 * so the drivable network can never drift away from the asphalt the city
 * builder and the minimap draw.
 *
 * Conventions (left-hand traffic, as the painted road and the original car
 * routes already used):
 *   north-south road : northbound lane sits west of the centreline, southbound east
 *   east-west road   : eastbound lane sits north of the centreline, westbound south
 *
 * A lane segment runs from a junction exit to the next junction's stop line, so
 * a signal check is simply "distance left on this lane".
 */

import {
  INTERSECTIONS,
  LANE_HALF_OFFSET,
  ROADS,
  STOP_LINE_OFFSET,
  TRAFFIC_SIGNALS,
  type SignalPhase,
} from './worldData';

export type Axis = 'ns' | 'ew';
export type TravelDirection = 'northbound' | 'southbound' | 'eastbound' | 'westbound';
export type TurnType = 'straight' | 'left' | 'right' | 'u_turn';

export interface Point {
  x: number;
  z: number;
}

export interface LaneSegment {
  id: string;
  roadId: string;
  axis: Axis;
  direction: TravelDirection;
  /** Unit travel vector. */
  dirX: number;
  dirZ: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  length: number;
  fromJunctionId: string | null;
  /** Junction whose stop line this lane ends at (null = dead end). */
  toJunctionId: string | null;
  signalPhase: SignalPhase;
}

export interface RoadJunction {
  id: string;
  x: number;
  z: number;
  /** Signalized junctions obey TRAFFIC_SIGNALS phases; termini just allow a U-turn. */
  signalized: boolean;
  /** Seconds of cycle offset so neighbouring junctions are not in lockstep. */
  signalOffset: number;
  inboundLaneIds: string[];
  outboundLaneIds: string[];
}

export interface TurnMovement {
  id: string;
  junctionId: string;
  fromLaneId: string;
  toLaneId: string;
  type: TurnType;
  phase: SignalPhase;
  /** Sampled centreline from the stop line to the receiving lane. */
  path: Point[];
  length: number;
  /** Movements that may not run at the same time as this one. */
  conflicts: string[];
}

const DIRECTION_OF: Record<Axis, Record<'+' | '-', TravelDirection>> = {
  ns: { '-': 'northbound', '+': 'southbound' },
  ew: { '+': 'eastbound', '-': 'westbound' },
};

const laneOffsets = ROADS.map((road) => ({
  road,
  axis: (road.orientation === 'north_south' ? 'ns' : 'ew') as Axis,
  halfWidth: road.width / 2,
  /** Half extent of the crossing road at each junction, per axis. */
}));

const junctionHalfExtent = (axis: Axis): number => {
  const across = laneOffsets.find((r) => r.axis !== axis);
  return across ? across.halfWidth : 7;
};

/** Score for turn classification from the two travel vectors. */
const classifyTurn = (fromX: number, fromZ: number, toX: number, toZ: number): TurnType => {
  const dot = fromX * toX + fromZ * toZ;
  const cross = fromX * toZ - fromZ * toX;
  if (dot > 0.7) return 'straight';
  if (dot < -0.7) return 'u_turn';
  // Left-hand traffic: a positive cross product is a right turn.
  return cross > 0 ? 'right' : 'left';
};

/** Sample a quadratic curve through a control point. */
const sampleCurve = (a: Point, control: Point, b: Point, steps = 5): Point[] => {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * a.x + 2 * mt * t * control.x + t * t * b.x,
      z: mt * mt * a.z + 2 * mt * t * control.z + t * t * b.z,
    });
  }
  return pts;
};

const pathLength = (pts: Point[]): number => {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  }
  return total;
};

const pointAlong = (pts: Point[], distance: number): Point => {
  let left = distance;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    if (left <= seg || i === pts.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, left / seg);
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t,
      };
    }
    left -= seg;
  }
  return pts[pts.length - 1];
};

const segmentsIntersect = (a1: Point, a2: Point, b1: Point, b2: Point): boolean => {
  const d = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const d1 = d(b1, b2, a1);
  const d2 = d(b1, b2, a2);
  const d3 = d(a1, a2, b1);
  const d4 = d(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};

const pathsCross = (a: Point[], b: Point[]): boolean => {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsIntersect(a[i - 1], a[i], b[j - 1], b[j])) return true;
    }
  }
  return false;
};

// ---------------------------------------------------------------------------
// Junction discovery
// ---------------------------------------------------------------------------

interface RoadEnd {
  id: string;
  x: number;
  z: number;
}

const buildJunctions = (): { junctions: Map<string, RoadJunction>; ends: RoadEnd[] } => {
  const junctions = new Map<string, RoadJunction>();
  const ends: RoadEnd[] = [];

  INTERSECTIONS.forEach((ix, index) => {
    junctions.set(ix.id, {
      id: ix.id,
      x: ix.x,
      z: ix.z,
      signalized: TRAFFIC_SIGNALS.some((s) => s.intersectionId === ix.id),
      // ~19 s apart, so a car travelling down the avenue meets changing lights.
      signalOffset: index * 19,
      inboundLaneIds: [],
      outboundLaneIds: [],
    });
  });

  for (const { road, axis } of laneOffsets) {
    if (axis !== 'ew') continue;
    const half = road.length / 2;
    const west: RoadEnd = { id: `end_${road.id}_west`, x: road.centerX - half, z: road.centerZ };
    const east: RoadEnd = { id: `end_${road.id}_east`, x: road.centerX + half, z: road.centerZ };
    for (const end of [west, east]) {
      ends.push(end);
      junctions.set(end.id, {
        id: end.id,
        x: end.x,
        z: end.z,
        signalized: false,
        signalOffset: 0,
        inboundLaneIds: [],
        outboundLaneIds: [],
      });
    }
  }

  return { junctions, ends };
};

const { junctions, ends: roadEnds } = buildJunctions();

// ---------------------------------------------------------------------------
// Lane segments
// ---------------------------------------------------------------------------

const laneSegments: LaneSegment[] = [];

const addLane = (
  roadId: string,
  axis: Axis,
  direction: TravelDirection,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  fromJunctionId: string | null,
  toJunctionId: string | null,
  signalPhase: SignalPhase
) => {
  const dx = endX - startX;
  const dz = endZ - startZ;
  const length = Math.hypot(dx, dz);
  if (length <= 1) return; // degenerate stub, not drivable
  const lane: LaneSegment = {
    id: `${direction}_${roadId}_${laneSegments.length}`,
    roadId,
    axis,
    direction,
    dirX: dx / length,
    dirZ: dz / length,
    startX,
    startZ,
    endX,
    endZ,
    length,
    fromJunctionId,
    toJunctionId,
    signalPhase,
  };
  laneSegments.push(lane);
  if (fromJunctionId) junctions.get(fromJunctionId)?.outboundLaneIds.push(lane.id);
  if (toJunctionId) junctions.get(toJunctionId)?.inboundLaneIds.push(lane.id);
};

for (const { road, axis, halfWidth } of laneOffsets) {
  const crossings = INTERSECTIONS.filter((ix) => ix.roads.includes(road.id));
  const crossHalf = junctionHalfExtent(axis);

  if (axis === 'ns') {
    const sorted = [...crossings].sort((a, b) => a.z - b.z);
    // Northbound: travels towards -z on the west side of the centreline.
    for (let i = sorted.length - 1; i > 0; i--) {
      const from = sorted[i];
      const to = sorted[i - 1];
      addLane(
        road.id,
        axis,
        DIRECTION_OF.ns['-'],
        road.centerX - LANE_HALF_OFFSET,
        from.z - crossHalf,
        road.centerX - LANE_HALF_OFFSET,
        to.z + STOP_LINE_OFFSET,
        from.id,
        to.id,
        'north_south'
      );
    }
    // Southbound: travels towards +z on the east side.
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      addLane(
        road.id,
        axis,
        DIRECTION_OF.ns['+'],
        road.centerX + LANE_HALF_OFFSET,
        from.z + crossHalf,
        road.centerX + LANE_HALF_OFFSET,
        to.z - STOP_LINE_OFFSET,
        from.id,
        to.id,
        'north_south'
      );
    }
  } else {
    const half = road.length / 2;
    const westEnd = road.centerX - half;
    const eastEnd = road.centerX + half;
    const sorted = [...crossings].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Eastbound approaches from the west end, leaves towards the east end.
    addLane(
      road.id,
      axis,
      DIRECTION_OF.ew['+'],
      westEnd,
      road.centerZ - LANE_HALF_OFFSET,
      first.x - STOP_LINE_OFFSET,
      road.centerZ - LANE_HALF_OFFSET,
      `end_${road.id}_west`,
      first.id,
      'east_west'
    );
    addLane(
      road.id,
      axis,
      DIRECTION_OF.ew['+'],
      last.x + crossHalf,
      road.centerZ - LANE_HALF_OFFSET,
      eastEnd,
      road.centerZ - LANE_HALF_OFFSET,
      last.id,
      `end_${road.id}_east`,
      'east_west'
    );

    // Westbound approaches from the east end, leaves towards the west end.
    addLane(
      road.id,
      axis,
      DIRECTION_OF.ew['-'],
      eastEnd,
      road.centerZ + LANE_HALF_OFFSET,
      last.x + STOP_LINE_OFFSET,
      road.centerZ + LANE_HALF_OFFSET,
      `end_${road.id}_east`,
      last.id,
      'east_west'
    );
    addLane(
      road.id,
      axis,
      DIRECTION_OF.ew['-'],
      last.x - crossHalf,
      road.centerZ + LANE_HALF_OFFSET,
      westEnd,
      road.centerZ + LANE_HALF_OFFSET,
      last.id,
      `end_${road.id}_west`,
      'east_west'
    );
  }

  // Silence the unused half-width warning while keeping the value documented.
  void halfWidth;
}

// Lanes that begin at a dead-end must be reachable only by a U-turn there: the
// road ends are terminals, so their inbound lane is the one arriving at them.
const laneById = new Map(laneSegments.map((l) => [l.id, l]));

// ---------------------------------------------------------------------------
// Turn connections
// ---------------------------------------------------------------------------

const movements: TurnMovement[] = [];

const buildMovementPath = (lane: LaneSegment, out: LaneSegment): Point[] => {
  const a: Point = { x: lane.endX, z: lane.endZ };
  const b: Point = { x: out.startX, z: out.startZ };
  const type = classifyTurn(lane.dirX, lane.dirZ, out.dirX, out.dirZ);

  if (type === 'straight') {
    return [a, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, b];
  }

  // Corner shared by the two lane centrelines.
  const denom = lane.dirX * out.dirZ - lane.dirZ * out.dirX;
  let control: Point;
  if (Math.abs(denom) > 1e-6) {
    const t = ((b.x - a.x) * out.dirZ - (b.z - a.z) * out.dirX) / denom;
    control = { x: a.x + lane.dirX * t, z: a.z + lane.dirZ * t };
  } else {
    control = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  }

  if (type === 'u_turn') {
    // Sweep wide of both lanes so the car never cuts across the centreline box.
    const nx = -lane.dirZ;
    const nz = lane.dirX;
    const spread = Math.hypot(b.x - a.x, b.z - a.z) * 0.5;
    control = { x: (a.x + b.x) / 2 + nx * spread, z: (a.z + b.z) / 2 + nz * spread };
  }

  return sampleCurve(a, control, b);
};

for (const junction of junctions.values()) {
  for (const inboundId of junction.inboundLaneIds) {
    const lane = laneById.get(inboundId)!;
    for (const outboundId of junction.outboundLaneIds) {
      const out = laneById.get(outboundId)!;
      // A lane can never lead into itself, but it *must* lead into the next
      // segment of the same road and direction (that is the straight-on move).
      if (out.id === lane.id) continue;
      const path = buildMovementPath(lane, out);
      const type = classifyTurn(lane.dirX, lane.dirZ, out.dirX, out.dirZ);
      movements.push({
        id: `${junction.id}:${lane.id}->${out.id}`,
        junctionId: junction.id,
        fromLaneId: lane.id,
        toLaneId: out.id,
        type,
        phase: lane.signalPhase,
        path,
        length: pathLength(path),
        conflicts: [],
      });
    }
  }
}

// Conflicts are geometric: two movements cannot run together if their swept
// paths cross. Signals already separate the two road orientations; this catches
// the cases inside one green phase (a left turn against oncoming traffic).
for (let i = 0; i < movements.length; i++) {
  for (let j = i + 1; j < movements.length; j++) {
    const a = movements[i];
    const b = movements[j];
    if (a.junctionId !== b.junctionId) continue;
    if (a.fromLaneId === b.fromLaneId) continue; // same queue, never simultaneous
    if (pathsCross(a.path, b.path)) {
      a.conflicts.push(b.id);
      b.conflicts.push(a.id);
    }
  }
}

export const movementsByLane: Map<string, TurnMovement[]> = new Map();
for (const movement of movements) {
  const list = movementsByLane.get(movement.fromLaneId);
  if (list) list.push(movement);
  else movementsByLane.set(movement.fromLaneId, [movement]);
}

export const movementById: Map<string, TurnMovement> = new Map(
  movements.map((m) => [m.id, m])
);

/** Is this lane's outbound end a signalized junction? */
export const laneEndsAtSignal = (lane: LaneSegment): boolean => {
  if (!lane.toJunctionId) return false;
  return junctions.get(lane.toJunctionId)?.signalized ?? false;
};

export const trafficNetwork = {
  lanes: laneSegments,
  laneById,
  junctions,
  junctionList: [...junctions.values()],
  movements,
  movementById,
  movementsByLane,
  roadEnds,
  pointAlong,
  /** Distance from the start of a path to a point along it. */
  pathLength,
};

export type RoadNetwork = typeof trafficNetwork;
