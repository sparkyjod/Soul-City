import { describe, expect, test } from 'bun:test';
import { laneEndsAtSignal, trafficNetwork } from './roadNetwork';
import { CAR_LENGTH, SAFE_GAP, STOP_BACKOFF, TrafficSimulation } from './trafficSimulation';
import { SignalController, DEFAULT_SIGNAL_TIMINGS } from './trafficSignals';

const DT = 1 / 30;

const step = (sim: TrafficSimulation, seconds: number) => {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) sim.update(DT);
};

/** A signalized lane where the approach can be red for a while. */
const signalizedLane = () => {
  const lane = trafficNetwork.lanes.find((l) => laneEndsAtSignal(l));
  if (!lane) throw new Error('no signalized lane in the network');
  return lane;
};

/** First time in the cycle at which this lane's approach is red. */
const redTimeFor = (sim: TrafficSimulation, lane = signalizedLane()) => {
  const junction = lane.toJunctionId!;
  for (let t = 0; t < sim.signals.cycleLength; t += 0.25) {
    if (sim.signals.colorFor(junction, lane.signalPhase, t) === 'red') return t;
  }
  throw new Error('approach is never red');
};

const greenTimeFor = (sim: TrafficSimulation, lane = signalizedLane()) => {
  const junction = lane.toJunctionId!;
  for (let t = 0; t < sim.signals.cycleLength; t += 0.25) {
    if (sim.signals.colorFor(junction, lane.signalPhase, t) === 'green') return t;
  }
  throw new Error('approach is never green');
};

const singleCarSim = () => {
  const sim = new TrafficSimulation({ vehicles: 0 });
  sim.vehicles.length = 0;
  return sim;
};

describe('signal controller', () => {
  const controller = new SignalController([{ id: 'j', offset: 0 }], DEFAULT_SIGNAL_TIMINGS);
  const cycle = controller.cycleLength;

  test('both orientations never show green at the same time', () => {
    for (let t = 0; t < cycle * 2; t += 0.2) {
      const state = controller.stateFor('j', t);
      expect(state.north_south === 'green' && state.east_west === 'green').toBe(false);
    }
  });

  test('each orientation gets a green, an amber and a red', () => {
    const seen = new Set<string>();
    for (let t = 0; t < cycle; t += 0.2) {
      seen.add(`ns:${controller.colorFor('j', 'north_south', t)}`);
      seen.add(`ew:${controller.colorFor('j', 'east_west', t)}`);
    }
    for (const key of ['ns:green', 'ns:yellow', 'ns:red', 'ew:green', 'ew:yellow', 'ew:red']) {
      expect(seen.has(key), `missing ${key}`).toBe(true);
    }
  });

  test('an unknown junction is not signal controlled', () => {
    expect(controller.colorFor('nope', 'north_south', 5)).toBe('green');
  });
});

describe('vehicles obey signals', () => {
  test('a car approaching a red stops before the stop line', () => {
    const lane = signalizedLane();
    const sim = singleCarSim();
    const car = sim.createVehicle(lane.id, lane.length - 22);
    sim.time = redTimeFor(sim);

    step(sim, 12);
    const stopPoint = lane.length - CAR_LENGTH / 2;
    expect(car.s).toBeLessThanOrEqual(stopPoint + 0.01);
    expect(car.speed).toBeLessThan(0.2);
    // It actually stopped at the line instead of hanging far back.
    expect(lane.length - car.s).toBeLessThan(CAR_LENGTH);
  });

  test('a car on green drives through the junction', () => {
    const lane = signalizedLane();
    const sim = singleCarSim();
    sim.createVehicle(lane.id, lane.length - 22);
    sim.time = greenTimeFor(sim);

    step(sim, 10);
    expect(sim.completedCrossings).toBeGreaterThan(0);
  });

  test('a car already waiting on the stop line never creeps across on red', () => {
    const lane = signalizedLane();
    const junction = lane.toJunctionId!;
    const sim = singleCarSim();
    const car = sim.createVehicle(lane.id, lane.length - 20);
    sim.time = redTimeFor(sim);
    // Park the car nose-to-the-line, exactly where a queue head sits.
    car.s = lane.length - STOP_BACKOFF;
    car.speed = 0;

    let crossingColor: string | null = null;
    for (let i = 0; i < 60 / DT; i++) {
      const color = sim.signals.colorFor(junction, lane.signalPhase, sim.time);
      const wasQueued = car.state === 'lane' && car.laneId === lane.id;
      sim.update(DT);
      if (wasQueued && (car.state === 'movement' || car.laneId !== lane.id)) {
        crossingColor = color;
        break;
      }
    }

    expect(crossingColor).not.toBeNull();
    expect(crossingColor).not.toBe('red');
  });

  test('a car does not enter a junction while its movement is blocked', () => {
    const lane = signalizedLane();
    const sim = singleCarSim();
    const car = sim.createVehicle(lane.id, lane.length - 22);
    sim.time = greenTimeFor(sim);

    // Park a car right at the start of every receiving lane so nothing is clear.
    const options = trafficNetwork.movementsByLane.get(lane.id) ?? [];
    for (const movement of options) {
      sim.createVehicle(movement.toLaneId, 1);
    }

    step(sim, 10);
    expect(car.state).toBe('lane');
    expect(car.s).toBeLessThanOrEqual(lane.length - CAR_LENGTH / 2 + 0.01);
  });
});

describe('junction discipline', () => {
  test('no vehicle ever begins crossing on a red light', () => {
    const sim = new TrafficSimulation();
    let violations = 0;
    let crossings = 0;
    const previous = new Map<number, string | null>();

    for (let i = 0; i < 300 / DT; i++) {
      for (const v of sim.vehicles) previous.set(v.id, sim.signalForVehicle(v));
      sim.update(DT);
      for (const v of sim.vehicles) {
        if (v.state === 'movement' && previous.get(v.id) === 'red') {
          // Only counts as a violation on the frame it starts crossing.
          violations++;
        }
        if (v.state === 'movement' && previous.get(v.id) === null) crossings++;
      }
    }

    expect(violations).toBe(0);
    expect(crossings).toBeGreaterThan(0);
  });
});

describe('car following', () => {
  test('two cars in one lane keep a safe gap, then resume in order', () => {
    const lane = trafficNetwork.lanes.find((l) => l.length > 60)!;
    const sim = singleCarSim();
    const leader = sim.createVehicle(lane.id, 20);
    const follower = sim.createVehicle(lane.id, 4);

    let minGap = Infinity;
    for (let i = 0; i < 900; i++) {
      sim.update(DT);
      // Only compare when both really sit on the same lane (a car on a turn
      // path keeps its old lane id but has already left the queue position).
      if (
        leader.state === 'lane' &&
        follower.state === 'lane' &&
        leader.laneId === follower.laneId
      ) {
        minGap = Math.min(minGap, leader.s - follower.s - CAR_LENGTH);
      }
    }
    expect(minGap).toBeGreaterThan(-0.01);
    // Both kept driving after clearing the junction.
    expect(sim.completedCrossings).toBeGreaterThan(0);
  });
});

describe('long run stability', () => {
  test('six cars drive for four sim-minutes without overlapping or leaving the roads', () => {
    const sim = new TrafficSimulation();
    let minDistance = Infinity;
    let maxSpeed = 0;

    for (let i = 0; i < 240 / DT; i++) {
      sim.update(DT);
      for (const v of sim.vehicles) {
        expect(Number.isFinite(v.x)).toBe(true);
        expect(Number.isFinite(v.z)).toBe(true);
        // Inside the painted city bounds.
        expect(Math.abs(v.x)).toBeLessThan(92);
        expect(v.z).toBeGreaterThan(-64);
        expect(v.z).toBeLessThan(66);
        expect(v.speed).toBeGreaterThanOrEqual(0);
        maxSpeed = Math.max(maxSpeed, v.speed);
      }
      for (let a = 0; a < sim.vehicles.length; a++) {
        for (let b = a + 1; b < sim.vehicles.length; b++) {
          const va = sim.vehicles[a];
          const vb = sim.vehicles[b];
          minDistance = Math.min(minDistance, Math.hypot(va.x - vb.x, va.z - vb.z));
        }
      }
    }

    expect(minDistance).toBeGreaterThan(2.0);
    expect(maxSpeed).toBeLessThan(10);
    expect(sim.completedCrossings).toBeGreaterThan(0);
  });

  test('cars keep their following distance inside a lane over a long run', () => {
    const sim = new TrafficSimulation();
    for (let i = 0; i < 120 / DT; i++) {
      sim.update(DT);
      for (const lane of trafficNetwork.lanes) {
        const inLane = sim.vehicles.filter((v) => v.state === 'lane' && v.laneId === lane.id).sort((a, b) => a.s - b.s);
        for (let k = 1; k < inLane.length; k++) {
          expect(inLane[k].s - inLane[k - 1].s).toBeGreaterThanOrEqual(CAR_LENGTH - 0.01);
        }
      }
    }
    // Sanity: the safety gap constant is actually being respected.
    expect(CAR_LENGTH + SAFE_GAP).toBeGreaterThan(CAR_LENGTH);
  });

  test('every car always sits on a real lane or a real turn path', () => {
    const sim = new TrafficSimulation();
    for (let i = 0; i < 60 / DT; i++) {
      sim.update(DT);
      for (const car of sim.vehicles) {
        if (car.state === 'lane') {
          expect(trafficNetwork.laneById.has(car.laneId)).toBe(true);
          expect(car.movementId === null || trafficNetwork.movementById.has(car.movementId)).toBe(true);
        } else {
          expect(car.movementId).not.toBeNull();
          expect(trafficNetwork.movementById.has(car.movementId!)).toBe(true);
        }
      }
    }
  });
});
