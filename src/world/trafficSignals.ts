/**
 * trafficSignals.ts — signal phase controller.
 *
 * Pure and time-driven so it can be tested headlessly (and so the visible
 * signal heads and the vehicle logic always read the same state).
 *
 * Cycle per junction: NS green → NS yellow → all red → EW green → EW yellow →
 * all red → repeat. Junctions are offset from one another so a car driving
 * down the avenue meets changing lights instead of a green wave.
 */

import type { SignalPhase } from './worldData';

export type SignalColor = 'green' | 'yellow' | 'red';

export interface SignalTimings {
  green: number;
  yellow: number;
  allRed: number;
}

export const DEFAULT_SIGNAL_TIMINGS: SignalTimings = {
  green: 14,
  yellow: 3,
  allRed: 2,
};

export interface SignalJunction {
  id: string;
  offset: number;
}

export class SignalController {
  private readonly byId: Map<string, SignalJunction>;

  constructor(
    junctions: SignalJunction[],
    public timings: SignalTimings = DEFAULT_SIGNAL_TIMINGS
  ) {
    this.byId = new Map(junctions.map((j) => [j.id, j]));
  }

  /** Length of one full cycle (both road orientations). */
  public get cycleLength(): number {
    const { green, yellow, allRed } = this.timings;
    return 2 * (green + yellow + allRed);
  }

  /** Colour shown to traffic approaching on `phase` at `junctionId`. */
  public colorFor(junctionId: string, phase: SignalPhase, time: number): SignalColor {
    const junction = this.byId.get(junctionId);
    if (!junction) return 'green'; // unsignalized: nothing to obey
    const { green, yellow, allRed } = this.timings;
    const cycle = this.cycleLength;
    const t = (((time + junction.offset) % cycle) + cycle) % cycle;

    const nsGreenEnd = green;
    const nsYellowEnd = green + yellow;
    const nsAllRedEnd = nsYellowEnd + allRed;
    const ewGreenEnd = nsAllRedEnd + green;
    const ewYellowEnd = ewGreenEnd + yellow;

    if (phase === 'north_south') {
      if (t < nsGreenEnd) return 'green';
      if (t < nsYellowEnd) return 'yellow';
      return 'red';
    }
    if (t >= nsAllRedEnd && t < ewGreenEnd) return 'green';
    if (t >= ewGreenEnd && t < ewYellowEnd) return 'yellow';
    return 'red';
  }

  /** Both orientations at once — used by the visible signal heads. */
  public stateFor(junctionId: string, time: number): { north_south: SignalColor; east_west: SignalColor } {
    return {
      north_south: this.colorFor(junctionId, 'north_south', time),
      east_west: this.colorFor(junctionId, 'east_west', time),
    };
  }
}
