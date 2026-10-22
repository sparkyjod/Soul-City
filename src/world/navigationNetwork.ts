import { PEDESTRIAN_NETWORK } from './worldData';

export interface NavNode {
  id: string;
  x: number;
  z: number;
  neighbors: string[];
}

export class NavigationNetwork {
  public nodes: Map<string, NavNode> = new Map();

  constructor() {
    this.buildGraph();
  }

  private buildGraph() {
    // Node data lives in worldData.PEDESTRIAN_NETWORK (single source of truth,
    // shared with the city builder and minimap). Coordinates and neighbour
    // lists are identical to the original hand-authored graph; only the
    // storage location changed.
    for (const node of PEDESTRIAN_NETWORK.nodes) {
      this.nodes.set(node.id, {
        id: node.id,
        x: node.x,
        z: node.z,
        neighbors: [...node.neighbors],
      });
    }
  }

  public findNearestNode(x: number, z: number): NavNode {
    let bestNode: NavNode | null = null;
    let bestDist = Infinity;

    for (const node of this.nodes.values()) {
      const d = Math.hypot(node.x - x, node.z - z);
      if (d < bestDist) {
        bestDist = d;
        bestNode = node;
      }
    }
    return bestNode || this.nodes.get('school_avenue_center')!;
  }

  /**
   * Breadth-First Search (BFS) shortest path on the waypoint graph.
   *
   * Returns `null` when the destination is genuinely unreachable instead of
   * inventing a straight line through the city: callers that move a body (NPC
   * scheduling) treat that as "stay put and try again later" rather than
   * teleporting or walking through walls. `findPath` keeps the old, never-null
   * shape for read-only callers and tests.
   */
  public findPathOrNull(
    startX: number,
    startZ: number,
    targetX: number,
    targetZ: number
  ): { x: number; z: number }[] | null {
    const startNode = this.findNearestNode(startX, startZ);
    const endNode = this.findNearestNode(targetX, targetZ);

    if (startNode.id === endNode.id) {
      return [{ x: targetX, z: targetZ }];
    }

    const queue: string[] = [startNode.id];
    const visited = new Set<string>([startNode.id]);
    const cameFrom = new Map<string, string>();

    let found = false;
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === endNode.id) {
        found = true;
        break;
      }

      const node = this.nodes.get(currentId);
      if (!node) continue;

      for (const neighborId of node.neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          cameFrom.set(neighborId, currentId);
          queue.push(neighborId);
        }
      }
    }

    if (!found) {
      return null;
    }

    // Reconstruct path
    const pathIds: string[] = [];
    let curr: string | undefined = endNode.id;
    while (curr) {
      pathIds.unshift(curr);
      curr = cameFrom.get(curr);
    }

    const pathPoints = pathIds.map((id) => {
      const n = this.nodes.get(id)!;
      return { x: n.x, z: n.z };
    });

    pathPoints.push({ x: targetX, z: targetZ });
    return pathPoints;
  }

  /** Never-null wrapper used by read-only callers. */
  public findPath(
    startX: number,
    startZ: number,
    targetX: number,
    targetZ: number
  ): { x: number; z: number }[] {
    const path = this.findPathOrNull(startX, startZ, targetX, targetZ);
    if (path) return path;
    const endNode = this.findNearestNode(targetX, targetZ);
    return [
      { x: endNode.x, z: endNode.z },
      { x: targetX, z: targetZ },
    ];
  }
}

/**
 * Pure waypoint follower used for NPC schedule travel (Stage 2).
 * Deliberately Three.js-free so it can be unit-tested headlessly.
 * GameEngine applies each returned step to an NPC root with collision checks.
 */
export interface RouteStep {
  /** Position after this step (clamped so waypoints are never overshoot). */
  x: number;
  z: number;
  /** Unit travel direction for facing/animation (zero when finished). */
  dirX: number;
  dirZ: number;
}

export class RouteFollower {
  private index = 0;

  constructor(
    public readonly waypoints: { x: number; z: number }[],
    /** Waypoints within this distance count as reached. */
    public readonly arriveThreshold: number = 0.5
  ) {}

  public get done(): boolean {
    return this.index >= this.waypoints.length;
  }

  public get progressIndex(): number {
    return this.index;
  }

  /** Waypoint currently being walked towards (null once finished). */
  public get currentWaypoint(): { x: number; z: number } | null {
    return this.done ? null : this.waypoints[this.index];
  }

  /** Advance along the route by at most `stepDist` world units. */
  public advance(x: number, z: number, stepDist: number): RouteStep {
    // Skip any waypoints already within the arrival threshold.
    while (!this.done) {
      const wp = this.waypoints[this.index];
      if (Math.hypot(wp.x - x, wp.z - z) > this.arriveThreshold) break;
      this.index++;
    }

    if (this.done) {
      return { x, z, dirX: 0, dirZ: 0 };
    }

    const wp = this.waypoints[this.index];
    const dx = wp.x - x;
    const dz = wp.z - z;
    const dist = Math.hypot(dx, dz);
    const dirX = dx / dist;
    const dirZ = dz / dist;

    // Clamp so we land exactly on the waypoint instead of overshooting it.
    const move = Math.min(stepDist, dist);
    const nx = x + dirX * move;
    const nz = z + dirZ * move;

    if (move >= dist - this.arriveThreshold) {
      this.index++;
    }

    return { x: nx, z: nz, dirX, dirZ };
  }
}

export const navigationNetwork = new NavigationNetwork();
