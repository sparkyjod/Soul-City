# SoulSociety

SoulSociety is a 3D open-world social life simulation. Seven friends — Anirudh,
Vaishnavi, Chirag, Shreya, Zannat, Shagun and Jatin — live in a small city with a
school, residential row, central plaza, mall, arcade, café, park and boardwalk.
They follow daily schedules, walk between buildings on their own, and react to
the character you play.

## Running

```bash
bun install
bun run dev        # http://localhost:3000
bun run build      # production bundle
bun test           # headless simulation + world-data tests
bun run lint       # tsc --noEmit
```

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Walk |
| `Shift` | Run |
| `Q` / `E` | Rotate camera |
| Mouse wheel | Zoom |
| `1`–`7` | Switch playable friend |
| `M` | World map |
| `R` | Relationships |

## Architecture

The world is data-first: `src/world/worldData.ts` is the single source of truth
for roads, crosswalks, signals, home plots, footprints and the pedestrian
graph. Both the 3D city (`cityBuilder.ts`) and the 2D minimap (`Minimap.tsx`)
render from that data, so they cannot drift apart.

| Module | Responsibility |
| --- | --- |
| `worldData.ts` | Roads, intersections, stop lines, crosswalks (with walk phases), signals, footprints, home plots, pedestrian graph |
| `roadNetwork.ts` | Drivable lane network derived from the roads: lane segments, travel direction, stop lines, junctions, turn movements and their geometric conflicts |
| `trafficSignals.ts` | Cycle controller: NS green → amber → all-red → EW green → amber → all-red, offset per junction |
| `trafficSimulation.ts` | Pure vehicle simulation: lane following, signal obedience, safe gaps, junction exclusion, pedestrian right-of-way |
| `pedestrianCrossings.ts` | Crossing zones derived from the crosswalk data: walk phases, occupancy, and which turn paths sweep a zebra |
| `trafficSystem.ts` | Mirrors the simulation onto car meshes and signal heads |
| `navigationNetwork.ts` | Pedestrian graph with BFS routing and the `RouteFollower` used by schedules |
| `movement.ts` | Collision-aware stepping (`moveWithSlide`, `moveToward`, `findClearSpot`) |
| `engine/GameEngine.ts` | Clock, schedules, NPC routing, player control, camera, traffic hook-up |

### Traffic

Cars drive on the lane network only, in the correct direction for left-hand
traffic, stop before the painted stop line on red, wait for a conflicting
movement to clear, keep `CAR_LENGTH + SAFE_GAP` to the car ahead, and never
enter a junction whose receiving lane is still occupied.

### Pedestrians and right of way

Every crosswalk belongs to an intersection and carries the signal phase its
walkers move with. A friend approaching a zebra stops at the kerb until that
phase is green, crosses without being stranded mid-road, and cars hold at their
stop line while anyone is still on a zebra their turn path crosses. Cars also
brake for a walker standing directly in their path (shared-space plaza,
jaywalkers, the player), so nobody is driven through.

If a destination is unreachable in the pedestrian graph, a friend stays put and
retries later; the game never teleports a character to fake a successful walk.

## Tests

`bun test` covers world-data invariants, lane geometry, connectivity, signal
phases, stop-line behaviour, car following, pedestrian crossing phases, and
vehicle yielding to occupied crossings.
