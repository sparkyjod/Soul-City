/**
 * trafficSimulation.ts — pure vehicle simulation on the shared lane network.
 *
 * No Three.js: TrafficSystem only mirrors these positions onto car meshes, and
 * the tests drive this module directly.
 *
 * Behaviour modelled:
 *  - vehicles follow lane centrelines in the correct travel direction,
 *  - they stop before the stop line for a red (and amber, when they can),
 *  - conflicting movements are mutually exclusive inside a junction,
 *  - they keep a safe following distance and never overlap,
 *  - they wait when the receiving lane is still occupied, then resume.
 */

import {
  laneEndsAtSignal,
  movementById,
  movementsByLane,
  trafficNetwork,
  type LaneSegment,
  type Point,
  type TurnMovement,
} from './roadNetwork';
import { SignalController, type SignalColor } from './trafficSignals';

export const CAR_LENGTH = 4.2;
export const CAR_WIDTH = 2.0;
/** Gap a car leaves to the car in front of it. */
export const SAFE_GAP = 2.6;
/** Distance from a car's centre to the stop line when it has stopped. */
export const STOP_BACKOFF = CAR_LENGTH / 2 + 0.5;
const ACCEL = 6.5;
const BRAKE = 14;

export type VehicleState = 'lane' | 'movement';

export interface Vehicle {
  id: number;
  color: number;
  state: VehicleState;
  laneId: string;
  /** Distance travelled along the current lane (0 = start). */
  s: number;
  speed: number;
  baseSpeed: number;
  movementId: string | null;
  /** Distance travelled along the current turn path. */
  movementS: number;
  /** Chosen exit movement while still on the lane. */
  nextMovementId: string | null;
  x: number;
  z: number;
  heading: number;
  /** Counter used to vary the route so cars do not all follow the same loop. */
  turns: number;
  stopped: boolean;
}

export interface SimulationOptions {
  time?: number;
  vehicles?: number;
}

const carsColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0x8b5cf6, 0xec4899];

const tangentHeading = (path: Point[], distance: number): number => {
  const at = trafficNetwork.pointAlong(path, Math.min(distance, trafficNetwork.pathLength(path)));
  const ahead = trafficNetwork.pointAlong(
    path,
    Math.min(distance + 1.5, trafficNetwork.pathLength(path))
  );
  const dx = ahead.x - at.x;
  const dz = ahead.z - at.z;
  if (Math.hypot(dx, dz) < 1e-4) return 0;
  return Math.atan2(dx, dz);
};

export class TrafficSimulation {
  public vehicles: Vehicle[] = [];
  public signals: SignalController;
  public time = 0;
  /** Completed junction crossings, surfaced for tests. */
  public completedCrossings = 0;

  constructor(options: SimulationOptions = {}) {
    this.time = options.time ?? 0;
    this.signals = new SignalController(
      trafficNetwork.junctionList.map((j) => ({ id: j.id, offset: j.signalOffset }))
    );
    this.spawn(options.vehicles ?? 6);
  }

  /** Create a vehicle at a given position on a lane (also used by the tests). */
  public createVehicle(laneId: string, s: number, id = this.vehicles.length): Vehicle {
    const lane = trafficNetwork.laneById.get(laneId);
    if (!lane) throw new Error(`trafficSimulation: unknown lane ${laneId}`);
    const vehicle: Vehicle = {
      id,
      color: carsColors[id % carsColors.length],
      state: 'lane',
      laneId,
      s: Math.max(0, Math.min(s, lane.length - 1)),
      speed: 0,
      baseSpeed: 7.0 + (id % 3) * 0.4,
      movementId: null,
      movementS: 0,
      nextMovementId: null,
      x: 0,
      z: 0,
      heading: 0,
      turns: id,
      stopped: false,
    };
    const point = this.lanePoint(lane, vehicle.s);
    vehicle.x = point.x;
    vehicle.z = point.z;
    vehicle.heading = Math.atan2(lane.dirX, lane.dirZ);
    vehicle.nextMovementId = this.chooseMovement(lane, vehicle)?.id ?? null;
    this.vehicles.push(vehicle);
    return vehicle;
  }

  private spawn(count: number): void {
    const lanes = trafficNetwork.lanes;
    for (let i = 0; i < count; i++) {
      // Spread cars over different lanes so none spawn on top of another.
      const lane = lanes[(i * 3) % lanes.length];
      const s = (lane.length / (count + 1)) * (1 + (i % 3));
      this.createVehicle(lane.id, Math.min(s, lane.length - 1), i);
    }
  }

  private lanePoint(lane: LaneSegment, s: number): Point {
    const t = Math.max(0, Math.min(1, s / lane.length));
    return {
      x: lane.startX + (lane.endX - lane.startX) * t,
      z: lane.startZ + (lane.endZ - lane.startZ) * t,
    };
  }

  /** Pick the exit the vehicle will take at the end of its lane. */
  private chooseMovement(lane: LaneSegment, vehicle: Vehicle): TurnMovement | null {
    const options = movementsByLane.get(lane.id) ?? [];
    if (options.length === 0) return null;

    const straight = options.filter((m) => m.type === 'straight');
    const sideTurns = options.filter((m) => m.type === 'left' || m.type === 'right');
    const uTurns = options.filter((m) => m.type === 'u_turn');

    if (straight.length > 0) return straight[vehicle.turns % straight.length];
    if (sideTurns.length > 0) return sideTurns[vehicle.turns % sideTurns.length];
    return uTurns[0] ?? null;
  }

  private vehiclesInLane(laneId: string): Vehicle[] {
    return this.vehicles.filter((v) => v.state === 'lane' && v.laneId === laneId);
  }

  /**
   * Is there room at the head of `targetLaneId`? Cars still finishing a turn
   * into that lane are counted too, otherwise two cars can claim the same spot
   * from opposite sides of the junction.
   */
  private laneAheadClear(targetLaneId: string, ignoreId = -1): boolean {
    const clearance = CAR_LENGTH + SAFE_GAP;
    const inLane = this.vehiclesInLane(targetLaneId).filter((v) => v.id !== ignoreId);
    if (!inLane.every((v) => v.s > clearance)) return false;
    return this.vehicles.every((v) => {
      if (v.id === ignoreId) return true;
      if (v.state !== 'movement' || !v.movementId) return true;
      const movement = movementById.get(v.movementId);
      if (!movement || movement.toLaneId !== targetLaneId) return true;
      return movement.length - v.movementS > clearance;
    });
  }

  /** Can this vehicle start crossing the junction right now? */
  private canEnterMovement(vehicle: Vehicle, movement: TurnMovement): boolean {
    const clearance = CAR_LENGTH + SAFE_GAP;

    for (const other of this.vehicles) {
      if (other.id === vehicle.id || other.state !== 'movement' || !other.movementId) continue;
      if (movement.conflicts.includes(other.movementId)) return false;
      if (other.movementId === movement.id && other.movementS < clearance) return false;
    }

    // Never drive into a queue that backs up into the junction.
    return this.laneAheadClear(movement.toLaneId, vehicle.id);
  }

  /** The vehicle directly ahead in the same lane, if any. */
  private leaderInLane(vehicle: Vehicle, laneId: string): Vehicle | null {
    let best: Vehicle | null = null;
    for (const other of this.vehicles) {
      if (other.id === vehicle.id) continue;
      if (other.state !== 'lane' || other.laneId !== laneId) continue;
      if (other.s <= vehicle.s) continue;
      if (!best || other.s < best.s) best = other;
    }
    return best;
  }

  private playerSpeedCap(vehicle: Vehicle, player?: Point): number {
    if (!player) return Infinity;
    const dx = player.x - vehicle.x;
    const dz = player.z - vehicle.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 9) return Infinity;
    // Only brake for someone actually in front of the car.
    const forward = (dx * Math.sin(vehicle.heading) + dz * Math.cos(vehicle.heading)) / (distance || 1);
    if (forward < 0.5) return Infinity;
    if (distance < 4.5) return 0;
    return 2.2;
  }

  public update(dt: number, player?: Point): void {
    this.time += dt;

    for (const vehicle of this.vehicles) {
      if (vehicle.state === 'lane') this.updateOnLane(vehicle, dt, player);
      else this.updateInMovement(vehicle, dt, player);
    }
  }

  private updateOnLane(vehicle: Vehicle, dt: number, player?: Point): void {
    const lane = trafficNetwork.laneById.get(vehicle.laneId)!;
    let targetSpeed = vehicle.baseSpeed;

    const stopPoint = lane.length - STOP_BACKOFF;
    /**
     * The nose is already over the line: stopping now would leave the car
     * parked in the middle of the junction, so it clears it instead. A car
     * *at* the stop point is not committed — that is exactly where cars stop,
     * and it must still wait for its green.
     */
    const committed = vehicle.s > stopPoint + 0.05;

    // 1. Signals: stop at the stop line while this approach is not green.
    let mustHold = false;
    if (laneEndsAtSignal(lane) && lane.toJunctionId) {
      const color = this.signals.colorFor(lane.toJunctionId, lane.signalPhase, this.time);
      if (color === 'red') mustHold = true;
      // Amber: stop only if there is comfortable room left to do so.
      else if (color === 'yellow' && stopPoint - vehicle.s > 4) mustHold = true;
    }

    // 2. A turn may only start when the junction and receiving lane are free.
    const movement = vehicle.nextMovementId ? movementById.get(vehicle.nextMovementId) : null;
    const junctionClear = movement ? this.canEnterMovement(vehicle, movement) : false;
    if (!junctionClear) mustHold = true;
    if (mustHold && committed) mustHold = false; // already over the line: keep going

    if (mustHold) {
      const distanceToStopLine = stopPoint - vehicle.s;
      targetSpeed =
        distanceToStopLine <= 0.05
          ? 0
          : Math.min(targetSpeed, Math.max(0.7, distanceToStopLine * 1.2));
    }

    // 3. Following distance to the car ahead in this lane.
    const leader = this.leaderInLane(vehicle, lane.id);
    if (leader) {
      const gap = leader.s - vehicle.s - CAR_LENGTH;
      if (gap < SAFE_GAP * 2.5) {
        const allowed = Math.max(0, gap - SAFE_GAP) * 1.4;
        targetSpeed = Math.min(targetSpeed, allowed);
      }
    }

    // 4. Do not run over the player.
    targetSpeed = Math.min(targetSpeed, this.playerSpeedCap(vehicle, player));

    // 5. Integrate speed and position.
    const stopping = targetSpeed < vehicle.speed;
    const rate = stopping ? BRAKE : ACCEL;
    vehicle.speed += Math.sign(targetSpeed - vehicle.speed) * Math.min(Math.abs(targetSpeed - vehicle.speed), rate * dt);
    vehicle.speed = Math.max(0, vehicle.speed);
    vehicle.stopped = vehicle.speed < 0.05;

    const cap = mustHold ? Math.min(lane.length, Math.max(vehicle.s, stopPoint)) : lane.length;
    vehicle.s = Math.min(vehicle.s + vehicle.speed * dt, cap);
    const point = this.lanePoint(lane, vehicle.s);
    vehicle.x = point.x;
    vehicle.z = point.z;
    vehicle.heading = Math.atan2(lane.dirX, lane.dirZ);

    if (vehicle.s >= lane.length - 1e-6 && junctionClear && movement) {
      vehicle.state = 'movement';
      vehicle.movementId = movement.id;
      vehicle.movementS = 0;
    } else if (mustHold && vehicle.s >= stopPoint - 1e-6) {
      vehicle.speed = 0;
      vehicle.stopped = true;
    }
  }

  private updateInMovement(vehicle: Vehicle, dt: number, player?: Point): void {
    const movement = vehicle.movementId ? movementById.get(vehicle.movementId) : null;
    if (!movement) {
      // Defensive: an invalid movement must never leave a car stranded off-road.
      vehicle.state = 'lane';
      vehicle.movementId = null;
      vehicle.movementS = 0;
      return;
    }

    let targetSpeed = vehicle.baseSpeed;
    const remaining = movement.length - vehicle.movementS;

    // Queueing into the receiving lane? Hold at the end of the turn path.
    if (!this.laneAheadClear(movement.toLaneId, vehicle.id) && remaining < CAR_LENGTH + SAFE_GAP) {
      targetSpeed = Math.max(0, remaining - 1) * 1.5;
    }
    targetSpeed = Math.min(targetSpeed, this.playerSpeedCap(vehicle, player));

    const stopping = targetSpeed < vehicle.speed;
    const rate = stopping ? BRAKE : ACCEL;
    vehicle.speed += Math.sign(targetSpeed - vehicle.speed) * Math.min(Math.abs(targetSpeed - vehicle.speed), rate * dt);
    vehicle.speed = Math.max(0, vehicle.speed);
    vehicle.stopped = vehicle.speed < 0.05;

    vehicle.movementS = Math.min(vehicle.movementS + vehicle.speed * dt, movement.length);
    const point = trafficNetwork.pointAlong(movement.path, vehicle.movementS);
    vehicle.x = point.x;
    vehicle.z = point.z;
    vehicle.heading = tangentHeading(movement.path, vehicle.movementS);

    const finished = vehicle.movementS >= movement.length - 1e-6;
    if (finished && this.laneAheadClear(movement.toLaneId, vehicle.id)) {
      vehicle.state = 'lane';
      vehicle.laneId = movement.toLaneId;
      vehicle.s = 0;
      vehicle.movementId = null;
      vehicle.movementS = 0;
      vehicle.turns++;
      this.completedCrossings++;
      const lane = trafficNetwork.laneById.get(vehicle.laneId)!;
      vehicle.nextMovementId = this.chooseMovement(lane, vehicle)?.id ?? null;
      const start = this.lanePoint(lane, 0);
      vehicle.x = start.x;
      vehicle.z = start.z;
      vehicle.heading = Math.atan2(lane.dirX, lane.dirZ);
    }
  }

  /** Signal colour a given vehicle must obey right now (null when unsignalized). */
  public signalForVehicle(vehicle: Vehicle): SignalColor | null {
    const lane = trafficNetwork.laneById.get(vehicle.laneId);
    if (!lane || vehicle.state !== 'lane' || !lane.toJunctionId) return null;
    if (!laneEndsAtSignal(lane)) return null;
    return this.signals.colorFor(lane.toJunctionId, lane.signalPhase, this.time);
  }
}

export const trafficSimulationDefaults = {
  carLength: CAR_LENGTH,
  carWidth: CAR_WIDTH,
  safeGap: SAFE_GAP,
};
