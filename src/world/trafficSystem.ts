import * as THREE from 'three';
import { materialLibrary } from './materials';

export interface TrafficWaypoint {
  x: number;
  z: number;
}

export interface VehicleAgent {
  mesh: THREE.Group;
  route: TrafficWaypoint[];
  currentWaypointIndex: number;
  speed: number;
  baseSpeed: number;
  length: number;
}

export class TrafficSystem {
  public vehicles: VehicleAgent[] = [];
  public group: THREE.Group;

  // Pre-allocated math objects to prevent GC in animation loops
  private static _targetVec = new THREE.Vector3();
  private static _carPos = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();
    this.initRoadBarriers();
    this.initVehicles();
  }

  /**
   * Concrete bollards & safety barriers preventing vehicles from ever entering the school gate/courtyard
   */
  private initRoadBarriers() {
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Place safety bollards across the school courtyard entrance at z = -56, x: -9 to 9
    for (let x = -8; x <= 8; x += 2.5) {
      const bGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.9, 10);
      const bMesh = new THREE.Mesh(bGeo, barrierMat);
      bMesh.position.set(x, 0.45, -56);
      bMesh.castShadow = true;
      this.group.add(bMesh);

      const ringGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.2, 10);
      const ringMesh = new THREE.Mesh(ringGeo, stripeMat);
      ringMesh.position.set(x, 0.65, -56);
      this.group.add(ringMesh);
    }
  }

  private initVehicles() {
    // Route 1: Downtown & Main Boulevard Loop (Stay strictly on asphalt, never passes z = -50)
    const route1: TrafficWaypoint[] = [
      { x: -3.5, z: 48 },    // Driving north on Main Ave
      { x: -3.5, z: 0 },
      { x: -3.5, z: -50 },   // Approaching school ave, turns east
      { x: 15, z: -50 },     // Driving east on school avenue
      { x: 38, z: -50 },
      { x: 38, z: -10 },     // Driving south on east avenue
      { x: 38, z: 48 },
      { x: 15, z: 48 },      // Driving west on coastal drive
      { x: -3.5, z: 48 },
    ];

    // Route 2: Southbound & West Commercial Loop
    const route2: TrafficWaypoint[] = [
      { x: 3.5, z: -50 },    // Driving south on Main Ave
      { x: 3.5, z: 0 },
      { x: 3.5, z: 48 },     // Approaching coastal drive, turns west
      { x: -28, z: 48 },     // Driving west on coastal drive
      { x: -28, z: 15 },     // Driving north on west park avenue
      { x: -28, z: 0 },      // Reaching downtown
      { x: -10, z: 0 },      // Driving east on downtown street
      { x: 3.5, z: -10 },    // Returning to Main Ave
      { x: 3.5, z: -50 },
    ];

    // Route 3: Outer East-West Ring (Mall & Coastal bypass)
    const route3: TrafficWaypoint[] = [
      { x: -50, z: 0 },
      { x: -10, z: 0 },
      { x: 25, z: 0 },
      { x: 50, z: 0 },
      { x: 50, z: 48 },
      { x: 20, z: 48 },
      { x: -20, z: 48 },
      { x: -50, z: 48 },
      { x: -50, z: 20 },
      { x: -50, z: 0 },
    ];

    const carConfigs = [
      { color: 0xef4444, route: route1, wpStart: 0, speed: 7.5 },
      { color: 0x3b82f6, route: route1, wpStart: 4, speed: 7.2 },
      { color: 0xf59e0b, route: route2, wpStart: 0, speed: 6.8 },
      { color: 0x10b981, route: route2, wpStart: 5, speed: 7.0 },
      { color: 0x8b5cf6, route: route3, wpStart: 1, speed: 8.0 },
      { color: 0xec4899, route: route3, wpStart: 6, speed: 7.5 },
    ];

    carConfigs.forEach((cfg) => {
      const mesh = this.createCarMesh(cfg.color);
      const startWp = cfg.route[cfg.wpStart % cfg.route.length];
      mesh.position.set(startWp.x, 0, startWp.z);
      this.group.add(mesh);

      this.vehicles.push({
        mesh,
        route: cfg.route,
        currentWaypointIndex: (cfg.wpStart + 1) % cfg.route.length,
        speed: cfg.speed,
        baseSpeed: cfg.speed,
        length: 4.2,
      });
    });
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

  public update(delta: number, playerPos: THREE.Vector3) {
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const targetWp = v.route[v.currentWaypointIndex];

      const curX = v.mesh.position.x;
      const curZ = v.mesh.position.z;
      const dx = targetWp.x - curX;
      const dz = targetWp.z - curZ;
      const distToWp = Math.hypot(dx, dz);

      // Check distance to car ahead to avoid rear-ending/overlapping
      let targetSpeed = v.baseSpeed;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        const distToOther = Math.hypot(
          other.mesh.position.x - curX,
          other.mesh.position.z - curZ
        );
        if (distToOther < 7.0) {
          // Slow down or stop if behind another car
          targetSpeed = Math.min(targetSpeed, distToOther * 0.8);
        }
      }

      // Check distance to player (slow down if player is in the street)
      const distToPlayer = Math.hypot(playerPos.x - curX, playerPos.z - curZ);
      if (distToPlayer < 5.0) {
        targetSpeed = Math.min(targetSpeed, 1.5);
      }

      v.speed = THREE.MathUtils.lerp(v.speed, targetSpeed, 0.1);

      if (distToWp < 2.0) {
        // Advance to next waypoint in the route loop
        v.currentWaypointIndex = (v.currentWaypointIndex + 1) % v.route.length;
      } else {
        const moveDist = v.speed * delta;
        const dirX = dx / distToWp;
        const dirZ = dz / distToWp;

        v.mesh.position.x += dirX * moveDist;
        v.mesh.position.z += dirZ * moveDist;

        // Strict safety clamp: Never allow any vehicle north of z = -53 (School boundary)
        if (v.mesh.position.z < -52 && Math.abs(v.mesh.position.x) < 20) {
          v.mesh.position.z = -51.5;
        }

        // Smooth steering angle facing movement direction
        const targetAngle = Math.atan2(dirX, dirZ);
        v.mesh.rotation.y = THREE.MathUtils.lerp(v.mesh.rotation.y, targetAngle, 0.18);
      }
    }
  }
}
