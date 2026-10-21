import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Eye, EyeOff, Compass } from 'lucide-react';
import { CharacterId } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { GameEngine } from '../engine/GameEngine';

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

      // Coordinate mapping from 3D world to 2D canvas
      // World range: X from -75 to 75 (span 150), Z from -115 to 105 (span 220)
      const worldMinX = -80;
      const worldMaxX = 80;
      const worldMinZ = -115;
      const worldMaxZ = 105;

      const toScreenX = (wx: number) => ((wx - worldMinX) / (worldMaxX - worldMinX)) * w;
      const toScreenY = (wz: number) => ((wz - worldMinZ) / (worldMaxZ - worldMinZ)) * h;

      // 1. Background Grass Terrain
      ctx.fillStyle = '#1e3a1e';
      ctx.fillRect(0, 0, w, h);

      // 2. Ocean at South (Z: 85 to 105)
      ctx.fillStyle = '#0284c7';
      const oceanY = toScreenY(85);
      ctx.fillRect(0, oceanY, w, h - oceanY);

      // 3. Sandy Beach (Z: 74 to 85)
      ctx.fillStyle = '#d97706';
      const sandY = toScreenY(74);
      ctx.fillRect(0, sandY, w, oceanY - sandY);

      // 4. Roads (Asphalt)
      ctx.fillStyle = '#334155';

      // Main North-South Central Avenue (x: -8 to 8, z: -55 to 65)
      const mainAveX = toScreenX(-8);
      const mainAveW = toScreenX(8) - mainAveX;
      const mainAveY = toScreenY(-55);
      const mainAveH = toScreenY(65) - mainAveY;
      ctx.fillRect(mainAveX, mainAveY, mainAveW, mainAveH);

      // School Avenue East-West (z = -55, x: -70 to 70)
      const schRdY = toScreenY(-58);
      const schRdH = toScreenY(-48) - schRdY;
      ctx.fillRect(toScreenX(-70), schRdY, toScreenX(70) - toScreenX(-70), schRdH);

      // Downtown Street East-West (z = 0, x: -70 to 70)
      const dtRdY = toScreenY(-6);
      const dtRdH = toScreenY(6) - dtRdY;
      ctx.fillRect(toScreenX(-70), dtRdY, toScreenX(70) - toScreenX(-70), dtRdH);

      // Coastal Drive East-West (z = 60, x: -70 to 70)
      const coastRdY = toScreenY(55);
      const coastRdH = toScreenY(65) - coastRdY;
      ctx.fillRect(toScreenX(-70), coastRdY, toScreenX(70) - toScreenX(-70), coastRdH);

      // Road dashed yellow centerlines
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(toScreenX(0), toScreenY(-54));
      ctx.lineTo(toScreenX(0), toScreenY(64));
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Buildings & Landmarks
      // School Main Building (Z: -108 to -64, X: -34 to 34)
      ctx.fillStyle = '#991b1b';
      const schX = toScreenX(-34);
      const schY = toScreenY(-108);
      const schW = toScreenX(34) - schX;
      const schH = toScreenY(-64) - schY;
      ctx.fillRect(schX, schY, schW, schH);
      ctx.fillStyle = '#ffffff';
      ctx.font = isExpanded ? 'bold 11px sans-serif' : 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Northwood High', schX + schW / 2, schY + schH / 2);

      // Football Pitch (East of School)
      ctx.fillStyle = '#16a34a';
      const fpX = toScreenX(38);
      const fpY = toScreenY(-102);
      ctx.fillRect(fpX, fpY, toScreenX(78) - fpX, toScreenY(-48) - fpY);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(fpX, fpY, toScreenX(78) - fpX, toScreenY(-48) - fpY);

      // Homes row (Z: -44 to -36)
      const homeXCoords = [-38, -26, -14, -5, 10, 25, 40];
      homeXCoords.forEach((hx) => {
        ctx.fillStyle = '#2563eb';
        const hxScreen = toScreenX(hx - 3.5);
        const hyScreen = toScreenY(-44);
        ctx.fillRect(hxScreen, hyScreen, toScreenX(hx + 3.5) - hxScreen, toScreenY(-36) - hyScreen);
      });

      // Central Plaza & Fountain (0, 0)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(toScreenX(0), toScreenY(0), isExpanded ? 8 : 4, 0, Math.PI * 2);
      ctx.fill();

      // The Central Bean Cafe (X: -22, Z: 15)
      ctx.fillStyle = '#b45309';
      const cafeX = toScreenX(-29);
      const cafeY = toScreenY(8);
      ctx.fillRect(cafeX, cafeY, toScreenX(-15) - cafeX, toScreenY(20) - cafeY);

      // Galaxy Mall (X: 25, Z: -18)
      ctx.fillStyle = '#831843';
      const mallX = toScreenX(14);
      const mallY = toScreenY(-28);
      ctx.fillRect(mallX, mallY, toScreenX(36) - mallX, toScreenY(-8) - mallY);

      // Pixel Pulse Arcade (X: 28, Z: 22)
      ctx.fillStyle = '#4338ca';
      const arcX = toScreenX(20);
      const arcY = toScreenY(15);
      ctx.fillRect(arcX, arcY, toScreenX(36) - arcX, toScreenY(29) - arcY);

      // Park (X: -30, Z: -10)
      ctx.fillStyle = '#15803d';
      const prkX = toScreenX(-46);
      const prkY = toScreenY(-24);
      ctx.fillRect(prkX, prkY, toScreenX(-14) - prkX, toScreenY(4) - prkY);

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
