/**
 * movement.ts — pure, collision-aware stepping helpers.
 *
 * Kept free of Three.js and of the city builder so they can be unit tested
 * headlessly. Callers pass the city's collision query as a callback.
 *
 * Two behaviours matter for schedule-driven NPCs (and for the player):
 *  - they must never jam permanently against furniture or a wall, and
 *  - they must be able to leave a spot they are already overlapping
 *    (spawning on a chair, being nudged into a doorway) instead of freezing.
 */

export type BlockedFn = (x: number, z: number, radius: number) => boolean;

export interface MoveResult {
  x: number;
  z: number;
  /** True when the body actually changed position. */
  moved: boolean;
  /** True when the slide fallback was used. */
  slid: boolean;
  /** Deviation (radians) actually taken from the straight line; 0 when direct. */
  deviation: number;
}

const SLIDE_ANGLES = [
  Math.PI / 6,
  -Math.PI / 6,
  Math.PI / 3,
  -Math.PI / 3,
  Math.PI / 2,
  -Math.PI / 2,
];

/**
 * Step `distance` towards (dirX, dirZ) with axis-separated collision handling.
 * If the direct step is fully blocked, try progressively wider sideways
 * deviations so an NPC walks around a desk, bench or doorframe instead of
 * pressing into it forever.
 */
export function moveWithSlide(
  curX: number,
  curZ: number,
  dirX: number,
  dirZ: number,
  distance: number,
  radius: number,
  isBlocked: BlockedFn
): MoveResult {
  const len = Math.hypot(dirX, dirZ);
  if (len < 1e-6 || distance <= 0) return { x: curX, z: curZ, moved: false, slid: false, deviation: 0 };

  const nx = dirX / len;
  const nz = dirZ / len;

  // Already overlapping geometry: allow movement so the body can escape.
  const overlapping = isBlocked(curX, curZ, radius);

  const tryStep = (stepX: number, stepZ: number): { x: number; z: number; moved: boolean } => {
    let x = curX;
    let z = curZ;
    const targetX = curX + stepX;
    const targetZ = curZ + stepZ;
    if (!isBlocked(targetX, z, radius) || (overlapping && Math.abs(targetX - curX) > 0)) x = targetX;
    if (!isBlocked(x, targetZ, radius) || (overlapping && Math.abs(targetZ - curZ) > 0)) z = targetZ;
    return { x, z, moved: x !== curX || z !== curZ };
  };

  const direct = tryStep(nx * distance, nz * distance);
  if (direct.moved) return { ...direct, slid: false, deviation: 0 };

  for (const angle of SLIDE_ANGLES) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const sx = (nx * cos - nz * sin) * distance;
    const sz = (nx * sin + nz * cos) * distance;
    const attempt = tryStep(sx, sz);
    if (attempt.moved) return { ...attempt, slid: true, deviation: angle };
  }

  return { x: curX, z: curZ, moved: false, slid: false, deviation: 0 };
}

/** Candidate deviations, smallest first, alternating sides. */
const STEP_DEVIATIONS = [
  0,
  Math.PI / 12,
  -Math.PI / 12,
  Math.PI / 6,
  -Math.PI / 6,
  Math.PI / 4,
  -Math.PI / 4,
  Math.PI / 3,
  -Math.PI / 3,
  (5 * Math.PI) / 12,
  (-5 * Math.PI) / 12,
  Math.PI / 2,
  -Math.PI / 2,
  (7 * Math.PI) / 12,
  (-7 * Math.PI) / 12,
  (2 * Math.PI) / 3,
  (-2 * Math.PI) / 3,
  (5 * Math.PI) / 6,
  (-5 * Math.PI) / 6,
];

/**
 * Walk towards a target point, picking the deviation that leaves the body
 * closest to it when the direct line is obstructed.
 *
 * Unlike a fixed trial order this is stable frame to frame, so an NPC rounds a
 * lamp post or bench consistently instead of flipping sides and jittering in
 * place (which is what made schedule walkers appear to oscillate).
 */
export function moveToward(
  curX: number,
  curZ: number,
  targetX: number,
  targetZ: number,
  distance: number,
  radius: number,
  isBlocked: BlockedFn,
  /** Commitment to one side of an obstacle: +1 right, -1 left, 0 free choice. */
  side = 0
): MoveResult {
  const dx = targetX - curX;
  const dz = targetZ - curZ;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6 || distance <= 0) return { x: curX, z: curZ, moved: false, slid: false, deviation: 0 };

  const baseX = dx / len;
  const baseZ = dz / len;
  const overlapping = isBlocked(curX, curZ, radius);
  const deviations =
    side === 0
      ? STEP_DEVIATIONS
      : STEP_DEVIATIONS.filter((d) => d === 0 || Math.sign(d) === side);

  let best: MoveResult = { x: curX, z: curZ, moved: false, slid: false, deviation: 0 };
  let bestScore = Infinity;
  let bestTurned: MoveResult | null = null;
  let bestTurnedScore = Infinity;
  let cleanStep: MoveResult | null = null;
  let directClean = false;

  for (const dev of deviations) {
    const cos = Math.cos(dev);
    const sin = Math.sin(dev);
    const stepX = (baseX * cos - baseZ * sin) * distance;
    const stepZ = (baseX * sin + baseZ * cos) * distance;

    let x = curX;
    let z = curZ;
    const tx = curX + stepX;
    const tz = curZ + stepZ;
    const xFree = !isBlocked(tx, z, radius) || overlapping;
    if (xFree) x = tx;
    const zFree = !isBlocked(x, tz, radius) || overlapping;
    if (zFree) z = tz;
    if (x === curX && z === curZ) continue;

    const clamped = !xFree || !zFree;
    const candidate: MoveResult = {
      x,
      z,
      moved: true,
      slid: Math.abs(dev) > 1e-9,
      deviation: dev,
    };

    // A step that is not clipped at all wins immediately: it means the body can
    // walk this way freely, which is what gets it around the corner quickly.
    if (!clamped && !cleanStep) cleanStep = candidate;

    const remaining = Math.hypot(targetX - x, targetZ - z);
    // Slight preference for going straight on when progress is equal.
    const score = remaining + Math.abs(dev) * 0.01 * distance;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
    if (dev === 0) {
      directClean = !clamped;
    } else if (score < bestTurnedScore) {
      bestTurnedScore = score;
      bestTurned = candidate;
    }
  }

  if (directClean) return best;
  // The straight line is obstructed: prefer an unobstructed turn rather than
  // creeping forward while scraping along the obstacle.
  return cleanStep ?? bestTurned ?? best;
}

/**
 * Nearest position that is clear of collision geometry, searched out to
 * `maxRadius`. Used to lift a body out of furniture it spawned inside.
 */
export function findClearSpot(
  x: number,
  z: number,
  radius: number,
  isBlocked: BlockedFn,
  maxRadius = 2.5
): { x: number; z: number } | null {
  if (!isBlocked(x, z, radius)) return null;
  for (let r = 0.4; r <= maxRadius + 1e-6; r += 0.4) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const px = x + Math.cos(angle) * r;
      const pz = z + Math.sin(angle) * r;
      if (!isBlocked(px, pz, radius)) return { x: px, z: pz };
    }
  }
  return null;
}
