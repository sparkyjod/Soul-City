import React, { useState } from 'react';
import { X, Heart, Users, Shield, Award, Sparkles } from 'lucide-react';
import { CharacterId } from '../types/game';
import { CHARACTERS } from '../data/characters';

interface RelationshipViewProps {
  onClose: () => void;
  relationshipsOverride?: Record<string, number>; // dynamic affinity boosts
}

export const RelationshipView: React.FC<RelationshipViewProps> = ({ onClose, relationshipsOverride = {} }) => {
  const [selectedCharId, setSelectedCharId] = useState<CharacterId>('anirudh');
  const selectedChar = CHARACTERS[selectedCharId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/75 backdrop-blur-md select-none font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <h2 className="text-2xl font-black text-white">Friendship & Relationship Matrix</h2>
            </div>
            <p className="text-xs text-slate-400">
              Friend bonds, trust levels, and dynamic affinities based on interactions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Character Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 py-3">
          {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
            const c = CHARACTERS[id];
            const isSel = id === selectedCharId;
            return (
              <button
                key={id}
                onClick={() => setSelectedCharId(id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                  isSel
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.appearance.shirtColor }} />
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Selected Friend's Relationship Breakdown */}
        <div className="overflow-y-auto py-5">
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-800/60 p-4 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white shadow-md"
                style={{ backgroundColor: selectedChar.appearance.shirtColor }}
              >
                {selectedChar.nickname.slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{selectedChar.name}&apos;s Circle</h3>
                <p className="text-xs text-slate-300 italic">&ldquo;{selectedChar.tagline}&rdquo;</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
              {selectedChar.id === 'anirudh' && (
                <span className="text-xs font-bold text-pink-400 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 fill-pink-500" /> Dating Vaishnavi
                </span>
              )}
              {selectedChar.id === 'vaishnavi' && (
                <span className="text-xs font-bold text-pink-400 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 fill-pink-500" /> Dating Anirudh
                </span>
              )}
              {selectedChar.id === 'chirag' && (
                <span className="text-xs font-bold text-pink-400 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 fill-pink-500" /> Dating Shreya
                </span>
              )}
              {selectedChar.id === 'shreya' && (
                <span className="text-xs font-bold text-pink-400 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 fill-pink-500" /> Dating Chirag
                </span>
              )}
              {selectedChar.id === 'zannat' && <span className="text-xs font-bold text-purple-400">Single</span>}
              {selectedChar.id === 'shagun' && <span className="text-xs font-bold text-amber-400">Single</span>}
              {selectedChar.id === 'jatin' && <span className="text-xs font-bold text-red-400">Single</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(selectedChar.relationships).map(([targetId, rel]) => {
              const targetFriend = CHARACTERS[targetId as CharacterId];
              if (!targetFriend) return null;

              const bonusKey = `${selectedCharId}_${targetId}`;
              const bonus = relationshipsOverride[bonusKey] || 0;
              const affinity = Math.min(100, rel.affinityScore + bonus);

              const isRomantic = rel.type === 'romantic';

              return (
                <div
                  key={targetId}
                  className={`rounded-2xl border p-4 transition ${
                    isRomantic
                      ? 'border-pink-500/50 bg-pink-950/20 shadow-md shadow-pink-500/10'
                      : 'border-slate-800 bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner"
                        style={{ backgroundColor: targetFriend.appearance.shirtColor }}
                      >
                        {targetFriend.nickname.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white">{targetFriend.name}</h4>
                        <span
                          className={`text-xs font-semibold ${
                            isRomantic ? 'text-pink-400 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {rel.label}
                        </span>
                      </div>
                    </div>
                    {isRomantic && <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />}
                  </div>

                  {/* Meters */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold text-slate-300 mb-1">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-pink-400" /> Friendship Affinity
                        </span>
                        <span className="font-mono text-indigo-300 font-bold">{affinity}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isRomantic ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${affinity}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-slate-300 mb-1">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-emerald-400" /> Trust Level
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">{rel.trustLevel}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${rel.trustLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
