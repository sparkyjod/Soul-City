import React from 'react';
import { X, Check, Heart, User, MapPin } from 'lucide-react';
import { CharacterId } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { LOCATION_SPOTS } from '../data/locations';
import { soundSystem } from '../audio/soundSystem';

interface CharacterSelectModalProps {
  activeCharacterId: CharacterId;
  onSelectCharacter: (id: CharacterId) => void;
  onClose: () => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  activeCharacterId,
  onSelectCharacter,
  onClose,
}) => {
  const characters = Object.values(CHARACTERS);

  const handleChoose = (id: CharacterId) => {
    soundSystem.playClick();
    onSelectCharacter(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md select-none font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white">Choose Playable Friend</h2>
            <p className="text-xs text-slate-400">
              Switch perspective seamlessly without resetting the 3D world.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Characters Grid */}
        <div className="grid grid-cols-1 gap-4 overflow-y-auto py-5 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char, index) => {
            const isCurrent = char.id === activeCharacterId;
            const homeSpot = LOCATION_SPOTS[char.homeLocationId];

            return (
              <div
                key={char.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-4.5 transition ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white shadow-md"
                        style={{ backgroundColor: char.appearance.shirtColor }}
                      >
                        {char.nickname.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">{char.name}</h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {char.gender === 'male' ? 'Male' : 'Female'} • &ldquo;{char.nickname}&rdquo;
                        </span>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>

                  {/* Relationship Badge */}
                  <div className="mt-3">
                    {char.id === 'anirudh' && (
                      <div className="flex items-center gap-1 text-xs font-bold text-pink-400">
                        <Heart className="h-3.5 w-3.5 fill-pink-500" /> Boyfriend of Vaishnavi
                      </div>
                    )}
                    {char.id === 'vaishnavi' && (
                      <div className="flex items-center gap-1 text-xs font-bold text-pink-400">
                        <Heart className="h-3.5 w-3.5 fill-pink-500" /> Girlfriend of Anirudh
                      </div>
                    )}
                    {char.id === 'chirag' && (
                      <div className="flex items-center gap-1 text-xs font-bold text-pink-400">
                        <Heart className="h-3.5 w-3.5 fill-pink-500" /> Boyfriend of Shreya
                      </div>
                    )}
                    {char.id === 'shreya' && (
                      <div className="flex items-center gap-1 text-xs font-bold text-pink-400">
                        <Heart className="h-3.5 w-3.5 fill-pink-500" /> Girlfriend of Chirag
                      </div>
                    )}
                    {char.id === 'zannat' && (
                      <div className="text-xs font-bold text-purple-400">Single & Iconic</div>
                    )}
                    {char.id === 'shagun' && (
                      <div className="text-xs font-bold text-amber-400">Single & Foodie</div>
                    )}
                    {char.id === 'jatin' && (
                      <div className="text-xs font-bold text-red-400">Single & Athletic</div>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {char.bio}
                  </p>

                  {/* Traits */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {char.personalityTraits.map((t) => (
                      <span key={t} className="rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-300 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Home Location */}
                  {homeSpot && (
                    <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="h-3 w-3 text-indigo-400" /> {homeSpot.name}
                    </div>
                  )}
                </div>

                {/* Switch Action */}
                <button
                  onClick={() => handleChoose(char.id)}
                  disabled={isCurrent}
                  className={`mt-4 w-full rounded-xl py-2 text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    isCurrent
                      ? 'bg-slate-700/50 text-slate-400 cursor-default'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'
                  }`}
                >
                  {isCurrent ? (
                    'Currently Playing'
                  ) : (
                    <>
                      <span>Switch to {char.name}</span>
                      <span className="rounded bg-indigo-700/80 px-1.5 py-0.5 text-[10px] font-mono text-indigo-200">
                        Key {index + 1}
                      </span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
