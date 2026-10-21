import React from 'react';
import { Play, Users, Map, Heart, Sparkles, Settings, Sparkle } from 'lucide-react';
import { CharacterId, WorldClock } from '../types/game';
import { CHARACTERS } from '../data/characters';

interface MainMenuProps {
  onStartGame: () => void;
  selectedCharacterId: CharacterId;
  onSelectCharacter: (id: CharacterId) => void;
  onOpenCharSelectModal: () => void;
  onOpenWorldMap: () => void;
  onOpenRelationships: () => void;
  onOpenActivities: () => void;
  clock: WorldClock;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  selectedCharacterId,
  onSelectCharacter,
  onOpenCharSelectModal,
  onOpenWorldMap,
  onOpenRelationships,
  onOpenActivities,
  clock,
}) => {
  const char = CHARACTERS[selectedCharacterId];

  const ampm = clock.hour >= 12 ? 'PM' : 'AM';
  const displayHour = clock.hour % 12 === 0 ? 12 : clock.hour % 12;
  const displayMin = clock.minute < 10 ? `0${clock.minute}` : clock.minute;
  const timeStr = `${displayHour}:${displayMin} ${ampm}`;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-transparent select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* BRAND & HEADER */}
      <div className="max-w-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg">
            <Sparkle className="h-4 w-4" />
          </span>
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
            Social Life Simulation
          </span>
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl drop-shadow-md">
          FRIEND<span className="text-indigo-500">VERSE</span>
        </h1>
        <p className="text-sm font-medium text-slate-300 italic">
          &ldquo;Your world. Your people. Your story.&rdquo;
        </p>
      </div>

      {/* SELECTED CHARACTER SHOWCASE CARD & CONTROLS */}
      <div className="max-w-md space-y-6">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">Selected Playable Friend</div>
              <h2 className="text-3xl font-black text-white">{char.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                <span>{timeStr}</span>
                <span>•</span>
                <span>School Day</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">At Home</span>
              </div>
            </div>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg"
              style={{ backgroundColor: char.appearance.shirtColor }}
            >
              {char.nickname.slice(0, 2)}
            </div>
          </div>

          <div className="py-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Relationship Status:</span>
              {char.id === 'anirudh' && (
                <span className="flex items-center gap-1 font-bold text-pink-400">
                  <Heart className="h-3.5 w-3.5 fill-pink-500" /> Dating Vaishnavi
                </span>
              )}
              {char.id === 'vaishnavi' && (
                <span className="flex items-center gap-1 font-bold text-pink-400">
                  <Heart className="h-3.5 w-3.5 fill-pink-500" /> Dating Anirudh
                </span>
              )}
              {char.id === 'chirag' && (
                <span className="flex items-center gap-1 font-bold text-pink-400">
                  <Heart className="h-3.5 w-3.5 fill-pink-500" /> Dating Shreya
                </span>
              )}
              {char.id === 'shreya' && (
                <span className="flex items-center gap-1 font-bold text-pink-400">
                  <Heart className="h-3.5 w-3.5 fill-pink-500" /> Dating Chirag
                </span>
              )}
              {char.id === 'zannat' && <span className="font-bold text-purple-400">Single & Confident</span>}
              {char.id === 'shagun' && <span className="font-bold text-amber-400">Single & Food Loving</span>}
              {char.id === 'jatin' && <span className="font-bold text-red-400">Single & Focused</span>}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic">&ldquo;{char.tagline}&rdquo;</p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {char.personalityTraits.map((t) => (
                <span key={t} className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Character Quick Switcher Buttons */}
          <div className="border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
              <span>Choose Friend to Play As:</span>
              <span className="text-indigo-400 font-mono">Keys [1–7]</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(CHARACTERS) as CharacterId[]).map((id, index) => {
                const c = CHARACTERS[id];
                const isSel = id === selectedCharacterId;
                return (
                  <button
                    key={id}
                    onClick={() => onSelectCharacter(id)}
                    className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-bold transition ${
                      isSel
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 font-mono">{index + 1}.</span>
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.appearance.shirtColor }} />
                    <span className="truncate">{c.nickname}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN MENU ACTION BUTTONS */}
        <div className="space-y-2.5">
          <button
            onClick={onStartGame}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 py-4 text-base font-extrabold text-white shadow-xl shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98]"
          >
            <Play className="h-5 w-5 fill-white" /> ENTER 3D WORLD
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onOpenCharSelectModal}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/90 py-3 text-xs font-bold text-slate-200 shadow-md backdrop-blur-md transition hover:bg-slate-800"
            >
              <Users className="h-4 w-4 text-indigo-400" /> All 7 Friends
            </button>
            <button
              onClick={onOpenRelationships}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/90 py-3 text-xs font-bold text-slate-200 shadow-md backdrop-blur-md transition hover:bg-slate-800"
            >
              <Heart className="h-4 w-4 text-pink-400" /> Relationships
            </button>
            <button
              onClick={onOpenWorldMap}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/90 py-3 text-xs font-bold text-slate-200 shadow-md backdrop-blur-md transition hover:bg-slate-800"
            >
              <Map className="h-4 w-4 text-emerald-400" /> City Guide
            </button>
            <button
              onClick={onOpenActivities}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/90 py-3 text-xs font-bold text-slate-200 shadow-md backdrop-blur-md transition hover:bg-slate-800"
            >
              <Sparkles className="h-4 w-4 text-amber-400" /> Activities
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER INFO */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div>3D Living World • 7 Friends • Autonomous NPC Schedules • Hinglish Banter</div>
        <div>WASD Walk • Shift Run • Q/E Camera • 1–7 Switch Friend • M Map • R Bonds</div>
      </div>
    </div>
  );
};
