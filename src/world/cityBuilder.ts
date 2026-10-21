import * as THREE from 'three';
import { materialLibrary } from './materials';

export interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
}

export class CityBuilder {
  public cityGroup: THREE.Group;
  public collisionBoxes: CollisionBox[] = [];
  public streetLightGlows: THREE.PointLight[] = [];
  public cars: THREE.Group[] = [];
  public animatedWater: THREE.Mesh | null = null;
  public fountainSpray: THREE.Points | null = null;

  // 2D Spatial hash grid for O(1) collision queries
  private gridCellSize = 16;
  private spatialGrid: Map<string, CollisionBox[]> = new Map();

  constructor() {
    this.cityGroup = new THREE.Group();
    this.buildWorld();

    // Optimize static draw calls: freeze transformation matrices of non-animated static meshes
    this.cityGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj !== this.animatedWater) {
        obj.matrixAutoUpdate = false;
        obj.updateMatrix();
      }
    });
  }

  private getGridKey(x: number, z: number): string {
    const gx = Math.floor(x / this.gridCellSize);
    const gz = Math.floor(z / this.gridCellSize);
    return `${gx}_${gz}`;
  }

  public addCollision(x: number, z: number, width: number, depth: number) {
    const box: CollisionBox = {
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      centerX: x,
      centerZ: z,
    };
    this.collisionBoxes.push(box);

    // Register into overlapping spatial grid buckets
    const minGx = Math.floor(box.minX / this.gridCellSize);
    const maxGx = Math.floor(box.maxX / this.gridCellSize);
    const minGz = Math.floor(box.minZ / this.gridCellSize);
    const maxGz = Math.floor(box.maxZ / this.gridCellSize);

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        const key = `${gx}_${gz}`;
        let list = this.spatialGrid.get(key);
        if (!list) {
          list = [];
          this.spatialGrid.set(key, list);
        }
        list.push(box);
      }
    }
  }

  private buildWorld() {
    this.buildTerrain();
    this.buildRoadNetwork();
    this.buildSchoolComplex();
    this.buildResidentialDistrict();
    this.buildCityCenterPlaza();
    this.buildCafeAndPark();
    this.buildMallAndArcade();
    this.buildWaterfront();
    this.buildFoliageAndProps();
  }

  private buildTerrain() {
    // Large city base terrain
    const baseGeo = new THREE.PlaneGeometry(320, 320);
    const baseMesh = new THREE.Mesh(baseGeo, materialLibrary.get('grass'));
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.position.y = -0.05;
    baseMesh.receiveShadow = true;
    this.cityGroup.add(baseMesh);

    // Dynamic Ocean surface at south (z: 82 to 160)
    const oceanGeo = new THREE.PlaneGeometry(320, 80, 24, 16);
    const oceanMesh = new THREE.Mesh(oceanGeo, materialLibrary.get('water'));
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, 0.08, 122);
    this.animatedWater = oceanMesh;
    this.cityGroup.add(oceanMesh);

    // Sandy beach buffer (z: 74 to 96)
    const sandGeo = new THREE.PlaneGeometry(300, 26);
    const sandMesh = new THREE.Mesh(sandGeo, materialLibrary.get('sand'));
    sandMesh.rotation.x = -Math.PI / 2;
    sandMesh.position.set(0, 0.1, 86);
    sandMesh.receiveShadow = true;
    this.cityGroup.add(sandMesh);
  }

  private buildRoadNetwork() {
    const roadsGroup = new THREE.Group();

    // 1. Main North-South Central Boulevard (x = 0, z from -110 to 65)
    const mainAvenueGeo = new THREE.PlaneGeometry(16, 175);
    const mainAvenue = new THREE.Mesh(mainAvenueGeo, materialLibrary.get('asphalt'));
    mainAvenue.rotation.x = -Math.PI / 2;
    mainAvenue.position.set(0, 0.02, -22.5);
    mainAvenue.receiveShadow = true;
    roadsGroup.add(mainAvenue);

    // 2. East-West School Avenue (z = -60, x from -90 to 90)
    const schoolRdGeo = new THREE.PlaneGeometry(180, 14);
    const schoolRd = new THREE.Mesh(schoolRdGeo, materialLibrary.get('asphalt'));
    schoolRd.rotation.x = -Math.PI / 2;
    schoolRd.position.set(0, 0.02, -60);
    schoolRd.receiveShadow = true;
    roadsGroup.add(schoolRd);

    // 3. East-West Downtown Street (z = 0, x from -90 to 90)
    const downtownStGeo = new THREE.PlaneGeometry(180, 14);
    const downtownSt = new THREE.Mesh(downtownStGeo, materialLibrary.get('asphalt'));
    downtownSt.rotation.x = -Math.PI / 2;
    downtownSt.position.set(0, 0.02, 0);
    downtownSt.receiveShadow = true;
    roadsGroup.add(downtownSt);

    // 4. East-West Coastal Drive (z = 60, x from -90 to 90)
    const coastalRdGeo = new THREE.PlaneGeometry(180, 14);
    const coastalRd = new THREE.Mesh(coastalRdGeo, materialLibrary.get('asphalt'));
    coastalRd.rotation.x = -Math.PI / 2;
    coastalRd.position.set(0, 0.02, 60);
    coastalRd.receiveShadow = true;
    roadsGroup.add(coastalRd);

    // Sidewalks along Main Avenue
    const swWestGeo = new THREE.PlaneGeometry(4.5, 175);
    const swWest = new THREE.Mesh(swWestGeo, materialLibrary.get('sidewalk'));
    swWest.rotation.x = -Math.PI / 2;
    swWest.position.set(-10.25, 0.04, -22.5);
    roadsGroup.add(swWest);

    const swEastGeo = new THREE.PlaneGeometry(4.5, 175);
    const swEast = new THREE.Mesh(swEastGeo, materialLibrary.get('sidewalk'));
    swEast.rotation.x = -Math.PI / 2;
    swEast.position.set(10.25, 0.04, -22.5);
    roadsGroup.add(swEast);

    // Pedestrian Zebra Crossings at Intersections
    const crosswalkGeo = new THREE.PlaneGeometry(16, 4.5);
    const intersections = [-60, 0, 60];
    intersections.forEach((iz) => {
      // North and South of intersection
      const cwNorth = new THREE.Mesh(crosswalkGeo, materialLibrary.get('crosswalkMat'));
      cwNorth.rotation.x = -Math.PI / 2;
      cwNorth.position.set(0, 0.03, iz - 9.5);
      roadsGroup.add(cwNorth);

      const cwSouth = new THREE.Mesh(crosswalkGeo, materialLibrary.get('crosswalkMat'));
      cwSouth.rotation.x = -Math.PI / 2;
      cwSouth.position.set(0, 0.03, iz + 9.5);
      roadsGroup.add(cwSouth);
    });

    // Yellow Dashed Centerlines
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let z = -105; z <= 65; z += 7) {
      if (Math.abs(z - (-60)) < 8 || Math.abs(z - 0) < 8 || Math.abs(z - 60) < 8) continue;
      const dashGeo = new THREE.PlaneGeometry(0.4, 3.5);
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.035, z);
      roadsGroup.add(dash);
    }

    this.cityGroup.add(roadsGroup);
  }

  private buildSchoolComplex() {
    const schoolGroup = new THREE.Group();

    // 1. School Courtyard Paving (walk straight in from school road z = -60 to entrance z = -64)
    const courtGeo = new THREE.PlaneGeometry(24, 10);
    const court = new THREE.Mesh(courtGeo, materialLibrary.get('sidewalk'));
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.04, -62);
    schoolGroup.add(court);

    // School Main Floor Slab (interior walkable foundation, z: -64 to -108, x: -34 to 34)
    const schoolFloorGeo = new THREE.BoxGeometry(68, 0.2, 44);
    const schoolFloorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 });
    const schoolFloor = new THREE.Mesh(schoolFloorGeo, schoolFloorMat);
    schoolFloor.position.set(0, 0.1, -86);
    schoolFloor.receiveShadow = true;
    schoolGroup.add(schoolFloor);

    // Exterior Perimeter Walls
    // North Back Wall
    const backWallGeo = new THREE.BoxGeometry(68, 5, 0.8);
    const backWall = new THREE.Mesh(backWallGeo, materialLibrary.get('schoolBrick'));
    backWall.position.set(0, 2.5, -108);
    backWall.castShadow = true;
    schoolGroup.add(backWall);
    this.addCollision(0, -108, 68, 0.8);

    // West Side Wall
    const westWallGeo = new THREE.BoxGeometry(0.8, 5, 44);
    const westWall = new THREE.Mesh(westWallGeo, materialLibrary.get('schoolBrick'));
    westWall.position.set(-34, 2.5, -86);
    westWall.castShadow = true;
    schoolGroup.add(westWall);
    this.addCollision(-34, -86, 0.8, 44);

    // East Side Wall with open double door leading to sports ground
    const eastWallNorthGeo = new THREE.BoxGeometry(0.8, 5, 18);
    const eastWallNorth = new THREE.Mesh(eastWallNorthGeo, materialLibrary.get('schoolBrick'));
    eastWallNorth.position.set(34, 2.5, -97);
    schoolGroup.add(eastWallNorth);
    this.addCollision(34, -97, 0.8, 18);

    const eastWallSouthGeo = new THREE.BoxGeometry(0.8, 5, 18);
    const eastWallSouth = new THREE.Mesh(eastWallSouthGeo, materialLibrary.get('schoolBrick'));
    eastWallSouth.position.set(34, 2.5, -73);
    schoolGroup.add(eastWallSouth);
    this.addCollision(34, -73, 0.8, 18);
    // Note: opening left at x = 34, z = -86 (8m wide) to walk directly out to sports ground!

    // South Front Wall (Wings on left & right leaving a wide 12m open front entrance)
    const southLeftGeo = new THREE.BoxGeometry(26, 5, 0.8);
    const southLeft = new THREE.Mesh(southLeftGeo, materialLibrary.get('schoolBrick'));
    southLeft.position.set(-21, 2.5, -64);
    southLeft.castShadow = true;
    schoolGroup.add(southLeft);
    this.addCollision(-21, -64, 26, 0.8);

    const southRightGeo = new THREE.BoxGeometry(26, 5, 0.8);
    const southRight = new THREE.Mesh(southRightGeo, materialLibrary.get('schoolBrick'));
    southRight.position.set(21, 2.5, -64);
    southRight.castShadow = true;
    schoolGroup.add(southRight);
    this.addCollision(21, -64, 26, 0.8);

    // Grand Entrance Arch & Signboard over entrance (leaves z = -64, x: -8 to 8 completely clear!)
    const archBeamGeo = new THREE.BoxGeometry(16, 1.4, 1.2);
    const archBeam = new THREE.Mesh(archBeamGeo, materialLibrary.get('schoolBrick'));
    archBeam.position.set(0, 5.2, -64);
    schoolGroup.add(archBeam);

    const signBoardGeo = new THREE.BoxGeometry(12, 1.8, 0.4);
    const signBoard = new THREE.Mesh(signBoardGeo, materialLibrary.get('schoolSignMat'));
    signBoard.position.set(0, 4.4, -63.5);
    schoolGroup.add(signBoard);

    // Interior Corridors & Dividers
    // Corridor Wall separating Classroom A & Corridor, leaving a wide 6m center doorway into Classroom A!
    const divideLeftGeo = new THREE.BoxGeometry(10, 4, 0.5);
    const divideLeft = new THREE.Mesh(divideLeftGeo, materialLibrary.get('schoolInteriorWall'));
    divideLeft.position.set(-8, 2, -73);
    schoolGroup.add(divideLeft);
    this.addCollision(-8, -73, 10, 0.5);

    const divideRightGeo = new THREE.BoxGeometry(10, 4, 0.5);
    const divideRight = new THREE.Mesh(divideRightGeo, materialLibrary.get('schoolInteriorWall'));
    divideRight.position.set(8, 2, -73);
    schoolGroup.add(divideRight);
    this.addCollision(8, -73, 10, 0.5);
    // Center opening x: -3 to 3 at z = -73 is completely open to walk straight into Classroom 10-A!

    // Lockers along the corridor walls
    const lockerGeo = new THREE.BoxGeometry(0.7, 2.2, 1.2);
    for (let x = -7; x <= -4; x += 1.4) {
      const locker = new THREE.Mesh(lockerGeo, materialLibrary.get('schoolLocker'));
      locker.position.set(x, 1.1, -72.4);
      schoolGroup.add(locker);
    }
    for (let x = 4; x <= 7; x += 1.4) {
      const locker = new THREE.Mesh(lockerGeo, materialLibrary.get('schoolLocker'));
      locker.position.set(x, 1.1, -72.4);
      schoolGroup.add(locker);
    }

    // 2. Classroom 10-A (North: center around [0, 0, -85])
    // Large Blackboard on Front Wall
    const bbGeo = new THREE.BoxGeometry(9, 2.4, 0.15);
    const bbMesh = new THREE.Mesh(bbGeo, materialLibrary.get('blackboardMat'));
    bbMesh.position.set(0, 2.5, -92);
    schoolGroup.add(bbMesh);

    // Teacher Desk & Chair
    const tDesk = this.createDesk(0, -89.5, 2.6, 1.2, true);
    schoolGroup.add(tDesk);
    this.addCollision(0, -89.5, 2.8, 1.4);

    // Student Desks Grid arranged with wide 2.8m center aisle for easy walking
    const deskPositions = [
      [-4.5, -85], [4.5, -85],
      [-4.5, -80], [4.5, -80],
      [-4.5, -76], [4.5, -76],
    ];
    deskPositions.forEach(([dx, dz]) => {
      const sDesk = this.createDesk(dx, dz, 1.6, 0.9, false);
      schoolGroup.add(sDesk);
      this.addCollision(dx, dz, 1.8, 1.1);
    });

    // 3. School Canteen Wing (East: center around [20, 0, -85])
    // Checkerboard floor tile
    const canteenFloorGeo = new THREE.PlaneGeometry(24, 20);
    const canteenFloor = new THREE.Mesh(canteenFloorGeo, materialLibrary.get('canteenFloor'));
    canteenFloor.rotation.x = -Math.PI / 2;
    canteenFloor.position.set(20, 0.12, -85);
    schoolGroup.add(canteenFloor);

    // Canteen Serving Counter
    const counterGeo = new THREE.BoxGeometry(10, 1.3, 1.2);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.5 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(20, 0.65, -96);
    schoolGroup.add(counter);
    this.addCollision(20, -96, 10, 1.4);

    const canteenSignGeo = new THREE.BoxGeometry(6, 1.2, 0.2);
    const canteenSign = new THREE.Mesh(canteenSignGeo, materialLibrary.get('canteenSignMat'));
    canteenSign.position.set(20, 3.2, -96);
    schoolGroup.add(canteenSign);

    // Canteen dining tables (positioned with 3m walking clearance)
    const canteenTables = [[15, -83], [25, -83], [15, -76], [25, -76]];
    canteenTables.forEach(([tx, tz]) => {
      const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.9, 12);
      const table = new THREE.Mesh(tableGeo, materialLibrary.get('deskWood'));
      table.position.set(tx, 0.45, tz);
      schoolGroup.add(table);
      this.addCollision(tx, tz, 2.0, 2.0);
    });

    // 4. Library Wing (West: center around [-20, 0, -85])
    const shelfGeo = new THREE.BoxGeometry(1.2, 3.2, 7);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
    [-28, -24].forEach((sx) => {
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(sx, 1.6, -88);
      schoolGroup.add(shelf);
      this.addCollision(sx, -88, 1.4, 7.2);
    });

    // Library study table
    const libTable = this.createDesk(-18, -84, 3.2, 1.4, false);
    schoolGroup.add(libTable);
    this.addCollision(-18, -84, 3.4, 1.6);

    // 5. Football Field & Sports Pitch (East of School: [58, 0, -75])
    const turfGeo = new THREE.PlaneGeometry(42, 58);
    const turfMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.88 });
    const turf = new THREE.Mesh(turfGeo, turfMat);
    turf.rotation.x = -Math.PI / 2;
    turf.position.set(58, 0.05, -75);
    turf.receiveShadow = true;
    schoolGroup.add(turf);

    // Goalposts (North and South)
    schoolGroup.add(this.createGoalpost(58, -100));
    schoolGroup.add(this.createGoalpost(58, -50));

    // Bleachers on the side
    const bleacherGeo = new THREE.BoxGeometry(4, 2.4, 20);
    const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });
    const bleacher = new THREE.Mesh(bleacherGeo, bleacherMat);
    bleacher.position.set(78, 1.2, -75);
    schoolGroup.add(bleacher);
    this.addCollision(78, -75, 4.4, 20.4);

    this.cityGroup.add(schoolGroup);
  }

  private createDesk(x: number, z: number, w: number, d: number, isTeacher: boolean): THREE.Group {
    const group = new THREE.Group();
    // Desktop
    const topGeo = new THREE.BoxGeometry(w, 0.08, d);
    const top = new THREE.Mesh(topGeo, materialLibrary.get('deskWood'));
    top.position.set(x, 0.75, z);
    top.castShadow = true;
    group.add(top);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6);
    const legMat = materialLibrary.get('metalLegs');
    const offsets = [
      [-w / 2 + 0.1, -d / 2 + 0.1],
      [w / 2 - 0.1, -d / 2 + 0.1],
      [-w / 2 + 0.1, d / 2 - 0.1],
      [w / 2 - 0.1, d / 2 - 0.1],
    ];
    offsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x + ox, 0.375, z + oz);
      group.add(leg);
    });

    // Chair
    const seatGeo = new THREE.BoxGeometry(w * 0.6, 0.06, d * 0.6);
    const seat = new THREE.Mesh(seatGeo, materialLibrary.get('deskWood'));
    seat.position.set(x, 0.45, z + (isTeacher ? -d * 0.8 : d * 0.8));
    group.add(seat);

    return group;
  }

  private createGoalpost(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const crossGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
    crossGeo.rotateZ(Math.PI / 2);
    const cross = new THREE.Mesh(crossGeo, postMat);
    cross.position.set(x, 2.8, z);
    group.add(cross);

    const vGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8);
    const v1 = new THREE.Mesh(vGeo, postMat);
    v1.position.set(x - 4, 1.4, z);
    const v2 = new THREE.Mesh(vGeo, postMat);
    v2.position.set(x + 4, 1.4, z);
    group.add(v1, v2);

    return group;
  }

  private buildResidentialDistrict() {
    const resGroup = new THREE.Group();

    // 7 Enterable Homes for Anirudh, Vaishnavi, Chirag, Shreya, Zannat, Shagun, Jatin
    const homes = [
      { id: 'anirudh', name: "Anirudh's Home", x: -38, z: -40, color: 0x2563eb, roof: 0x1e3a8a, bedColor: 0x3b82f6 },
      { id: 'vaishnavi', name: "Vaishnavi's Home", x: -26, z: -40, color: 0x0ea5e9, roof: 0x0369a1, bedColor: 0x38bdf8 },
      { id: 'chirag', name: "Chirag's Home", x: -14, z: -40, color: 0x059669, roof: 0x064e3b, bedColor: 0x10b981 },
      { id: 'shreya', name: "Shreya's Home", x: -2, z: -40, color: 0xec4899, roof: 0x9d174d, bedColor: 0xf472b6 },
      { id: 'zannat', name: "Zannat's Home", x: 12, z: -40, color: 0x8b5cf6, roof: 0x581c87, bedColor: 0xa855f7 },
      { id: 'shagun', name: "Shagun's Home", x: 26, z: -40, color: 0xf59e0b, roof: 0x78350f, bedColor: 0xfbbf24 },
      { id: 'jatin', name: "Jatin's Home", x: 40, z: -40, color: 0xdc2626, roof: 0x7f1d1d, bedColor: 0xef4444 },
    ];

    homes.forEach((home) => {
      const houseGroup = this.createEnterableHouse(home.x, home.z, home.name, home.color, home.roof, home.bedColor);
      resGroup.add(houseGroup);
    });

    this.cityGroup.add(resGroup);
  }

  private createEnterableHouse(
    x: number,
    z: number,
    name: string,
    wallColor: number,
    roofColor: number,
    bedColor: number
  ): THREE.Group {
    const group = new THREE.Group();

    // 1. Walkway path from school street (z = -53) up to the house front porch (z = -35.5)
    const pathGeo = new THREE.PlaneGeometry(2.4, 15);
    const path = new THREE.Mesh(pathGeo, materialLibrary.get('sidewalk'));
    path.rotation.x = -Math.PI / 2;
    path.position.set(x, 0.03, -47.5);
    group.add(path);

    // 2. Interior Floor Slab (z: -44 to -36, x: x - 4 to x + 4)
    const floorGeo = new THREE.BoxGeometry(8, 0.2, 8);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(x, 0.1, z);
    group.add(floor);

    // 3. Walls (Back, Left, Right, and Front with OPEN DOORWAY)
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 });

    // Back Wall (North: z - 4 = -44)
    const backGeo = new THREE.BoxGeometry(8, 4.5, 0.4);
    const back = new THREE.Mesh(backGeo, wallMat);
    back.position.set(x, 2.25, z - 4);
    group.add(back);
    this.addCollision(x, z - 4, 8, 0.5);

    // West Side Wall (x - 4)
    const westGeo = new THREE.BoxGeometry(0.4, 4.5, 8);
    const west = new THREE.Mesh(westGeo, wallMat);
    west.position.set(x - 4, 2.25, z);
    group.add(west);
    this.addCollision(x - 4, z, 0.5, 8);

    // East Side Wall (x + 4)
    const eastGeo = new THREE.BoxGeometry(0.4, 4.5, 8);
    const east = new THREE.Mesh(eastGeo, wallMat);
    east.position.set(x + 4, 2.25, z);
    group.add(east);
    this.addCollision(x + 4, z, 0.5, 8);

    // Front Wall (South: z + 4 = -36) SPLIT with a 2.6m wide OPEN DOORWAY in the middle!
    const frontLeftGeo = new THREE.BoxGeometry(2.7, 4.5, 0.4);
    const frontLeft = new THREE.Mesh(frontLeftGeo, wallMat);
    frontLeft.position.set(x - 2.65, 2.25, z + 4);
    group.add(frontLeft);
    this.addCollision(x - 2.65, z + 4, 2.8, 0.5);

    const frontRightGeo = new THREE.BoxGeometry(2.7, 4.5, 0.4);
    const frontRight = new THREE.Mesh(frontRightGeo, wallMat);
    frontRight.position.set(x + 2.65, 2.25, z + 4);
    group.add(frontRight);
    this.addCollision(x + 2.65, z + 4, 2.8, 0.5);
    // Notice: x: x - 1.3 to x + 1.3 at z + 4 is completely open for the player to walk directly in!

    // Roof (raised high with pitched bevel)
    const roofGeo = new THREE.ConeGeometry(6.5, 2.8, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, 5.8, z);
    group.add(roof);

    // Name Plate Header over doorway
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 256;
    plateCanvas.height = 64;
    const pctx = plateCanvas.getContext('2d')!;
    pctx.fillStyle = '#0f172a';
    pctx.fillRect(0, 0, 256, 64);
    pctx.fillStyle = '#ffffff';
    pctx.font = 'bold 22px sans-serif';
    pctx.textAlign = 'center';
    pctx.fillText(name, 128, 40);
    const pTex = new THREE.CanvasTexture(plateCanvas);
    const plateGeo = new THREE.PlaneGeometry(2.4, 0.6);
    const plate = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({ map: pTex }));
    plate.position.set(x, 3.8, z + 4.22);
    group.add(plate);

    // 4. Interior Furniture!
    // Bed with character signature color blanket
    const bedGeo = new THREE.BoxGeometry(2.0, 0.55, 3.0);
    const bedBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const bed = new THREE.Mesh(bedGeo, bedBaseMat);
    bed.position.set(x - 2.5, 0.28, z - 2.0);
    group.add(bed);
    this.addCollision(x - 2.5, z - 2.0, 2.2, 3.2);

    const blanketGeo = new THREE.BoxGeometry(1.9, 0.15, 2.0);
    const blanketMat = new THREE.MeshStandardMaterial({ color: bedColor, roughness: 0.7 });
    const blanket = new THREE.Mesh(blanketGeo, blanketMat);
    blanket.position.set(x - 2.5, 0.62, z - 1.5);
    group.add(blanket);

    // Study Desk & Laptop inside the room
    const deskGeo = new THREE.BoxGeometry(2.0, 0.75, 1.2);
    const desk = new THREE.Mesh(deskGeo, materialLibrary.get('deskWood'));
    desk.position.set(x + 2.5, 0.38, z - 2.0);
    group.add(desk);
    this.addCollision(x + 2.5, z - 2.0, 2.2, 1.4);

    // Warm Bedside Lamp
    const lampGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 8);
    const lampMat = materialLibrary.get('windowLit');
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(x + 2.5, 0.95, z - 2.0);
    group.add(lamp);

    return group;
  }

  private buildCityCenterPlaza() {
    const plazaGroup = new THREE.Group();

    // Central circular paved plaza (x = 0, z = 0, radius = 16)
    const plazaPavingGeo = new THREE.CylinderGeometry(15, 15, 0.1, 24);
    const plazaPaving = new THREE.Mesh(plazaPavingGeo, materialLibrary.get('sidewalk'));
    plazaPaving.position.set(0, 0.05, 0);
    plazaPaving.receiveShadow = true;
    plazaGroup.add(plazaPaving);

    // Grand Tiered Fountain in the center
    const fBasinGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.8, 16);
    const fBasinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const fBasin = new THREE.Mesh(fBasinGeo, fBasinMat);
    fBasin.position.set(0, 0.4, 0);
    plazaGroup.add(fBasin);
    this.addCollision(0, 0, 9.0, 9.0);

    const fWaterGeo = new THREE.CylinderGeometry(4.2, 4.2, 0.1, 16);
    const fWater = new THREE.Mesh(fWaterGeo, materialLibrary.get('water'));
    fWater.position.set(0, 0.75, 0);
    plazaGroup.add(fWater);

    const fPillarGeo = new THREE.CylinderGeometry(0.6, 0.8, 2.4, 12);
    const fPillar = new THREE.Mesh(fPillarGeo, fBasinMat);
    fPillar.position.set(0, 1.6, 0);
    plazaGroup.add(fPillar);

    const fTierGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.4, 16);
    const fTier = new THREE.Mesh(fTierGeo, fBasinMat);
    fTier.position.set(0, 2.6, 0);
    plazaGroup.add(fTier);

    // Animated water spray particles
    const sprayCount = 40;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPos = new Float32Array(sprayCount * 3);
    for (let i = 0; i < sprayCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * 2.0;
      sprayPos[i * 3] = Math.cos(ang) * rad;
      sprayPos[i * 3 + 1] = 2.8 + Math.random() * 1.2;
      sprayPos[i * 3 + 2] = Math.sin(ang) * rad;
    }
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const sprayMat = new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.25, transparent: true, opacity: 0.8 });
    const spray = new THREE.Points(sprayGeo, sprayMat);
    this.fountainSpray = spray;
    plazaGroup.add(spray);

    // Plaza Benches
    const benchAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    benchAngles.forEach((ang) => {
      const bx = Math.sin(ang) * 10;
      const bz = Math.cos(ang) * 10;
      const bench = this.createBench(bx, bz, ang + Math.PI);
      plazaGroup.add(bench);
      this.addCollision(bx, bz, 2.2, 1.2);
    });

    this.cityGroup.add(plazaGroup);
  }

  private createBench(x: number, z: number, rotY: number): THREE.Group {
    const group = new THREE.Group();
    const seatGeo = new THREE.BoxGeometry(2.2, 0.08, 0.6);
    const seat = new THREE.Mesh(seatGeo, materialLibrary.get('deskWood'));
    seat.position.set(0, 0.45, 0);
    group.add(seat);

    const backGeo = new THREE.BoxGeometry(2.2, 0.5, 0.06);
    const back = new THREE.Mesh(backGeo, materialLibrary.get('deskWood'));
    back.position.set(0, 0.75, -0.28);
    group.add(back);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    return group;
  }

  private buildCafeAndPark() {
    const cafeParkGroup = new THREE.Group();

    // 1. Enterable Central Bean Café (center [-22, 0, 16])
    // Outdoor Wooden Terrace
    const terraceGeo = new THREE.PlaneGeometry(18, 18);
    const terrace = new THREE.Mesh(terraceGeo, materialLibrary.get('boardwalkWood'));
    terrace.rotation.x = -Math.PI / 2;
    terrace.position.set(-22, 0.06, 16);
    cafeParkGroup.add(terrace);

    // Warm Parquet Interior Floor
    const cafeFloorGeo = new THREE.PlaneGeometry(14, 12);
    const cafeFloor = new THREE.Mesh(cafeFloorGeo, materialLibrary.get('cafeParquet'));
    cafeFloor.rotation.x = -Math.PI / 2;
    cafeFloor.position.set(-22, 0.08, 14);
    cafeParkGroup.add(cafeFloor);

    // Café Walls (Leaving wide open entrance from south at z = 20)
    const cafeWallMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.7 });

    // North Back Wall
    const cafeBackGeo = new THREE.BoxGeometry(14, 4.5, 0.5);
    const cafeBack = new THREE.Mesh(cafeBackGeo, cafeWallMat);
    cafeBack.position.set(-22, 2.25, 8);
    cafeParkGroup.add(cafeBack);
    this.addCollision(-22, 8, 14, 0.6);

    // West Side Wall
    const cafeWestGeo = new THREE.BoxGeometry(0.5, 4.5, 12);
    const cafeWest = new THREE.Mesh(cafeWestGeo, cafeWallMat);
    cafeWest.position.set(-29, 2.25, 14);
    cafeParkGroup.add(cafeWest);
    this.addCollision(-29, 14, 0.6, 12);

    // East Side Wall
    const cafeEastGeo = new THREE.BoxGeometry(0.5, 4.5, 12);
    const cafeEast = new THREE.Mesh(cafeEastGeo, cafeWallMat);
    cafeEast.position.set(-15, 2.25, 14);
    cafeParkGroup.add(cafeEast);
    this.addCollision(-15, 14, 0.6, 12);

    // South Front Wall (Open doorway in center!)
    const frontLeftGeo = new THREE.BoxGeometry(4.5, 4.5, 0.5);
    const frontLeft = new THREE.Mesh(frontLeftGeo, cafeWallMat);
    frontLeft.position.set(-26.75, 2.25, 20);
    cafeParkGroup.add(frontLeft);
    this.addCollision(-26.75, 20, 4.6, 0.6);

    const frontRightGeo = new THREE.BoxGeometry(4.5, 4.5, 0.5);
    const frontRight = new THREE.Mesh(frontRightGeo, cafeWallMat);
    frontRight.position.set(-17.25, 2.25, 20);
    cafeParkGroup.add(frontRight);
    this.addCollision(-17.25, 20, 4.6, 0.6);
    // Opening at x: -24.5 to -19.5 (5m wide) allows seamless walking straight inside!

    // Café Overhead Sign
    const cafeSignGeo = new THREE.BoxGeometry(8, 1.4, 0.2);
    const cafeSign = new THREE.Mesh(cafeSignGeo, materialLibrary.get('cafeSignMat'));
    cafeSign.position.set(-22, 4.2, 20.2);
    cafeParkGroup.add(cafeSign);

    // Barista Espresso Counter inside
    const barGeo = new THREE.BoxGeometry(7, 1.2, 1.4);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(-24, 0.6, 10);
    cafeParkGroup.add(bar);
    this.addCollision(-24, 10, 7.2, 1.6);

    // Café Tables (positioned for generous walking aisles)
    const cTables = [[-18, 12], [-18, 17], [-24, 16]];
    cTables.forEach(([tx, tz]) => {
      const tGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.8, 12);
      const t = new THREE.Mesh(tGeo, materialLibrary.get('deskWood'));
      t.position.set(tx, 0.4, tz);
      cafeParkGroup.add(t);
      this.addCollision(tx, tz, 1.8, 1.8);
    });

    // 2. Willow Green Park (West: center [-30, 0, -10])
    const parkGrassGeo = new THREE.BoxGeometry(36, 0.1, 32);
    const parkGrass = new THREE.Mesh(parkGrassGeo, materialLibrary.get('parkGrass'));
    parkGrass.position.set(-30, 0.05, -10);
    cafeParkGroup.add(parkGrass);

    // Park Gazebo
    const gazeboGeo = new THREE.CylinderGeometry(3.5, 4, 3.2, 8, 1, true);
    const gazeboMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const gazebo = new THREE.Mesh(gazeboGeo, gazeboMat);
    gazebo.position.set(-32, 1.6, -10);
    cafeParkGroup.add(gazebo);
    this.addCollision(-32, -10, 7, 7);

    this.cityGroup.add(cafeParkGroup);
  }

  private buildMallAndArcade() {
    const commGroup = new THREE.Group();

    // 1. Enterable Galaxy Mall (East: center [25, 0, -18])
    // Polished Marble Atrium Floor
    const mallFloorGeo = new THREE.PlaneGeometry(24, 22);
    const mallFloor = new THREE.Mesh(mallFloorGeo, materialLibrary.get('mallFloor'));
    mallFloor.rotation.x = -Math.PI / 2;
    mallFloor.position.set(25, 0.08, -18);
    commGroup.add(mallFloor);

    // Mall Outer Perimeter Walls (North, East, South wings leaving wide 8m entrance at z = -7)
    const mallWallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });

    const mallNorthGeo = new THREE.BoxGeometry(24, 7, 0.8);
    const mallNorth = new THREE.Mesh(mallNorthGeo, mallWallMat);
    mallNorth.position.set(25, 3.5, -29);
    commGroup.add(mallNorth);
    this.addCollision(25, -29, 24, 0.8);

    const mallEastGeo = new THREE.BoxGeometry(0.8, 7, 22);
    const mallEast = new THREE.Mesh(mallEastGeo, mallWallMat);
    mallEast.position.set(37, 3.5, -18);
    commGroup.add(mallEast);
    this.addCollision(37, -18, 0.8, 22);

    const mallSouthLeftGeo = new THREE.BoxGeometry(8, 7, 0.8);
    const mallSouthLeft = new THREE.Mesh(mallSouthLeftGeo, mallWallMat);
    mallSouthLeft.position.set(17, 3.5, -7);
    commGroup.add(mallSouthLeft);
    this.addCollision(17, -7, 8, 0.8);

    const mallSouthRightGeo = new THREE.BoxGeometry(8, 7, 0.8);
    const mallSouthRight = new THREE.Mesh(mallSouthRightGeo, mallWallMat);
    mallSouthRight.position.set(33, 3.5, -7);
    commGroup.add(mallSouthRight);
    this.addCollision(33, -7, 8, 0.8);
    // Open entrance x: 21 to 29 at z = -7 allows walking directly from the street into the mall!

    const mallSignGeo = new THREE.BoxGeometry(10, 1.8, 0.2);
    const mallSign = new THREE.Mesh(mallSignGeo, materialLibrary.get('mallSignMat'));
    mallSign.position.set(25, 6.2, -6.8);
    commGroup.add(mallSign);

    // Boutique display units inside
    const boutiqueGeo = new THREE.BoxGeometry(5, 1.4, 1.6);
    const boutiqueMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.3 });
    const b1 = new THREE.Mesh(boutiqueGeo, boutiqueMat);
    b1.position.set(22, 0.7, -24);
    commGroup.add(b1);
    this.addCollision(22, -24, 5.2, 1.8);

    const b2 = new THREE.Mesh(boutiqueGeo, boutiqueMat);
    b2.position.set(30, 0.7, -24);
    commGroup.add(b2);
    this.addCollision(30, -24, 5.2, 1.8);

    // 2. Enterable Pixel Pulse Arcade (East: center [28, 0, 22])
    const arcadeFloorGeo = new THREE.PlaneGeometry(16, 14);
    const arcadeFloorMat = new THREE.MeshStandardMaterial({ color: 0x090918, roughness: 0.9 });
    const arcadeFloor = new THREE.Mesh(arcadeFloorGeo, arcadeFloorMat);
    arcadeFloor.rotation.x = -Math.PI / 2;
    arcadeFloor.position.set(28, 0.08, 22);
    commGroup.add(arcadeFloor);

    // Arcade Walls with open doorway at z = 15
    const arcWallMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.8 });
    const arcNorthGeo = new THREE.BoxGeometry(16, 5, 0.6);
    const arcNorth = new THREE.Mesh(arcNorthGeo, arcWallMat);
    arcNorth.position.set(28, 2.5, 29);
    commGroup.add(arcNorth);
    this.addCollision(28, 29, 16, 0.6);

    const arcEastGeo = new THREE.BoxGeometry(0.6, 5, 14);
    const arcEast = new THREE.Mesh(arcEastGeo, arcWallMat);
    arcEast.position.set(36, 2.5, 22);
    commGroup.add(arcEast);
    this.addCollision(36, 22, 0.6, 14);

    const arcSignGeo = new THREE.BoxGeometry(9, 1.6, 0.2);
    const arcadeSign = new THREE.Mesh(arcSignGeo, materialLibrary.get('arcadeSignMat'));
    arcadeSign.position.set(28, 4.6, 15);
    commGroup.add(arcadeSign);

    // Neon Arcade Cabinets row
    const cabGeo = new THREE.BoxGeometry(1.2, 2.2, 1.2);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.3 });
    const cabScreenGeo = new THREE.PlaneGeometry(0.9, 0.9);

    for (let i = 0; i < 4; i++) {
      const cx = 24 + i * 2.6;
      const cz = 26.5;
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(cx, 1.1, cz);
      commGroup.add(cab);

      const screen = new THREE.Mesh(cabScreenGeo, materialLibrary.get('arcadeScreenMat'));
      screen.position.set(cx, 1.35, cz - 0.61);
      screen.rotation.y = Math.PI;
      commGroup.add(screen);

      this.addCollision(cx, cz, 1.4, 1.4);
    }

    // Dance Rhythm Stage Mat
    const danceGeo = new THREE.BoxGeometry(3.5, 0.15, 3.5);
    const danceMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.5 });
    const danceStage = new THREE.Mesh(danceGeo, danceMat);
    danceStage.position.set(26, 0.12, 19);
    commGroup.add(danceStage);

    this.cityGroup.add(commGroup);
  }

  private buildWaterfront() {
    const waterGroup = new THREE.Group();

    // Wooden Boardwalk Deck (x = -70 to 70, z = 74 to 82)
    const bwGeo = new THREE.BoxGeometry(160, 0.4, 12);
    const bw = new THREE.Mesh(bwGeo, materialLibrary.get('boardwalkWood'));
    bw.position.set(0, 0.2, 75);
    bw.receiveShadow = true;
    waterGroup.add(bw);

    // Ocean Pier extending south into the sea (x = 0, z = 81 to 115)
    const pierGeo = new THREE.BoxGeometry(8, 0.4, 34);
    const pier = new THREE.Mesh(pierGeo, materialLibrary.get('boardwalkWood'));
    pier.position.set(0, 0.2, 98);
    pier.receiveShadow = true;
    waterGroup.add(pier);

    // Pier safety railings
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const railWestGeo = new THREE.BoxGeometry(0.2, 0.9, 34);
    const railWest = new THREE.Mesh(railWestGeo, railMat);
    railWest.position.set(-4, 0.65, 98);
    waterGroup.add(railWest);

    const railEastGeo = new THREE.BoxGeometry(0.2, 0.9, 34);
    const railEast = new THREE.Mesh(railEastGeo, railMat);
    railEast.position.set(4, 0.65, 98);
    waterGroup.add(railEast);

    // Beach Parasols and Loungers on the sand
    [-35, -20, 20, 35].forEach((sx) => {
      const parasol = this.createParasol(sx, 86);
      waterGroup.add(parasol);
      this.addCollision(sx, 86, 1.2, 1.2);
    });

    // Boardwalk Benches
    [-45, -15, 15, 45].forEach((bx) => {
      const bench = this.createBench(bx, 73, 0);
      waterGroup.add(bench);
      this.addCollision(bx, 73, 2.2, 1.2);
    });

    this.cityGroup.add(waterGroup);
  }

  private createParasol(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8);
    const poleMat = materialLibrary.get('metalLegs');
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, 1.2, 0);
    group.add(pole);

    const canopyGeo = new THREE.ConeGeometry(2.2, 0.8, 8);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 2.4, 0);
    group.add(canopy);

    group.position.set(x, 0, z);
    return group;
  }

  private buildFoliageAndProps() {
    const propsGroup = new THREE.Group();

    // Trees along avenues and in park
    const treePositions = [
      [-12, -70], [12, -70], [-12, -50], [12, -50],
      [-12, -30], [12, -30], [-12, -10], [12, -10],
      [-36, -2], [-24, -2], [-38, -18], [-26, -18],
      [14, 5], [14, 25], [14, 45],
      [-14, 5], [-14, 25], [-14, 45],
      [-60, 72], [60, 72],
    ];

    treePositions.forEach(([tx, tz]) => {
      const tree = this.createStylizedTree(tx, tz);
      propsGroup.add(tree);
      this.addCollision(tx, tz, 1.2, 1.2);
    });

    // Street Lamps along roads
    const lampPositions = [
      [-11, -55], [11, -55],
      [-11, -25], [11, -25],
      [-11, 15], [11, 15],
      [-11, 45], [11, 45],
    ];

    lampPositions.forEach(([lx, lz]) => {
      const lamp = this.createStreetLamp(lx, lz);
      propsGroup.add(lamp);
    });

    this.cityGroup.add(propsGroup);
  }

  private createStylizedTree(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.8, 8);
    const trunk = new THREE.Mesh(trunkGeo, materialLibrary.get('trunk'));
    trunk.position.set(0, 1.4, 0);
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage Tier 1
    const fol1Geo = new THREE.ConeGeometry(2.2, 2.6, 8);
    const fol1 = new THREE.Mesh(fol1Geo, materialLibrary.get('foliage'));
    fol1.position.set(0, 3.4, 0);
    fol1.castShadow = true;
    group.add(fol1);

    // Foliage Tier 2
    const fol2Geo = new THREE.ConeGeometry(1.6, 2.0, 8);
    const fol2 = new THREE.Mesh(fol2Geo, materialLibrary.get('foliage'));
    fol2.position.set(0, 4.6, 0);
    fol2.castShadow = true;
    group.add(fol2);

    group.position.set(x, 0, z);
    return group;
  }

  private createStreetLamp(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8);
    const poleMat = materialLibrary.get('metalLegs');
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, 2.1, 0);
    group.add(pole);

    const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xfde047,
      emissiveIntensity: 0.8,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 4.2, 0);
    group.add(head);

    const light = new THREE.PointLight(0xfef08a, 0, 12);
    light.visible = false;
    light.position.set(x, 4.2, z);
    this.streetLightGlows.push(light);
    this.cityGroup.add(light);

    group.position.set(x, 0, z);
    return group;
  }

  private buildVehicles() {
    const carData = [
      { x: -5, z: -55, color: 0xef4444, rot: 0 },
      { x: 5, z: -15, color: 0x3b82f6, rot: Math.PI },
      { x: -5, z: 25, color: 0xf59e0b, rot: 0 },
      { x: 5, z: 50, color: 0x10b981, rot: Math.PI },
    ];

    carData.forEach((c) => {
      const car = this.createCar(c.color);
      car.position.set(c.x, 0, c.z);
      car.rotation.y = c.rot;
      this.cars.push(car);
      this.cityGroup.add(car);
      this.addCollision(c.x, c.z, 2.2, 4.4);
    });
  }

  private createCar(color: number): THREE.Group {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.7, 4.0);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.55, 0);
    body.castShadow = true;
    group.add(body);

    const cabGeo = new THREE.BoxGeometry(1.7, 0.65, 2.2);
    const cabMat = materialLibrary.get('glass');
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 1.15, -0.2);
    group.add(cab);

    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const wPos = [
      [-1.0, 0.32, 1.2],
      [1.0, 0.32, 1.2],
      [-1.0, 0.32, -1.2],
      [1.0, 0.32, -1.2],
    ];
    wPos.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, wy, wz);
      group.add(w);
    });

    return group;
  }

  public updateEnvironment(delta: number) {
    if (this.animatedWater) {
      this.animatedWater.position.y = 0.08 + Math.sin(performance.now() * 0.002) * 0.03;
    }
  }

  /**
   * Ultra-fast spatial grid collision check (O(1) average lookup)
   */
  public checkCollision(newX: number, newZ: number, radius = 0.45): boolean {
    const minGx = Math.floor((newX - radius) / this.gridCellSize);
    const maxGx = Math.floor((newX + radius) / this.gridCellSize);
    const minGz = Math.floor((newZ - radius) / this.gridCellSize);
    const maxGz = Math.floor((newZ + radius) / this.gridCellSize);

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        const cellBoxes = this.spatialGrid.get(`${gx}_${gz}`);
        if (!cellBoxes) continue;

        for (let i = 0; i < cellBoxes.length; i++) {
          const b = cellBoxes[i];
          if (
            newX + radius > b.minX &&
            newX - radius < b.maxX &&
            newZ + radius > b.minZ &&
            newZ - radius < b.maxZ
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
