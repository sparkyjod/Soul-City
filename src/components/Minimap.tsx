import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Eye, EyeOff, Compass } from 'lucide-react';
import { CharacterId } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { GameEngine } from '../engine/GameEngine';
import {
  CENTERLINE,
  CROSSWALKS,
  HOME_PLOTS,
  LANDMARK_FOOTPRINTS,
  MINIMAP,
  ROADS,
  SIDEWALKS,
  TERRAIN,
  toHexColor,
} from '../world/worldData';

interface MinimapProps {
  engine: GameEngine | null;
  activeCharacterId: CharacterId;
}

export const Minimap: React.FC<MinimapProps> = ({ engine, activeCharacterId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const mapWidth = isExpanded ? 360 : 180;
  const mapHeight = isExpanded ? 360 : 180;

  useEffect(() => {
    let animId = 0;
    let lastRenderTime = 0;

    const renderMinimap = (now: number) => {
      // Throttle rendering to ~25fps (every 40ms) for high performance
      if (now - lastRenderTime >= 40) {
        lastRenderTime = now;
        drawMap();
      }
      animId = requestAnimationFrame(renderMinimap);
    };

    const drawMap = () => {
      const canvas = canvasRef.current;
      if (!canvas || !engine) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Coordinate mapping from 3D world to 2D canvas (bounds from worldData.MINIMAP)
      const { worldMinX, worldMaxX, worldMinZ, worldMaxZ, colors } = MINIMAP;

      const toScreenX = (wx: number) => ((wx - worldMinX) / (worldMaxX - worldMinX)) * w;
      const toScreenY = (wz: number) => ((wz - worldMinZ) / (worldMaxZ - worldMinZ)) * h;

      const fillWorldRect = (x: number, z: number, width: number, depth: number) => {
        const left = toScreenX(x - width / 2);
        const top = toScreenY(z - depth / 2);
        ctx.fillRect(left, top, toScreenX(x + width / 2) - left, toScreenY(z + depth / 2) - top);
      };

      // 1. Background Grass Terrain
      ctx.fillStyle = colors.grass;
      ctx.fillRect(0, 0, w, h);

      // 2. Ocean (worldData.TERRAIN.ocean), then 3. Sandy Beach on top of it
      ctx.fillStyle = colors.ocean;
      fillWorldRect(TERRAIN.ocean.centerX, TERRAIN.ocean.centerZ, TERRAIN.ocean.width, TERRAIN.ocean.depth);
      ctx.fillStyle = colors.sand;
      fillWorldRect(TERRAIN.sand.centerX, TERRAIN.sand.centerZ, TERRAIN.sand.width, TERRAIN.sand.depth);

      // 4. Roads, sidewalks & zebra crossings (shared road-network data)
      ctx.fillStyle = colors.asphalt;
      ROADS.forEach((road) => {
        const rectWidth = road.orientation === 'north_south' ? road.width : road.length;
        const rectDepth = road.orientation === 'north_south' ? road.length : road.width;
        fillWorldRect(road.centerX, road.centerZ, rectWidth, rectDepth);
      });

      ctx.fillStyle = colors.sidewalk;
      SIDEWALKS.forEach((sw) => fillWorldRect(sw.centerX, sw.centerZ, sw.width, sw.length));

      ctx.fillStyle = colors.crosswalk;
      CROSSWALKS.forEach((cw) => fillWorldRect(cw.x, cw.z, cw.width, cw.depth));

      // Road dashed yellow centerline
      ctx.strokeStyle = colors.centerline;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(toScreenX(CENTERLINE.x), toScreenY(CENTERLINE.zFrom));
      ctx.lineTo(toScreenX(CENTERLINE.x), toScreenY(CENTERLINE.zTo));
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Buildings & Landmarks (shared footprints from worldData)
      LANDMARK_FOOTPRINTS.forEach((f) => {
        ctx.fillStyle = f.color;
        if (f.shape === 'rect') {
          fillWorldRect(f.x, f.z, f.width, f.depth);
        } else {
          const rx = toScreenX(f.x + f.radius) - toScreenX(f.x);
          const ry = toScreenY(f.z + f.radius) - toScreenY(f.z);
          ctx.beginPath();
          ctx.ellipse(toScreenX(f.x), toScreenY(f.z), rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (f.label) {
          ctx.fillStyle = '#ffffff';
          ctx.font = isExpanded ? 'bold 11px sans-serif' : 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.label, toScreenX(f.x), toScreenY(f.z));
        }
      });

      // Football pitch outline (keeps the pitch readable at small sizes)
      const pitch = LANDMARK_FOOTPRINTS.find((f) => f.id === 'football_pitch');
      if (pitch && pitch.shape === 'rect') {
        const l = toScreenX(pitch.x - pitch.width / 2);
        const t = toScreenY(pitch.z - pitch.depth / 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(l, t, toScreenX(pitch.x + pitch.width / 2) - l, toScreenY(pitch.z + pitch.depth / 2) - t);
      }

      // Home plots, each in its owner's house accent color (shared data)
      HOME_PLOTS.forEach((home) => {
        ctx.fillStyle = toHexColor(home.color);
        fillWorldRect(home.x, home.z, home.width, home.depth);
      });

      // 6. Draw Vehicles (Yellow/Silver moving dots)
      if (engine.trafficSystem) {
        ctx.fillStyle = '#fde047';
        engine.trafficSystem.vehicles.forEach((v) => {
          const vx = toScreenX(v.mesh.position.x);
          const vy = toScreenY(v.mesh.position.z);
          ctx.beginPath();
          ctx.arc(vx, vy, isExpanded ? 3.5 : 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 7. Draw GPS Nav Waypoint Beacon (if active)
      if (engine.activeWaypoint) {
        const wx = toScreenX(engine.activeWaypoint.pos[0]);
        const wy = toScreenY(engine.activeWaypoint.pos[2]);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wx, wy, (Date.now() / 80) % 8 + 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(wx, wy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Draw NPC Friends (Colored circles)
      engine.characters.forEach((charHandle, charId) => {
        if (charId === activeCharacterId) return; // Draw player separately
        const cx = toScreenX(charHandle.root.position.x);
        const cy = toScreenY(charHandle.root.position.z);

        const profile = CHARACTERS[charId];
        ctx.fillStyle = profile ? profile.appearance.shirtColor : '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, isExpanded ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isExpanded && profile) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(profile.nickname, cx, cy - 6);
        }
      });

      // 9. Draw Active Player Character (Bright pointer with facing rotation)
      const playerHandle = engine.characters.get(activeCharacterId);
      if (playerHandle) {
        const px = toScreenX(playerHandle.root.position.x);
        const py = toScreenY(playerHandle.root.position.z);
        const rotY = playerHandle.root.rotation.y;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-rotY + Math.PI); // Orient to 2D canvas coordinates

        // Player directional arrow
        ctx.fillStyle = '#ec4899';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 5);
        ctx.lineTo(0, 2);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => cancelAnimationFrame(animId);
  }, [engine, activeCharacterId, isExpanded]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="pointer-events-auto absolute bottom-24 right-4 z-20 flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-xl backdrop-blur-md hover:bg-slate-800"
      >
        <Compass className="h-3.5 w-3.5 text-sky-400" /> Minimap [N]
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-24 right-4 z-20 flex flex-col items-end gap-1.5 select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Controls Bar */}
      <div className="flex items-center gap-1 rounded-t-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1 text-[11px] font-bold text-slate-300 shadow-md backdrop-blur-md">
        <span className="flex items-center gap-1 text-sky-400 mr-2">
          <Compass className="h-3 w-3" /> Radar
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded p-1 text-slate-400 hover:text-white"
          title={isExpanded ? 'Minimize Map' : 'Expand Map'}
        >
          {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="rounded p-1 text-slate-400 hover:text-white"
          title="Hide Minimap"
        >
          <EyeOff className="h-3 w-3" />
        </button>
      </div>

      {/* Canvas Frame */}
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-slate-700/90 bg-slate-950 shadow-2xl transition-all duration-300"
        style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
      >
        <canvas
          ref={canvasRef}
          width={mapWidth}
          height={mapHeight}
          className="cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        />
        {/* Cardinal North label */}
        <span className="absolute top-1 left-2 text-[9px] font-black text-white/70 tracking-widest">
          NORTH
        </span>
      </div>
    </div>
  );
};
