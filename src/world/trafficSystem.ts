import * as THREE from 'three';
import { materialLibrary } from './materials';
import { TRAFFIC_SIGNALS, type ApproachDirection } from './worldData';
import { TrafficSimulation, type Vehicle } from './trafficSimulation';

export interface VehicleView {
  mesh: THREE.Group;
  speed: number;
  x: number;
  z: number;
  state: 'lane' | 'movement';
}

interface SignalHead {
  junctionId: string;
  phase: 'north_south' | 'east_west';
  lamps: { red: THREE.MeshBasicMaterial; amber: THREE.MeshBasicMaterial; green: THREE.MeshBasicMaterial };
}

const SIGNAL_LIT: Record<'red' | 'amber' | 'green', number> = {
  red: 0xef4444,
  amber: 0xfacc15,
  green: 0x22c55e,
};
const SIGNAL_DARK = 0x1f2937;

/**
 * Vehicles, signals and lane logic.
 *
 * Every route, lane direction, stop line and turn connection comes from
 * roadNetwork (derived from worldData.ROADS / INTERSECTIONS); the simulation is
 * pure, and this class only mirrors it onto the car meshes and the signal heads.
 * The previous hand-written waypoint loops, the barrier bollards and the
 * "never north of z = -52" clamp are gone: the lane graph simply does not
 * contain a drivable road into the school campus.
 */
export class TrafficSystem {
  public vehicles: VehicleView[] = [];
  public group: THREE.Group;
  public simulation: TrafficSimulation;
  public signalHeads: SignalHead[] = [];
  public signalTime = 0;

  private meshes: THREE.Group[] = [];
  private simVehicles: Vehicle[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.simulation = new TrafficSimulation();
    this.simVehicles = this.simulation.vehicles;
    this.initVehicles();
    this.initSignalHeads();
    this.syncMeshes();
  }

  private initVehicles() {
    for (const vehicle of this.simVehicles) {
      const mesh = this.createCarMesh(vehicle.color);
      this.group.add(mesh);
      this.meshes.push(mesh);
      this.vehicles.push({ mesh, speed: 0, x: vehicle.x, z: vehicle.z, state: vehicle.state });
    }
  }

  /** One mast + three-lamp head per approach, at the shared signal positions. */
  private initSignalHeads() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 4.2, 8);
    const headGeo = new THREE.BoxGeometry(0.42, 1.15, 0.3);
    const lampGeo = new THREE.SphereGeometry(0.11, 8, 8);

    const yawFor = (approach: ApproachDirection): number => {
      // Face the driver: a southbound approach looks south, so the head faces north.
      switch (approach) {
        case 'south':
          return Math.PI;
        case 'north':
          return 0;
        case 'east':
          return -Math.PI / 2;
        default:
          return Math.PI / 2;
      }
    };

    TRAFFIC_SIGNALS.forEach((signal) => {
      const group = new THREE.Group();
      group.position.set(signal.poleX, 0, signal.poleZ);

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.1;
      pole.castShadow = true;
      group.add(pole);

      const head = new THREE.Group();
      head.position.set(0, 3.7, 0);
      head.rotation.y = yawFor(signal.approachDirection);
      const housing = new THREE.Mesh(headGeo, headMat);
      head.add(housing);

      const makeLamp = (y: number) => {
        const mat = new THREE.MeshBasicMaterial({ color: SIGNAL_DARK });
        const lamp = new THREE.Mesh(lampGeo, mat);
        lamp.position.set(0, y, 0.17);
        head.add(lamp);
        return mat;
      };

      const lamps = { red: makeLamp(0.36), amber: makeLamp(0), green: makeLamp(-0.36) };
      group.add(head);
      this.group.add(group);

      this.signalHeads.push({ junctionId: signal.intersectionId, phase: signal.phase, lamps });
    });
  }

  private updateSignalHeads() {
    for (const head of this.signalHeads) {
      const color = this.simulation.signals.colorFor(head.junctionId, head.phase, this.signalTime);
      head.lamps.red.color.setHex(color === 'red' ? SIGNAL_LIT.red : SIGNAL_DARK);
      head.lamps.amber.color.setHex(color === 'yellow' ? SIGNAL_LIT.amber : SIGNAL_DARK);
      head.lamps.green.color.setHex(color === 'green' ? SIGNAL_LIT.green : SIGNAL_DARK);
    }
  }

  // Shared static geometries & materials to avoid per-car duplicate allocations
  private static bodyGeo = new THREE.BoxGeometry(2.0, 0.72, 4.0);
  private static cabGeo = new THREE.BoxGeometry(1.68, 0.65, 2.2);
  private static hlGeo = new THREE.BoxGeometry(0.35, 0.16, 0.05);
  private static headMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.9,
  });
  private static tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.9,
  });
  private static wheelGeo = (() => {
    const g = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 8);
    g.rotateZ(Math.PI / 2);
    return g;
  })();
  private static wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

  private createCarMesh(color: number): THREE.Group {
    const group = new THREE.Group();

    // Car Body (Chassis)
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.28,
      metalness: 0.5,
    });
    const body = new THREE.Mesh(TrafficSystem.bodyGeo, bodyMat);
    body.position.set(0, 0.55, 0);
    body.castShadow = true;
    group.add(body);

    // Cabin / Windows Glass
    const cabMat = materialLibrary.get('glass');
    const cab = new THREE.Mesh(TrafficSystem.cabGeo, cabMat);
    cab.position.set(0, 1.16, -0.2);
    group.add(cab);

    // Headlights (Warm Yellow Emission)
    const hlLeft = new THREE.Mesh(TrafficSystem.hlGeo, TrafficSystem.headMat);
    hlLeft.position.set(-0.65, 0.6, 2.02);
    const hlRight = new THREE.Mesh(TrafficSystem.hlGeo, TrafficSystem.headMat);
    hlRight.position.set(0.65, 0.6, 2.02);
    group.add(hlLeft, hlRight);

    // Taillights (Red Emission)
    const tlLeft = new THREE.Mesh(TrafficSystem.hlGeo, TrafficSystem.tailMat);
    tlLeft.position.set(-0.65, 0.6, -2.02);
    const tlRight = new THREE.Mesh(TrafficSystem.hlGeo, TrafficSystem.tailMat);
    tlRight.position.set(0.65, 0.6, -2.02);
    group.add(tlLeft, tlRight);

    // 4 Wheels
    const wPos = [
      [-1.0, 0.32, 1.2],
      [1.0, 0.32, 1.2],
      [-1.0, 0.32, -1.2],
      [1.0, 0.32, -1.2],
    ];
    wPos.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(TrafficSystem.wheelGeo, TrafficSystem.wheelMat);
      w.position.set(wx, wy, wz);
      group.add(w);
    });

    return group;
  }

  private syncMeshes() {
    for (let i = 0; i < this.simVehicles.length; i++) {
      const v = this.simVehicles[i];
      const mesh = this.meshes[i];
      mesh.position.set(v.x, 0, v.z);
      mesh.rotation.y = v.heading;
      const view = this.vehicles[i];
      view.speed = v.speed;
      view.x = v.x;
      view.z = v.z;
      view.state = v.state;
    }
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    pedestrians: { x: number; z: number }[] = []
  ) {
    this.simulation.update(delta, { x: playerPos.x, z: playerPos.z }, pedestrians);
    this.signalTime = this.simulation.time;
    this.syncMeshes();
    this.updateSignalHeads();
  }
}
