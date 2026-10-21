import React, { useState } from 'react';
import {
  Clock,
  Compass,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Users,
  MapPin,
  Heart,
  ChevronDown,
  ChevronUp,
  FastForward,
  Play,
  Pause,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { CharacterId, WeatherType, WorldClock } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { InteractionTarget } from '../engine/GameEngine';

interface HUDProps {
  clock: WorldClock;
  weather: WeatherType;
  currentDistrictName: string;
  activeCharacterId: CharacterId;
  nearbyTarget: InteractionTarget | null;
  onOpenDialogue: () => void;
  onOpenActivity: () => void;
  onOpenCharSelect: () => void;
  onOpenMap: () => void;
  onOpenRelationships: () => void;
  onSwitchCharacter: (id: CharacterId) => void;
  onRotateCamera: (delta: number) => void;
  onZoomCamera: (delta: number) => void;
  onSetTimeSpeed: (scale: number) => void;
  onToggleSound: () => boolean;
  isMuted: boolean;
  onReturnToMenu: () => void;
  activeWaypointInfo?: { name: string; dist: number; isAutoWalking: boolean } | null;
  onClearWaypoint?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  clock,
  weather,
  currentDistrictName,
  activeCharacterId,
  nearbyTarget,
  onOpenDialogue,
  onOpenActivity,
  onOpenCharSelect,
  onOpenMap,
  onOpenRelationships,
  onSwitchCharacter,
  onRotateCamera,
  onZoomCamera,
  onSetTimeSpeed,
  onToggleSound,
  isMuted,
  onReturnToMenu,
  activeWaypointInfo,
  onClearWaypoint,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const activeChar = CHARACTERS[activeCharacterId];

  // Format time
  const ampm = clock.hour >= 12 ? 'PM' : 'AM';
  const displayHour = clock.hour % 12 === 0 ? 12 : clock.hour % 12;
  const displayMin = clock.minute < 10 ? `0${clock.minute}` : clock.minute;
  const timeString = `${displayHour}:${displayMin} ${ampm}`;

  // Weather badge
  const weatherLabels: Record<WeatherType, { label: string; icon: string; bg: string }> = {
    sunny: { label: 'Sunny Day', icon: '☀️', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    golden_hour: { label: 'Golden Hour', icon: '🌅', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    overcast: { label: 'Mild Breeze', icon: '⛅', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    evening_glow: { label: 'Sunset Dusk', icon: '🌆', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    starlit_night: { label: 'Clear Night', icon: '🌙', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  };

  const weatherInfo = weatherLabels[weather] || weatherLabels.sunny;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* TOP HEADER BAR */}
      <div className="flex items-start justify-between">
        {/* Active Character Profile Badge */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/90 p-2.5 pr-4 shadow-xl backdrop-blur-md">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold shadow-inner"
            style={{ backgroundColor: activeChar.appearance.shirtColor, color: '#ffffff' }}
          >
            {activeChar.nickname.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-wide">{activeChar.name}</span>
              {activeChar.id === 'anirudh' && (
                <span className="flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/20 px-2 py-0.5 text-[11px] font-bold text-pink-300">
                  <Heart className="h-3 w-3 fill-pink-400" /> Vaishnavi
                </span>
              )}
              {activeChar.id === 'vaishnavi' && (
                <span className="flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/20 px-2 py-0.5 text-[11px] font-bold text-pink-300">
                  <Heart className="h-3 w-3 fill-pink-400" /> Anirudh
                </span>
              )}
              {activeChar.id === 'chirag' && (
                <span className="flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/20 px-2 py-0.5 text-[11px] font-bold text-pink-300">
                  <Heart className="h-3 w-3 fill-pink-400" /> Shreya
                </span>
              )}
              {activeChar.id === 'shreya' && (
                <span className="flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/20 px-2 py-0.5 text-[11px] font-bold text-pink-300">
                  <Heart className="h-3 w-3 fill-pink-400" /> Chirag
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium">Playing as {activeChar.nickname}</p>
          </div>
        </div>

        {/* Global Clock & District Location */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Clock Widget */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/90 px-4 py-2.5 shadow-xl backdrop-blur-md">
            <Clock className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="text-sm font-extrabold text-white tracking-wider font-mono">{timeString}</div>
              <div className="text-[11px] text-slate-400">Day {clock.dayCount}</div>
            </div>
            {/* Speed Pills */}
            <div className="flex items-center gap-1 border-l border-slate-700/80 pl-3">
              <button
                onClick={() => onSetTimeSpeed(clock.isPaused ? 3 : 0)}
                className={`rounded-lg p-1 text-xs transition ${
                  clock.isPaused ? 'bg-amber-500/30 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
                title={clock.isPaused ? 'Resume Time' : 'Pause Time'}
              >
                {clock.isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => onSetTimeSpeed(3)}
                className={`rounded px-1.5 py-0.5 text-[11px] font-bold transition ${
                  clock.timeScale === 3 && !clock.isPaused ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                1x
              </button>
              <button
                onClick={() => onSetTimeSpeed(12)}
                className={`rounded px-1.5 py-0.5 text-[11px] font-bold transition ${
                  clock.timeScale === 12 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                4x
              </button>
            </div>
          </div>

          {/* Weather & Location */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/90 px-4 py-2.5 shadow-xl backdrop-blur-md">
            <span className="text-base">{weatherInfo.icon}</span>
            <div>
              <div className="text-xs font-semibold text-slate-200">{weatherInfo.label}</div>
              <div className="flex items-center gap-1 text-[11px] text-indigo-300">
                <MapPin className="h-3 w-3" />
                <span className="max-w-[130px] truncate">{currentDistrictName}</span>
              </div>
            </div>
          </div>

          {/* Main Menu Button */}
          <button
            onClick={onReturnToMenu}
            className="rounded-2xl border border-slate-700/60 bg-slate-900/90 px-3.5 py-2.5 text-xs font-semibold text-slate-200 shadow-xl transition hover:border-indigo-500/50 hover:bg-slate-800"
          >
            Menu
          </button>
        </div>
      </div>

      {/* GPS WAYPOINT & AUTO-WALK GUIDANCE BANNER */}
      {activeWaypointInfo && (
        <div className="flex justify-center mt-2 pointer-events-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-sky-500/50 bg-slate-900/95 px-4 py-2 shadow-2xl backdrop-blur-md">
            <span className="flex h-3 w-3 rounded-full bg-sky-400 animate-ping" />
            <div className="text-xs">
              <span className="text-sky-300 font-extrabold uppercase tracking-wide">
                {activeWaypointInfo.isAutoWalking ? 'Auto-Walking To:' : 'GPS Waypoint:'}
              </span>{' '}
              <strong className="text-white">{activeWaypointInfo.name}</strong>
              <span className="text-slate-400 ml-2 font-mono">({activeWaypointInfo.dist}m away)</span>
              {activeWaypointInfo.isAutoWalking && (
                <span className="text-[11px] text-emerald-400 block font-medium">
                  Press W/A/S/D anytime to take manual control
                </span>
              )}
            </div>
            {onClearWaypoint && (
              <button
                onClick={onClearWaypoint}
                className="ml-2 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* CENTER INTERACTION PROMPT (Appears when near characters or interactive spots) */}
      <div className="flex justify-center">
        {nearbyTarget && (
          <div className="pointer-events-auto flex animate-bounce items-center gap-3 rounded-2xl border border-indigo-500/50 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-md">
            {nearbyTarget.type === 'character' ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-300">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Nearby Friend</div>
                  <div className="text-sm font-bold text-white">
                    Talk to <span className="text-indigo-400">{nearbyTarget.characterName}</span>
                  </div>
                </div>
                <button
                  onClick={onOpenDialogue}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-lg transition hover:bg-indigo-500"
                >
                  Press [E] Talk
                </button>
              </>
            ) : (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/30 text-emerald-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Location Activity</div>
                  <div className="text-sm font-bold text-white">{nearbyTarget.spotName}</div>
                </div>
                <button
                  onClick={onOpenActivity}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-lg transition hover:bg-emerald-500"
                >
                  Press [F] Interact
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM COLLAPSIBLE DOCK */}
      <div className="flex flex-col items-center">
        {/* Toggle Collapse Bar */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="pointer-events-auto flex items-center gap-1.5 rounded-t-xl border-x border-t border-slate-700/60 bg-slate-900/90 px-4 py-1 text-[11px] font-semibold text-slate-300 shadow-lg transition hover:bg-slate-800"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Show Controls
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Hide Controls
            </>
          )}
        </button>

        {!isDockCollapsed && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md max-w-4xl w-full">
            {/* Quick Friend Switcher */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Friends:
              </span>
              {(Object.keys(CHARACTERS) as CharacterId[]).map((id, index) => {
                const char = CHARACTERS[id];
                const isActive = id === activeCharacterId;
                return (
                  <button
                    key={id}
                    onClick={() => onSwitchCharacter(id)}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={`Switch to ${char.name} (Key ${index + 1})`}
                  >
                    <span className="text-[10px] text-slate-400 font-mono">[{index + 1}]</span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: char.appearance.shirtColor }}
                    />
                    {char.nickname}
                  </button>
                );
              })}
            </div>

            {/* Quick Modals Shortcuts */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenMap}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <Compass className="h-3.5 w-3.5 text-amber-400" /> City Map [M]
              </button>
              <button
                onClick={onOpenRelationships}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <Heart className="h-3.5 w-3.5 text-pink-400" /> Relations [R]
              </button>
              <button
                onClick={onOpenCharSelect}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <Users className="h-3.5 w-3.5 text-blue-400" /> Switch [TAB]
              </button>
            </div>

            {/* Camera & Audio Controls */}
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
              <button
                onClick={() => onRotateCamera(-Math.PI / 8)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                title="Rotate Camera Left (Q)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onRotateCamera(Math.PI / 8)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                title="Rotate Camera Right (E)"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onZoomCamera(-0.15)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onZoomCamera(0.15)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onToggleSound}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 ml-1"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5 text-red-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
