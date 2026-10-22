import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CharacterId, RoutineEntry, WeatherType, WorldClock } from '../types/game';
import { CHARACTERS, CHARACTER_LIST } from '../data/characters';
import { LOCATION_SPOTS } from '../data/locations';
import { CityBuilder } from '../world/cityBuilder';
import { CharacterBuilder, CharacterMeshHandle } from '../world/characterBuilder';
import { TrafficSystem } from '../world/trafficSystem';
import { RouteFollower, navigationNetwork } from '../world/navigationNetwork';
import { findClearSpot, moveToward, moveWithSlide } from '../world/movement';
import { soundSystem } from '../audio/soundSystem';

export interface InteractionTarget {
  type: 'character' | 'spot';
  characterId?: CharacterId;
  characterName?: string;
  spotId?: string;
  spotName?: string;
  activities?: string[];
  distance: number;
}

/** Live route-following state for one NPC friend. */
interface NpcRouteState {
  follower: RouteFollower;
  /** Watchdog: seconds without getting closer to the current waypoint. */
  stallTimer: number;
  /** Closest distance reached for the waypoint currently being walked to. */
  bestDist: number;
  /** Waypoint index `bestDist` refers to. */
  waypointIndex: number;
  /** Committed side while rounding an obstacle: +1 / -1 / 0 (free). */
  avoidSide: number;
  /** Seconds committed to that side; flips if it stops paying off. */
  sideAge: number;
}

export interface NavWaypoint {
  pos: [number, number, number];
  name: string;
  isAutoWalking: boolean;
}

export class GameEngine {
  private static _tempPlayerPos = new THREE.Vector3();

  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cityBuilder: CityBuilder;
  public trafficSystem: TrafficSystem;

  // Characters
  public characters: Map<CharacterId, CharacterMeshHandle> = new Map();
  public activePlayerId: CharacterId = 'anirudh';
  public onActiveCharacterChange?: (newId: CharacterId) => void;

  // NPC schedule travel (Stage 2): friends physically walk their routines.
  private npcRoutes: Map<CharacterId, NpcRouteState> = new Map();
  private scheduleQueue: CharacterId[] = [];
  /** Seconds until a stalled NPC is allowed to re-plan its route. */
  private routeRetryTimers: Map<CharacterId, number> = new Map();
  private static readonly NPC_WALK_SPEED = 4.0;
  private static readonly NPC_STALL_TIMEOUT = 3.0;
  private static readonly NPC_RETRY_DELAY = 1.5;
  private static readonly BODY_RADIUS = 0.45;

  // Camera settings
  public cameraOffset = new THREE.Vector3(14, 18, 14);
  public cameraAngle = Math.PI / 4; // 45 deg isometric
  public cameraZoom = 1.0;
  private cameraLookTarget = new THREE.Vector3();

  // Input & Player Movement
  private keysPressed: Record<string, boolean> = {};
  public isRunning = false;
  private footstepTimer = 0;

  // Navigation & In-world GPS Waypoint
  public activeWaypoint: NavWaypoint | null = null;
  public waypointBeaconGroup: THREE.Group | null = null;
  public onWaypointDistanceChange?: (dist: number, name: string) => void;

  // World clock
  public clock: WorldClock = {
    hour: 8,
    minute: 15,
    timeScale: 3,
    isPaused: false,
    dayCount: 1,
  };
  private clockAccumulator = 0;

  // Weather & Lighting
  public weather: WeatherType = 'sunny';
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private ambientFill: THREE.AmbientLight;

  // Interactive target in range
  public nearbyTarget: InteractionTarget | null = null;
  public onNearbyTargetChange?: (target: InteractionTarget | null) => void;
  public onTimeChange?: (clock: WorldClock) => void;

  // Performance & Throttle counters
  private frameCount = 0;
  private isDestroyed = false;
  private lastFrameTime = 0;
  private animFrameId = 0;
  private isSoftwareGl = false;

  constructor(mountElement: HTMLElement, initialPlayerId: CharacterId = 'anirudh') {
    this.activePlayerId = initialPlayerId;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.007);

    // 2. Camera (Isometric Perspective)
    const aspect = mountElement.clientWidth / mountElement.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 450);
    this.updateCameraTransform();

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(mountElement.clientWidth, mountElement.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    mountElement.appendChild(this.renderer.domElement);

    // Procedural Studio Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    this.sunLight.position.set(40, 60, 30);
    this.sunLight.castShadow = !this.isSoftwareGl;
    if (this.sunLight.castShadow) {
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 180;
      const d = 40;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x475569, 0.85);
    this.scene.add(this.hemiLight);

    this.ambientFill = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientFill);

    // 5. Build City
    this.cityBuilder = new CityBuilder();
    this.scene.add(this.cityBuilder.cityGroup);

    // 6. Traffic System (Real road lanes, school boundary bollards, intelligent turning)
    this.trafficSystem = new TrafficSystem();
    this.scene.add(this.trafficSystem.group);

    // 7. Spawn all 7 characters
    this.spawnCharacters();

    // 7b. Queue initial schedule routing so friends head to their current routine
    this.queueAllScheduleUpdates();

    // 8. Input listeners
    this.setupInputs();

    // 9. Start game loop
    this.lastFrameTime = performance.now();
    this.tick = this.tick.bind(this);
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private spawnCharacters() {
    CHARACTER_LIST.forEach((profile) => {
      const handle = CharacterBuilder.createCharacter(profile);
      const initialRoutine = this.getCharacterCurrentRoutine(profile.id);
      const pos = initialRoutine ? initialRoutine.targetPos : [0, 0, 0];
      handle.root.position.set(pos[0], pos[1], pos[2]);

      this.scene.add(handle.root);
      this.characters.set(profile.id, handle);
    });

    const playerHandle = this.characters.get(this.activePlayerId);
    if (playerHandle) {
      this.cameraLookTarget.copy(playerHandle.root.position);
      this.updateCameraTransform();
    }
  }

  private setupInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = true;

    // Keys 1–7 character switching
    const charKeys: Record<string, CharacterId> = {
      Digit1: 'anirudh',
      Numpad1: 'anirudh',
      Digit2: 'vaishnavi',
      Numpad2: 'vaishnavi',
      Digit3: 'chirag',
      Numpad3: 'chirag',
      Digit4: 'shreya',
      Numpad4: 'shreya',
      Digit5: 'zannat',
      Numpad5: 'zannat',
      Digit6: 'shagun',
      Numpad6: 'shagun',
      Digit7: 'jatin',
      Numpad7: 'jatin',
    };

    if (charKeys[e.code]) {
      const targetId = charKeys[e.code];
      if (targetId !== this.activePlayerId) {
        this.switchCharacter(targetId);
        this.onActiveCharacterChange?.(targetId);
      }
      return;
    }

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.isRunning = true;
    }
    // Cancel auto-walk when user manually controls movement
    if (
      this.activeWaypoint?.isAutoWalking &&
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)
    ) {
      this.activeWaypoint.isAutoWalking = false;
    }
    // Rotate camera with Q / E
    if (e.code === 'KeyQ') {
      this.cameraAngle -= Math.PI / 16;
    }
    if (e.code === 'KeyE') {
      this.cameraAngle += Math.PI / 16;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.isRunning = false;
    }
  };

  private handleResize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    this.camera.aspect = parent.clientWidth / parent.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
  };

  public switchCharacter(newId: CharacterId) {
    if (!this.characters.has(newId)) return;
    const previousId = this.activePlayerId;
    this.activePlayerId = newId;

    // The newly-controlled character is player-driven from now on.
    this.npcRoutes.delete(newId);
    this.routeRetryTimers.delete(newId);
    // The previous character becomes NPC-driven again and resumes their routine.
    if (previousId !== newId) {
      this.scheduleQueue.push(previousId);
    }

    soundSystem.playClick();
  }

  public setTimeScale(scale: number) {
    this.clock.timeScale = scale;
    this.clock.isPaused = scale === 0;
  }

  public setTime(hour: number, minute: number) {
    this.clock.hour = hour;
    this.clock.minute = minute;
  }

  public rotateCamera(deltaAngle: number) {
    this.cameraAngle += deltaAngle;
  }

  public zoomCamera(deltaZoom: number) {
    this.cameraZoom = Math.max(0.6, Math.min(2.0, this.cameraZoom + deltaZoom));
  }

  // --- WAYPOINT & AUTO-WALK SYSTEM ---
  public setWaypoint(pos: [number, number, number], name: string, autoWalk = false) {
    this.activeWaypoint = { pos, name, isAutoWalking: autoWalk };

    if (!this.waypointBeaconGroup) {
      this.waypointBeaconGroup = new THREE.Group();
      const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, 14, 12, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 7;
      this.waypointBeaconGroup.add(beam);

      const diamondGeo = new THREE.OctahedronGeometry(1.0, 0);
      const diamondMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
      });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      diamond.position.y = 14;
      this.waypointBeaconGroup.add(diamond);

      this.scene.add(this.waypointBeaconGroup);
    }

    this.waypointBeaconGroup.position.set(pos[0], 0, pos[2]);
    this.waypointBeaconGroup.visible = true;
    soundSystem.playArcadeChime();
  }

  public clearWaypoint() {
    this.activeWaypoint = null;
    if (this.waypointBeaconGroup) {
      this.waypointBeaconGroup.visible = false;
    }
  }

  private updateCameraTransform() {
    const radius = 22 * this.cameraZoom;
    const height = 18 * this.cameraZoom;

    const camX = this.cameraLookTarget.x + Math.sin(this.cameraAngle) * radius;
    const camZ = this.cameraLookTarget.z + Math.cos(this.cameraAngle) * radius;
    const camY = this.cameraLookTarget.y + height;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(
      this.cameraLookTarget.x,
      this.cameraLookTarget.y + 1.2,
      this.cameraLookTarget.z
    );
  }

  private getCharacterCurrentRoutine(charId: CharacterId): RoutineEntry | undefined {
    const profile = CHARACTERS[charId];
    if (!profile) return undefined;
    const curHour = this.clock.hour;
    return (
      profile.schedule.find((s) => curHour >= s.startHour && curHour < s.endHour) ||
      profile.schedule[0]
    );
  }

  private updatePlayer(delta: number) {
    const player = this.characters.get(this.activePlayerId);
    if (!player) return;

    let worldDirX = 0;
    let worldDirZ = 0;
    let isMoving = false;

    // Check manual keyboard inputs
    let moveX = 0;
    let moveZ = 0;

    if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) moveZ += 1;
    if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) moveZ -= 1;
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) moveX -= 1;
    if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      const nx = moveX / len;
      const nz = moveZ / len;

      const forwardX = -Math.sin(this.cameraAngle);
      const forwardZ = -Math.cos(this.cameraAngle);
      const rightX = Math.cos(this.cameraAngle);
      const rightZ = -Math.sin(this.cameraAngle);

      worldDirX = rightX * nx + forwardX * nz;
      worldDirZ = rightZ * nx + forwardZ * nz;
      isMoving = true;
    } else if (this.activeWaypoint?.isAutoWalking) {
      const wp = this.activeWaypoint.pos;
      const curX = player.root.position.x;
      const curZ = player.root.position.z;
      const dist = Math.hypot(wp[0] - curX, wp[2] - curZ);

      if (dist > 1.6) {
        worldDirX = (wp[0] - curX) / dist;
        worldDirZ = (wp[2] - curZ) / dist;
        isMoving = true;
      } else {
        this.activeWaypoint.isAutoWalking = false;
        soundSystem.playAffinityUp();
      }
    }

    if (isMoving) {
      const speed = (this.isRunning ? 8.5 : 4.5) * delta;

      // Collision-aware step (slides along walls and can escape furniture).
      const walked = moveWithSlide(
        player.root.position.x,
        player.root.position.z,
        worldDirX,
        worldDirZ,
        speed,
        GameEngine.BODY_RADIUS,
        (x, z, r) => this.cityBuilder.checkCollision(x, z, r)
      );
      player.root.position.x = walked.x;
      player.root.position.z = walked.z;

      const targetAngle = Math.atan2(worldDirX, worldDirZ);
      player.root.rotation.y = THREE.MathUtils.lerp(player.root.rotation.y, targetAngle, 0.2);

      player.setAnimation('walking');

      this.footstepTimer += delta;
      if (this.footstepTimer > (this.isRunning ? 0.24 : 0.38)) {
        soundSystem.playFootstep();
        this.footstepTimer = 0;
      }
    } else {
      player.setAnimation('idle');
      this.footstepTimer = 0;
    }

    this.cameraLookTarget.lerp(player.root.position, 0.1);
    this.updateCameraTransform();

    if (this.activeWaypoint) {
      const curDist = Math.hypot(
        this.activeWaypoint.pos[0] - player.root.position.x,
        this.activeWaypoint.pos[2] - player.root.position.z
      );
      this.onWaypointDistanceChange?.(Math.round(curDist), this.activeWaypoint.name);

      if (this.waypointBeaconGroup) {
        this.waypointBeaconGroup.rotation.y += delta * 1.5;
      }
    }
  }

  // --- NPC SCHEDULE TRAVEL (Stage 2) ---
  /** Queue every non-player friend for (re)routing to their current routine. */
  private queueAllScheduleUpdates() {
    this.routeRetryTimers.clear();
    this.scheduleQueue = CHARACTER_LIST.map((p) => p.id).filter((id) => id !== this.activePlayerId);
  }

  /** Compute a graph path from an NPC's position to their routine destination. */
  private routeCharacterToRoutine(charId: CharacterId) {
    const npc = this.characters.get(charId);
    const routine = this.getCharacterCurrentRoutine(charId);
    if (!npc || !routine) return;

    const targetX = routine.targetPos[0];
    const targetZ = routine.targetPos[2];
    // Lift the body out of furniture it may be standing in (e.g. a chair or a
    // doorway it was nudged into) before planning a path from that spot.
    const clearSpot = findClearSpot(
      npc.root.position.x,
      npc.root.position.z,
      GameEngine.BODY_RADIUS,
      (x, z, r) => this.cityBuilder.checkCollision(x, z, r)
    );
    if (clearSpot) {
      npc.root.position.x = clearSpot.x;
      npc.root.position.z = clearSpot.z;
    }

    const dist = Math.hypot(targetX - npc.root.position.x, targetZ - npc.root.position.z);

    if (dist < 1.6) {
      // Already at the destination — no route needed.
      this.npcRoutes.delete(charId);
      return;
    }

    const path = navigationNetwork.findPath(
      npc.root.position.x,
      npc.root.position.z,
      targetX,
      targetZ
    );

    this.npcRoutes.set(charId, {
      follower: new RouteFollower(path),
      stallTimer: 0,
      bestDist: Infinity,
      waypointIndex: -1,
      avoidSide: 0,
      sideAge: 0,
    });
  }

  /**
   * Advance NPC route-following. Pathfinding is event-driven (hour changes and
   * character switches only, staggered across frames) — never per-frame BFS.
   */
  private updateNPCMovement(delta: number) {
    // Re-queue friends whose route stalled, once their retry delay elapsed.
    if (this.routeRetryTimers.size > 0) {
      this.routeRetryTimers.forEach((timeLeft, charId) => {
        const remaining = timeLeft - delta;
        if (remaining > 0) {
          this.routeRetryTimers.set(charId, remaining);
        } else {
          this.routeRetryTimers.delete(charId);
          if (charId !== this.activePlayerId && !this.scheduleQueue.includes(charId)) {
            this.scheduleQueue.push(charId);
          }
        }
      });
    }

    // Staggered routing: at most one path computation every few frames.
    if (this.scheduleQueue.length > 0 && this.frameCount % 3 === 0) {
      const charId = this.scheduleQueue.shift()!;
      if (charId !== this.activePlayerId) {
        this.routeCharacterToRoutine(charId);
      }
    }

    this.npcRoutes.forEach((state, charId) => {
      if (charId === this.activePlayerId) return; // player takes over
      const npc = this.characters.get(charId);
      if (!npc) {
        this.npcRoutes.delete(charId);
        return;
      }

      const stepDist = GameEngine.NPC_WALK_SPEED * delta;
      const step = state.follower.advance(npc.root.position.x, npc.root.position.z, stepDist);

      if (state.follower.done) {
        this.npcRoutes.delete(charId);
        this.routeRetryTimers.delete(charId);
        return;
      }

      // Collision-aware step: rounds furniture instead of jamming on it.
      const waypoint = state.follower.currentWaypoint;
      const walked = waypoint
        ? moveToward(
            npc.root.position.x,
            npc.root.position.z,
            waypoint.x,
            waypoint.z,
            stepDist,
            GameEngine.BODY_RADIUS,
            (x, z, r) => this.cityBuilder.checkCollision(x, z, r),
            state.avoidSide
          )
        : moveWithSlide(
            npc.root.position.x,
            npc.root.position.z,
            step.dirX,
            step.dirZ,
            stepDist,
            GameEngine.BODY_RADIUS,
            (x, z, r) => this.cityBuilder.checkCollision(x, z, r)
          );
      npc.root.position.x = walked.x;
      npc.root.position.z = walked.z;

      // Remember which way we went round the obstruction so the next frame
      // commits to the same side instead of dithering in front of it.
      if (walked.deviation !== 0) {
        state.avoidSide = Math.sign(walked.deviation);
      } else if (walked.moved) {
        state.avoidSide = 0;
        state.sideAge = 0;
      }

      // Face travel direction and show the walking animation.
      const targetAngle = Math.atan2(step.dirX, step.dirZ);
      npc.root.rotation.y = THREE.MathUtils.lerp(npc.root.rotation.y, targetAngle, 0.15);
      npc.setAnimation('walking');

      // Stall watchdog measures progress towards the waypoint (not raw
      // movement, so an NPC shuffling side to side still counts as stuck).
      if (!waypoint) return;
      if (state.waypointIndex !== state.follower.progressIndex) {
        state.waypointIndex = state.follower.progressIndex;
        state.bestDist = Infinity;
        state.stallTimer = 0;
      }
      const distToWaypoint = Math.hypot(
        waypoint.x - npc.root.position.x,
        waypoint.z - npc.root.position.z
      );
      if (distToWaypoint < state.bestDist - 0.02) {
        state.bestDist = distToWaypoint;
        state.stallTimer = 0;
        state.sideAge = 0;
      } else {
        state.stallTimer += delta;
        state.sideAge += delta;
        // This side of the obstacle is not working: try the other one.
        if (state.sideAge > 0.6) {
          state.avoidSide = state.avoidSide === 1 ? -1 : 1;
          state.sideAge = 0;
        }
        if (state.stallTimer > GameEngine.NPC_STALL_TIMEOUT) {
          // Wedged: drop the route, lift the body out of the obstruction and
          // re-plan shortly instead of standing there for the rest of the hour.
          this.npcRoutes.delete(charId);
          const clearSpot = findClearSpot(
            npc.root.position.x,
            npc.root.position.z,
            GameEngine.BODY_RADIUS,
            (x, z, r) => this.cityBuilder.checkCollision(x, z, r)
          );
          if (clearSpot) {
            npc.root.position.x = clearSpot.x;
            npc.root.position.z = clearSpot.z;
          }
          if (!this.routeRetryTimers.has(charId)) {
            this.routeRetryTimers.set(charId, GameEngine.NPC_RETRY_DELAY);
          }
        }
      }
    });
  }

  /**
   * Lightweight ambient NPC updates:
   * Keep world populated with natural animations (studying, eating, talking, idle)
   * without running expensive per-frame pathfinding graph searches.
   */
  private updateAutonomousNPCs(_delta: number) {
    this.characters.forEach((npc, charId) => {
      if (charId === this.activePlayerId) return;
      if (this.npcRoutes.has(charId)) return; // en route: movement loop drives animation

      const routine = this.getCharacterCurrentRoutine(charId);
      if (!routine) return;

      if (routine.activityType === 'studying' || routine.activityType === 'eating') {
        npc.setAnimation('sitting');
      } else if (routine.activityType === 'talking') {
        npc.setAnimation('talking');
      } else {
        npc.setAnimation('idle');
      }
    });
  }

  private updateClock(delta: number) {
    if (this.clock.isPaused) return;

    this.clockAccumulator += delta * this.clock.timeScale;
    if (this.clockAccumulator >= 1.0) {
      this.clockAccumulator = 0;
      this.clock.minute += 1;
      if (this.clock.minute >= 60) {
        this.clock.minute = 0;
        this.clock.hour += 1;

        if (this.clock.hour === 8 || this.clock.hour === 11 || this.clock.hour === 14) {
          soundSystem.playSchoolBell();
        }

        if (this.clock.hour >= 24) {
          this.clock.hour = 0;
          this.clock.dayCount += 1;
        }

        // Hour changed: every friend re-routes to their new routine destination.
        this.queueAllScheduleUpdates();
      }
      this.onTimeChange?.(this.clock);
      this.updateDayNightCycle();
    }
  }

  private updateDayNightCycle() {
    const h = this.clock.hour + this.clock.minute / 60;
    let sunIntensity = 1.8;
    let hemiIntensity = 0.85;
    let fogColor = new THREE.Color(0x93c5fd);

    if (h >= 6 && h < 8) {
      sunIntensity = 1.2;
      this.sunLight.color.setHex(0xfde68a);
      this.hemiLight.color.setHex(0xfef08a);
      fogColor = new THREE.Color(0xfbcfe8);
      this.weather = 'golden_hour';
    } else if (h >= 8 && h < 17) {
      sunIntensity = 1.8;
      this.sunLight.color.setHex(0xfffbeb);
      this.hemiLight.color.setHex(0xbfdbfe);
      fogColor = new THREE.Color(0xbae6fd);
      this.weather = 'sunny';
    } else if (h >= 17 && h < 20) {
      sunIntensity = 1.0;
      this.sunLight.color.setHex(0xf97316);
      this.hemiLight.color.setHex(0xf472b6);
      fogColor = new THREE.Color(0xfdba74);
      this.weather = 'evening_glow';
    } else {
      sunIntensity = 0.6;
      this.sunLight.color.setHex(0x38bdf8);
      this.hemiLight.color.setHex(0x1e293b);
      fogColor = new THREE.Color(0x0f172a);
      this.weather = 'starlit_night';
    }

    this.sunLight.intensity = sunIntensity;
    this.hemiLight.intensity = hemiIntensity;
    this.scene.fog?.color.copy(fogColor);

    const isNight = h < 6 || h >= 18;
    this.cityBuilder.streetLightGlows.forEach((light: THREE.PointLight) => {
      light.visible = isNight;
      light.intensity = isNight ? 1.2 : 0;
    });
  }

  private checkNearbyInteractions() {
    const player = this.characters.get(this.activePlayerId);
    if (!player) return;

    const pPos = player.root.position;
    let closestTarget: InteractionTarget | null = null;
    let closestDist = Infinity;

    // Check characters
    this.characters.forEach((npc, charId) => {
      if (charId === this.activePlayerId) return;
      const dist = Math.hypot(
        npc.root.position.x - pPos.x,
        npc.root.position.z - pPos.z
      );
      if (dist < 3.2 && dist < closestDist) {
        closestDist = dist;
        closestTarget = {
          type: 'character',
          characterId: charId,
          characterName: npc.profile.name,
          distance: dist,
        };
      }
    });

    // Check location spots for activities
    if (!closestTarget) {
      for (const [spotId, spot] of Object.entries(LOCATION_SPOTS)) {
        const dist = Math.hypot(spot.position[0] - pPos.x, spot.position[2] - pPos.z);
        if (dist < 5.2 && dist < closestDist) {
          closestDist = dist;
          closestTarget = {
            type: 'spot',
            spotId,
            spotName: spot.name,
            activities: spot.activitiesAvailable,
            distance: dist,
          };
        }
      }
    }

    if (
      (this.nearbyTarget?.characterId !== closestTarget?.characterId) ||
      (this.nearbyTarget?.spotId !== closestTarget?.spotId)
    ) {
      this.nearbyTarget = closestTarget;
      this.onNearbyTargetChange?.(this.nearbyTarget);
    }
  }

  private tick(now: number) {
    if (this.isDestroyed) return;

    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;
    this.frameCount++;

    const player = this.characters.get(this.activePlayerId);
    const playerPos = player ? player.root.position : GameEngine._tempPlayerPos;

    // Center shadow frustum around player for razor-sharp shadows without waste
    if (this.sunLight.castShadow && player) {
      this.sunLight.position.set(playerPos.x + 35, 55, playerPos.z + 25);
      this.sunLight.target.position.set(playerPos.x, 0, playerPos.z);
      this.sunLight.target.updateMatrixWorld();
    }

    // 1. Clock & schedules
    this.updateClock(delta);

    // 2. Player movement & navigation
    this.updatePlayer(delta);

    // 3. NPC schedule travel (staggered routing) & routine animations
    this.updateNPCMovement(delta);
    this.updateAutonomousNPCs(delta);

    // 4. Distance-based LOD animation processing for smooth 60fps
    this.characters.forEach((c, id) => {
      if (id === this.activePlayerId) {
        c.update(delta);
        return;
      }
      const dist = Math.hypot(c.root.position.x - playerPos.x, c.root.position.z - playerPos.z);
      if (dist < 35) {
        c.update(delta);
      } else if (dist < 75) {
        if (this.frameCount % 2 === 0) c.update(delta * 2);
      } else {
        if (this.frameCount % 4 === 0) {
          c.animTime += delta * 4;
        }
      }
    });

    // 5. Update intelligent traffic (lane following, safety barriers, anti-overlap)
    this.trafficSystem.update(delta, playerPos);

    // 6. Update environment water
    this.cityBuilder.updateEnvironment(delta);

    // 7. Proximity check (throttled to every 6 frames)
    if (this.frameCount % 6 === 0) {
      this.checkNearbyInteractions();
    }

    // 8. Render
    this.renderer.render(this.scene, this.camera);

    this.animFrameId = requestAnimationFrame(this.tick);
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
