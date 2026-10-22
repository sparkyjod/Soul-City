import { CharacterId } from '../types/game';

/**
 * worldData.ts — SINGLE SOURCE OF TRUTH FOR SHARED WORLD GEOMETRY.
 *
 * Every road, sidewalk, crosswalk, intersection, terrain band, home plot and
 * landmark footprint used by BOTH the 3D city builder and the 2D minimap is
 * declared here exactly once. Neither renderer may hardcode world geometry:
 * if the data changes, the world and the map change together and can never
 * drift apart.
 *
 * Coordinate system: world-space XZ plane (Y is up). X grows east, Z grows
 * south (negative Z is north, toward the school).
 */

// ---------------------------------------------------------------------------
// Terrain bands
// ---------------------------------------------------------------------------

export const TERRAIN = {
  /** Square grass base plane size (centered at origin). */
  groundSize: 320,
  groundY: -0.05,
  /** Sandy beach strip: z 73 → 99. */
  sand: { centerX: 0, centerZ: 86, width: 300, depth: 26, y: 0.1 },
  /** Ocean plane: z 82 → 162 (animated bob in Y). */
  ocean: { centerX: 0, centerZ: 122, width: 320, depth: 80, y: 0.08 },
};

// ---------------------------------------------------------------------------
// Road network
// ---------------------------------------------------------------------------

export interface RoadSegment {
  id: string;
  name: string;
  orientation: 'north_south' | 'east_west';
  /** Center of the segment in world space. */
  centerX: number;
  centerZ: number;
  /** Road width (perpendicular to its orientation). */
  width: number;
  /** Road length (along its orientation axis). */
  length: number;
  /** Render height above ground. */
  y: number;
}

export const ROADS: RoadSegment[] = [
  {
    id: 'main_avenue',
    name: 'Central Boulevard',
    orientation: 'north_south',
    centerX: 0,
    centerZ: -22.5,
    width: 16,
    length: 175,
    y: 0.02,
  },
  {
    id: 'school_road',
    name: 'School Avenue',
    orientation: 'east_west',
    centerX: 0,
    centerZ: -60,
    width: 14,
    length: 180,
    y: 0.02,
  },
  {
    id: 'downtown_street',
    name: 'Downtown Street',
    orientation: 'east_west',
    centerX: 0,
    centerZ: 0,
    width: 14,
    length: 180,
    y: 0.02,
  },
  {
    id: 'coastal_drive',
    name: 'Coastal Drive',
    orientation: 'east_west',
    centerX: 0,
    centerZ: 60,
    width: 14,
    length: 180,
    y: 0.02,
  },
];

export interface RoadStrip {
  id: string;
  centerX: number;
  centerZ: number;
  width: number;
  length: number;
  y: number;
}

export const SIDEWALKS: RoadStrip[] = [
  { id: 'sw_main_west', centerX: -10.25, centerZ: -22.5, width: 4.5, length: 175, y: 0.04 },
  { id: 'sw_main_east', centerX: 10.25, centerZ: -22.5, width: 4.5, length: 175, y: 0.04 },
];

export interface Intersection {
  id: string;
  x: number;
  z: number;
  /** Ids of the two roads that cross here. */
  roads: [string, string];
}

/** Signalized intersections. Traffic lights (Stage 3) attach to these. */
export const INTERSECTIONS: Intersection[] = [
  { id: 'x_main_school', x: 0, z: -60, roads: ['main_avenue', 'school_road'] },
  { id: 'x_main_downtown', x: 0, z: 0, roads: ['main_avenue', 'downtown_street'] },
  { id: 'x_main_coastal', x: 0, z: 60, roads: ['main_avenue', 'coastal_drive'] },
];

export interface Crosswalk {
  id: string;
  intersectionId: string;
  /** Road whose carriageway this zebra is painted across. */
  crossesRoadId: string;
  /**
   * Traffic phase pedestrians walk WITH while on this zebra.
   *
   * A pedestrian is always parallel to the traffic on the road they are NOT
   * crossing: someone walking east-west over the north-south avenue crosses
   * while the east-west road has its green, and vice versa. Crosswalk geometry
   * and this phase are derived from the same two roads, so the paint, the
   * signal phases and the nav graph cannot drift apart.
   */
  walkPhase: SignalPhase;
  x: number;
  z: number;
  /** Extent along X. */
  width: number;
  /** Extent along Z. */
  depth: number;
  y: number;
}

/** How far north/south of an intersection center its zebra crossings sit. */
export const CROSSWALK_OFFSET = 9.5;
/** Depth of the zebras that cross the avenue (walking east-west). */
export const CROSSWALK_DEPTH = 4.5;
/**
 * Kerb offset of the zebras that cross the east-west streets (walking
 * north-south): they sit on the avenue's footway, just outside the junction
 * box (half-width 8) and inside the stop line (STOP_LINE_OFFSET).
 */
const CROSSWALK_KERB_X = 10.25;

export const CROSSWALKS: Crosswalk[] = INTERSECTIONS.flatMap((ix) => {
  const nsRoad = ROADS.find((r) => r.id === ix.roads[0] && r.orientation === 'north_south');
  const ewRoad = ROADS.find((r) => r.id === ix.roads[1] && r.orientation === 'east_west');
  if (!nsRoad || !ewRoad) return [];

  return [
    {
      id: `${ix.id}_north`,
      intersectionId: ix.id,
      crossesRoadId: nsRoad.id,
      walkPhase: ewRoad.orientation,
      x: ix.x,
      z: ix.z - CROSSWALK_OFFSET,
      width: nsRoad.width,
      depth: CROSSWALK_DEPTH,
      y: 0.03,
    },
    {
      id: `${ix.id}_south`,
      intersectionId: ix.id,
      crossesRoadId: nsRoad.id,
      walkPhase: ewRoad.orientation,
      x: ix.x,
      z: ix.z + CROSSWALK_OFFSET,
      width: nsRoad.width,
      depth: CROSSWALK_DEPTH,
      y: 0.03,
    },
    {
      id: `${ix.id}_west`,
      intersectionId: ix.id,
      crossesRoadId: ewRoad.id,
      walkPhase: nsRoad.orientation,
      x: ix.x - CROSSWALK_KERB_X,
      z: ix.z,
      width: CROSSWALK_DEPTH,
      depth: ewRoad.width,
      // above the footway strip it is painted over
      y: 0.05,
    },
    {
      id: `${ix.id}_east`,
      intersectionId: ix.id,
      crossesRoadId: ewRoad.id,
      walkPhase: nsRoad.orientation,
      x: ix.x + CROSSWALK_KERB_X,
      z: ix.z,
      width: CROSSWALK_DEPTH,
      depth: ewRoad.width,
      y: 0.05,
    },
  ];
});

// ---------------------------------------------------------------------------
// Traffic signals (DECLARATIVE DATA ONLY — no signal behavior yet)
//
// Stage 3 will make these signal heads cycle and make vehicles obey them.
// This stage only fixes their world positions in the shared model so geometry,
// minimap and future logic all reference the same coordinates.
// ---------------------------------------------------------------------------

export type SignalPhase = 'north_south' | 'east_west';
export type ApproachDirection = 'north' | 'south' | 'east' | 'west';

export interface TrafficSignal {
  id: string;
  intersectionId: string;
  /** Road whose approaching traffic this signal head governs. */
  controlsRoadId: string;
  /** Direction of travel of the traffic this signal head faces. */
  approachDirection: ApproachDirection;
  /** Which green phase this head belongs to. */
  phase: SignalPhase;
  /** World position of the signal pole/head. */
  poleX: number;
  poleZ: number;
  /** Center of the lane at the stop line, just before the zebra crossing. */
  stopLineX: number;
  stopLineZ: number;
}

/** Stop line sits just before the zebra crossing. */
export const STOP_LINE_OFFSET = CROSSWALK_OFFSET + 2.5;
/** Lane centre offset from the road centreline, shared by the signal stop
 *  lines and the drivable lane network (roadNetwork.ts). */
export const LANE_HALF_OFFSET = 3.5;
/** Pole stands on the kerb just outside the carriageway. */
const NS_POLE_OFFSET = 9.5; // main avenue half-width (8) + 1.5
const EW_POLE_OFFSET = 8.5; // cross-street half-width (7) + 1.5
const POLE_LINE_OFFSET = 11;

/**
 * Four signal heads per intersection, one per approach, derived from
 * INTERSECTIONS + ROADS (no independently hardcoded positions).
 */
export const TRAFFIC_SIGNALS: TrafficSignal[] = INTERSECTIONS.flatMap((ix) => {
  const nsRoad = ROADS.find((r) => r.id === ix.roads[0] && r.orientation === 'north_south');
  const ewRoad = ROADS.find((r) => r.id === ix.roads[1] && r.orientation === 'east_west');
  if (!nsRoad || !ewRoad) return [];

  return [
    {
      id: `${ix.id}_southbound`,
      intersectionId: ix.id,
      controlsRoadId: nsRoad.id,
      approachDirection: 'south',
      phase: 'north_south',
      poleX: nsRoad.centerX + NS_POLE_OFFSET,
      poleZ: ix.z - POLE_LINE_OFFSET,
      stopLineX: nsRoad.centerX + LANE_HALF_OFFSET,
      stopLineZ: ix.z - STOP_LINE_OFFSET,
    },
    {
      id: `${ix.id}_northbound`,
      intersectionId: ix.id,
      controlsRoadId: nsRoad.id,
      approachDirection: 'north',
      phase: 'north_south',
      poleX: nsRoad.centerX - NS_POLE_OFFSET,
      poleZ: ix.z + POLE_LINE_OFFSET,
      stopLineX: nsRoad.centerX - LANE_HALF_OFFSET,
      stopLineZ: ix.z + STOP_LINE_OFFSET,
    },
    {
      id: `${ix.id}_eastbound`,
      intersectionId: ix.id,
      controlsRoadId: ewRoad.id,
      approachDirection: 'east',
      phase: 'east_west',
      poleX: ix.x - POLE_LINE_OFFSET,
      poleZ: ewRoad.centerZ - EW_POLE_OFFSET,
      stopLineX: ix.x - STOP_LINE_OFFSET,
      stopLineZ: ewRoad.centerZ - LANE_HALF_OFFSET,
    },
    {
      id: `${ix.id}_westbound`,
      intersectionId: ix.id,
      controlsRoadId: ewRoad.id,
      approachDirection: 'west',
      phase: 'east_west',
      poleX: ix.x + POLE_LINE_OFFSET,
      poleZ: ewRoad.centerZ + EW_POLE_OFFSET,
      stopLineX: ix.x + STOP_LINE_OFFSET,
      stopLineZ: ewRoad.centerZ + LANE_HALF_OFFSET,
    },
  ];
});

/** Yellow dashed centerline running along the main north-south avenue. */
export const CENTERLINE = {
  x: 0,
  zFrom: -105,
  zTo: 65,
  step: 7,
  dashWidth: 0.4,
  dashLength: 3.5,
  /** Skip dashes within this distance of an intersection center. */
  skipNearIntersection: 8,
};

// ---------------------------------------------------------------------------
// Residential home plots (the 7 enterable friend houses)
// ---------------------------------------------------------------------------

export interface HomePlot {
  ownerId: CharacterId;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  /** Front wall / name-plate accent color. */
  color: number;
  roofColor: number;
  /** Signature blanket color inside the house. */
  bedColor: number;
}

export const HOME_PLOTS: HomePlot[] = [
  { ownerId: 'anirudh', name: "Anirudh's Home", x: -38, z: -40, width: 8, depth: 8, color: 0x2563eb, roofColor: 0x1e3a8a, bedColor: 0x3b82f6 },
  { ownerId: 'vaishnavi', name: "Vaishnavi's Home", x: -26, z: -40, width: 8, depth: 8, color: 0x0ea5e9, roofColor: 0x0369a1, bedColor: 0x38bdf8 },
  { ownerId: 'chirag', name: "Chirag's Home", x: -14, z: -40, width: 8, depth: 8, color: 0x059669, roofColor: 0x064e3b, bedColor: 0x10b981 },
  { ownerId: 'shreya', name: "Shreya's Home", x: -2, z: -40, width: 8, depth: 8, color: 0xec4899, roofColor: 0x9d174d, bedColor: 0xf472b6 },
  { ownerId: 'zannat', name: "Zannat's Home", x: 12, z: -40, width: 8, depth: 8, color: 0x8b5cf6, roofColor: 0x581c87, bedColor: 0xa855f7 },
  { ownerId: 'shagun', name: "Shagun's Home", x: 26, z: -40, width: 8, depth: 8, color: 0xf59e0b, roofColor: 0x78350f, bedColor: 0xfbbf24 },
  { ownerId: 'jatin', name: "Jatin's Home", x: 40, z: -40, width: 8, depth: 8, color: 0xdc2626, roofColor: 0x7f1d1d, bedColor: 0xef4444 },
];

// ---------------------------------------------------------------------------
// Landmark footprints (top-down reference record of built structures)
// ---------------------------------------------------------------------------

export type Footprint =
  | {
      id: string;
      shape: 'rect';
      name: string;
      x: number;
      z: number;
      width: number;
      depth: number;
      color: string;
      label?: string;
    }
  | {
      id: string;
      shape: 'circle';
      name: string;
      x: number;
      z: number;
      radius: number;
      color: string;
      label?: string;
    };

export const LANDMARK_FOOTPRINTS: Footprint[] = [
  {
    id: 'school',
    shape: 'rect',
    name: 'Northwood High',
    x: 0,
    z: -86,
    width: 68,
    depth: 44,
    color: '#991b1b',
    label: 'Northwood High',
  },
  { id: 'football_pitch', shape: 'rect', name: 'Football Pitch', x: 58, z: -75, width: 42, depth: 58, color: '#16a34a' },
  { id: 'park', shape: 'rect', name: 'Willow Green Park', x: -30, z: -10, width: 36, depth: 32, color: '#15803d' },
  { id: 'cafe', shape: 'rect', name: 'The Central Bean Cafe', x: -22, z: 14, width: 14, depth: 12, color: '#b45309' },
  { id: 'mall', shape: 'rect', name: 'Galaxy Mall', x: 25, z: -18, width: 24, depth: 22, color: '#831843' },
  { id: 'arcade', shape: 'rect', name: 'Pixel Pulse Arcade', x: 28, z: 22, width: 16, depth: 14, color: '#4338ca' },
  { id: 'plaza', shape: 'circle', name: 'Central Plaza', x: 0, z: 0, radius: 15, color: '#06b6d4' },
  { id: 'boardwalk', shape: 'rect', name: 'Boardwalk', x: 0, z: 75, width: 160, depth: 12, color: '#92400e' },
  { id: 'pier', shape: 'rect', name: 'Pier', x: 0, z: 98, width: 8, depth: 34, color: '#92400e' },
];

const FOOTPRINT_BY_ID: Map<string, Footprint> = new Map(
  LANDMARK_FOOTPRINTS.map((f) => [f.id, f])
);

/** Look up a landmark footprint by id. Throws on unknown ids so that a typo
 *  fails loudly at city-build time instead of silently diverging worlds. */
export const getFootprint = (id: string): Footprint => {
  const f = FOOTPRINT_BY_ID.get(id);
  if (!f) throw new Error(`worldData: unknown landmark footprint "${id}"`);
  return f;
};

export type RectFootprint = Extract<Footprint, { shape: 'rect' }>;

export const getRectFootprint = (id: string): RectFootprint => {
  const f = getFootprint(id);
  if (f.shape !== 'rect') {
    throw new Error(`worldData: footprint "${id}" is not rectangular`);
  }
  return f;
};

export const getCircleFootprint = (
  id: string
): Extract<Footprint, { shape: 'circle' }> => {
  const f = getFootprint(id);
  if (f.shape !== 'circle') {
    throw new Error(`worldData: footprint "${id}" is not circular`);
  }
  return f;
};

// ---------------------------------------------------------------------------
// Pedestrian navigation network (sidewalks, paths, door approaches, interiors)
//
// Consumed by NavigationNetwork (BFS pathfinder) in navigationNetwork.ts.
//
// The graph must describe routes a 0.45 m-radius body can physically walk, so
// every edge has to clear the city's collision geometry (house walls, the plaza
// fountain and benches, school furniture, café tables). Walking the graph in the
// live world exposed three classes of pre-existing defect, fixed here:
//
//   1. Home entry used to cut straight through each house's back wall. Homes are
//      now entered through the real front doorway, walking around the side.
//   2. Nodes that stood inside furniture (plaza fountain, park gazebo, avenue
//      benches, library table, sports-gate wall) are now placed in the clear.
//   3. Routes that crossed solid geometry (café front wall, mall south wing,
//      classroom desk rows) now go around through the real openings.
// ---------------------------------------------------------------------------

export interface PedestrianNode {
  id: string;
  x: number;
  z: number;
  neighbors: string[];
}

/** Short id used for each friend's home-access nodes. */
const HOME_NODE_SUFFIX: Record<CharacterId, string> = {
  anirudh: 'ani',
  vaishnavi: 'vaishu',
  chirag: 'chirag',
  shreya: 'shreya',
  zannat: 'zan',
  shagun: 'shagun',
  jatin: 'jatin',
};

/**
 * Home access chain, generated from HOME_PLOTS so plots and paths cannot drift:
 *
 *   front (x, -48)  ─ north walkway by the street
 *   gap   (x+6, -47) ─ the space between two neighbouring houses
 *   south (x+6, -33) ─ under the eaves on the street-facing side
 *   yard  (x, -33)   ─ directly outside the front doorway (walls at z -44 / -36)
 *   door  (x, -38)   ─ inside the house, past the 2.6 m doorway gap
 *
 * The old front→door edge was removed: a straight line punched through the back
 * wall. The chain above walks around the house to the real doorway instead.
 */
const homeAccessNodes: PedestrianNode[] = HOME_PLOTS.flatMap((plot) => {
  const s = HOME_NODE_SUFFIX[plot.ownerId];
  return [
    { id: `home_${s}_front`, x: plot.x, z: -48, neighbors: [`home_${s}_gap`] },
    { id: `home_${s}_gap`, x: plot.x + 6, z: -47, neighbors: [`home_${s}_front`, `home_${s}_south`] },
    { id: `home_${s}_south`, x: plot.x + 6, z: -33, neighbors: [`home_${s}_gap`, `home_${s}_yard`] },
    { id: `home_${s}_yard`, x: plot.x, z: -33, neighbors: [`home_${s}_south`, `res_${s}_door`] },
    { id: `res_${s}_door`, x: plot.x, z: -38, neighbors: [`home_${s}_yard`] },
  ];
});

const pedestrianNodes: PedestrianNode[] = [
  ...homeAccessNodes,

  // 2. Residential avenue (the street the homes face) and school approach
  { id: 'res_avenue_west', x: -30, z: -52, neighbors: ['school_avenue_center'] },
  { id: 'res_avenue_east', x: 25, z: -52, neighbors: ['school_avenue_center'] },

  // 3. School entrance & interior
  {
    id: 'school_avenue_center',
    x: 0,
    z: -52,
    neighbors: ['main_avenue_north', 'school_gate', 'res_avenue_west', 'res_avenue_east'],
  },
  { id: 'school_gate', x: 0, z: -60, neighbors: ['school_avenue_center', 'school_lobby'] },
  { id: 'school_lobby', x: 0, z: -68, neighbors: ['school_gate', 'school_corridor_center'] },

  {
    id: 'school_corridor_center',
    x: 0,
    z: -78,
    neighbors: ['school_lobby', 'school_class_a', 'school_corridor_east', 'school_corridor_west'],
  },
  { id: 'school_class_a', x: 0, z: -85, neighbors: ['school_corridor_center'] },

  {
    id: 'school_corridor_west',
    x: -12,
    z: -78,
    neighbors: ['school_corridor_center', 'school_library_aisle', 'school_class_b'],
  },
  // Library aisle clears the study table; the library node stands beside it.
  { id: 'school_library_aisle', x: -20, z: -78, neighbors: ['school_corridor_west', 'school_library'] },
  { id: 'school_library', x: -22, z: -86, neighbors: ['school_library_aisle'] },
  { id: 'school_class_b', x: -2, z: -95, neighbors: ['school_corridor_west'] },

  {
    id: 'school_corridor_east',
    x: 14,
    z: -78,
    neighbors: ['school_corridor_center', 'school_canteen', 'school_canteen_aisle'],
  },
  { id: 'school_canteen', x: 20, z: -85, neighbors: ['school_corridor_east'] },
  // Aisle west of the canteen tables, then south of them to the sports gate.
  { id: 'school_canteen_aisle', x: 11, z: -78, neighbors: ['school_corridor_east', 'school_canteen_south'] },
  { id: 'school_canteen_south', x: 11, z: -86, neighbors: ['school_canteen_aisle', 'school_sports_exit'] },
  // The only opening in the school's east wall is x = 34, z -88…-82.
  { id: 'school_sports_exit', x: 30, z: -85, neighbors: ['school_canteen_south', 'sports_pitch'] },
  { id: 'sports_pitch', x: 55, z: -75, neighbors: ['school_sports_exit'] },

  // 4. Central avenue sidewalks
  { id: 'main_avenue_north', x: 0, z: -45, neighbors: ['school_avenue_center'] },
  { id: 'avenue_sw_west_n', x: -10, z: -30, neighbors: ['avenue_sw_west_mid'] },
  { id: 'avenue_sw_east_n', x: 10, z: -30, neighbors: ['avenue_sw_east_mid'] },
  // Mid nodes stand north of the plaza benches that block the avenue footway.
  { id: 'avenue_sw_west_mid', x: -12.2, z: -4, neighbors: ['avenue_sw_west_n', 'plaza_nw', 'downtown_plaza_west'] },
  { id: 'avenue_sw_east_mid', x: 8.2, z: -4, neighbors: ['avenue_sw_east_n', 'plaza_ne', 'downtown_plaza_east'] },

  // 5. Central plaza — a ring around the fountain (the fountain is solid)
  { id: 'plaza_nw', x: -5.8, z: -5.8, neighbors: ['plaza_ne', 'plaza_sw', 'downtown_plaza_west', 'avenue_sw_west_mid'] },
  { id: 'plaza_ne', x: 5.8, z: -5.8, neighbors: ['plaza_nw', 'plaza_se', 'downtown_plaza_east', 'avenue_sw_east_mid'] },
  { id: 'plaza_sw', x: -5.8, z: 5.8, neighbors: ['plaza_nw', 'plaza_se', 'downtown_plaza_west', 'avenue_sw_west_s'] },
  { id: 'plaza_se', x: 5.8, z: 5.8, neighbors: ['plaza_ne', 'plaza_sw', 'downtown_plaza_east', 'avenue_sw_east_s'] },

  {
    id: 'downtown_plaza_west',
    x: -15,
    z: 0,
    neighbors: ['plaza_nw', 'plaza_sw', 'avenue_sw_west_mid', 'park_path_main', 'cafe_corner'],
  },
  {
    id: 'downtown_plaza_east',
    x: 15,
    z: 0,
    neighbors: ['plaza_ne', 'plaza_se', 'avenue_sw_east_mid', 'mall_path', 'arcade_path'],
  },

  // 6. Café — approached round its east side, entered through the south doorway
  { id: 'cafe_corner', x: -11, z: 8, neighbors: ['downtown_plaza_west', 'cafe_front'] },
  { id: 'cafe_front', x: -11, z: 22, neighbors: ['cafe_corner', 'cafe_entrance'] },
  { id: 'cafe_entrance', x: -22, z: 22.5, neighbors: ['cafe_front', 'cafe_interior'] },
  { id: 'cafe_interior', x: -22, z: 17, neighbors: ['cafe_entrance'] },

  // 7. Park
  { id: 'park_path_main', x: -25, z: -10, neighbors: ['downtown_plaza_west', 'park_gazebo'] },
  { id: 'park_gazebo', x: -27.6, z: -10, neighbors: ['park_path_main'] },

  // 8. Mall — entered through the 8 m opening at z = -7, x 21…29
  { id: 'mall_path', x: 24, z: -2, neighbors: ['downtown_plaza_east', 'mall_entrance'] },
  { id: 'mall_entrance', x: 25, z: -8, neighbors: ['mall_path', 'mall_interior'] },
  { id: 'mall_interior', x: 25, z: -18, neighbors: ['mall_entrance'] },

  // 9. Arcade
  { id: 'arcade_path', x: 22, z: 16, neighbors: ['downtown_plaza_east', 'arcade_interior'] },
  { id: 'arcade_interior', x: 28, z: 22, neighbors: ['arcade_path'] },

  // 10. Southern avenue footways & waterfront
  { id: 'avenue_sw_west_s', x: -12.2, z: 35, neighbors: ['plaza_sw', 'coastal_center', 'coastal_west'] },
  { id: 'avenue_sw_east_s', x: 8.2, z: 35, neighbors: ['plaza_se', 'coastal_center', 'coastal_east'] },

  { id: 'coastal_center', x: 0, z: 60, neighbors: ['avenue_sw_west_s', 'avenue_sw_east_s', 'coastal_west', 'coastal_east', 'beach_boardwalk_mid'] },
  { id: 'coastal_west', x: -25, z: 60, neighbors: ['coastal_center', 'avenue_sw_west_s', 'beach_boardwalk_west'] },
  { id: 'coastal_east', x: 25, z: 60, neighbors: ['coastal_center', 'avenue_sw_east_s', 'beach_boardwalk_east'] },

  { id: 'beach_boardwalk_mid', x: 0, z: 75, neighbors: ['coastal_center', 'beach_pier', 'beach_boardwalk_west', 'beach_boardwalk_east'] },
  { id: 'beach_boardwalk_west', x: -25, z: 75, neighbors: ['beach_boardwalk_mid', 'coastal_west'] },
  { id: 'beach_boardwalk_east', x: 25, z: 75, neighbors: ['beach_boardwalk_mid', 'coastal_east'] },
  { id: 'beach_pier', x: 0, z: 95, neighbors: ['beach_boardwalk_mid'] },
];

// ---------------------------------------------------------------------------
// Cross-boundary links (kept programmatic so both directions always exist)
// ---------------------------------------------------------------------------

const NODE_BY_ID: Map<string, PedestrianNode> = new Map(pedestrianNodes.map((n) => [n.id, n]));

const linkNodes = (a: string, b: string) => {
  const na = NODE_BY_ID.get(a);
  const nb = NODE_BY_ID.get(b);
  if (!na || !nb) throw new Error(`worldData: pedestrian link ${a} <-> ${b} references a missing node`);
  if (!na.neighbors.includes(b)) na.neighbors.push(b);
  if (!nb.neighbors.includes(a)) nb.neighbors.push(a);
};

// Every home hangs off the nearest end of the residential avenue, so its
// approach walk stays short instead of crossing the whole row.
const RES_AVENUE_NODES = [
  { id: 'res_avenue_west', x: -30 },
  { id: 'res_avenue_east', x: 25 },
];
for (const plot of HOME_PLOTS) {
  const s = HOME_NODE_SUFFIX[plot.ownerId];
  const nearest = RES_AVENUE_NODES.reduce((a, b) =>
    Math.abs(plot.x - a.x) <= Math.abs(plot.x - b.x) ? a : b
  );
  linkNodes(`home_${s}_front`, nearest.id);
}

// The south side of the rows forms a walkable street of its own.
for (let i = 1; i < HOME_PLOTS.length; i++) {
  linkNodes(`home_${HOME_NODE_SUFFIX[HOME_PLOTS[i - 1].ownerId]}_yard`, `home_${HOME_NODE_SUFFIX[HOME_PLOTS[i].ownerId]}_yard`);
}

// Two garden-gap shortcuts connect the residential row to the avenue sidewalks.
linkNodes('home_shreya_yard', 'avenue_sw_east_n');
linkNodes('home_chirag_yard', 'avenue_sw_west_n');

// The avenue footways cross the residential row through its widest garden gaps.
linkNodes('main_avenue_north', 'home_chirag_gap');
linkNodes('main_avenue_north', 'home_shreya_gap');

export const PEDESTRIAN_NETWORK: { nodes: PedestrianNode[] } = { nodes: pedestrianNodes };

// ---------------------------------------------------------------------------
// Minimap projection + palette (kept consistent with the 3D world palette)
// ---------------------------------------------------------------------------

export const MINIMAP = {
  worldMinX: -80,
  worldMaxX: 80,
  worldMinZ: -115,
  worldMaxZ: 105,
  colors: {
    grass: '#1e3a1e',
    sand: '#d97706',
    ocean: '#0284c7',
    asphalt: '#334155',
    sidewalk: '#64748b',
    crosswalk: '#e2e8f0',
    centerline: '#facc15',
  },
};

/** Convert a THREE-style numeric hex color to a CSS hex string. */
export const toHexColor = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
