import React, { useState } from 'react';
import { X, Sparkles, Trophy, Coffee, Flame, CheckCircle, RotateCcw } from 'lucide-react';
import { CharacterId } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { soundSystem } from '../audio/soundSystem';

interface ActivitiesModalProps {
  spotId?: string;
  activeCharacterId: CharacterId;
  onClose: () => void;
  onReward: (affinityGain: number) => void;
}

export const ActivitiesModal: React.FC<ActivitiesModalProps> = ({
  spotId,
  activeCharacterId,
  onClose,
  onReward,
}) => {
  const char = CHARACTERS[activeCharacterId];

  // Mini-game states
  const [selectedActivity, setSelectedActivity] = useState<string>(
    spotId === 'sports_football' ? 'football' : spotId === 'arcade_zone' ? 'arcade' : 'canteen'
  );

  // Football shootout game
  const [penaltyTarget, setPenaltyTarget] = useState<number | null>(null);
  const [goalResult, setGoalResult] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  // Arcade reaction game
  const [arcadeScore, setArcadeScore] = useState(1200);
  const [arcadeFeedback, setArcadeFeedback] = useState<string | null>(null);

  // Canteen / Food activity
  const [canteenOrder, setCanteenOrder] = useState<string | null>(null);

  const handleShoot = (target: number) => {
    setPenaltyTarget(target);
    const keeperChoice = Math.floor(Math.random() * 3);
    if (target !== keeperChoice) {
      soundSystem.playAffinityUp();
      setGoalResult('GOOOAL! Spectacular top-corner strike!');
      setScore((s) => s + 1);
      onReward(3);
    } else {
      soundSystem.playClick();
      setGoalResult('Saved by the goalkeeper! Unlucky shot.');
    }
  };

  const handlePlayArcade = () => {
    soundSystem.playArcadeChime();
    const gain = Math.floor(Math.random() * 500) + 300;
    setArcadeScore((s) => s + gain);
    setArcadeFeedback(`Speed combo x3! +${gain} Pts!`);
    onReward(4);
  };

  const handleOrderFood = (item: string) => {
    soundSystem.playAffinityUp();
    setCanteenOrder(item);
    onReward(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/75 backdrop-blur-md select-none font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h2 className="text-2xl font-black text-white">City Activities & Mini-Games</h2>
            </div>
            <p className="text-xs text-slate-400">
              Engage in group pastimes as <strong className="text-white">{char.name}</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Activity Selector Tabs */}
        <div className="flex gap-2 border-b border-slate-800 py-3">
          <button
            onClick={() => setSelectedActivity('canteen')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedActivity === 'canteen' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            🥟 Canteen Feast
          </button>
          <button
            onClick={() => setSelectedActivity('football')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedActivity === 'football' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            ⚽ Football Shootout
          </button>
          <button
            onClick={() => setSelectedActivity('arcade')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedActivity === 'arcade' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            🕹️ Arcade Neon Racer
          </button>
        </div>

        {/* Activity Content Body */}
        <div className="py-6 overflow-y-auto">
          {selectedActivity === 'football' && (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
                <h3 className="text-lg font-black text-white">Penalty Shootout vs School Goalie</h3>
                <p className="mt-1 text-xs text-slate-300">
                  Pick where {char.name} aims the shot! Avoid the keeper’s dive.
                </p>
                <div className="mt-3 text-sm font-extrabold text-emerald-400">
                  Goals Scored: {score}
                </div>
              </div>

              {/* Goalpost Target Buttons */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                {['Top Left', 'Center High', 'Top Right'].map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleShoot(idx)}
                    className="rounded-2xl border border-slate-700 bg-slate-800/90 py-5 text-xs font-bold text-slate-200 transition hover:border-emerald-500 hover:bg-slate-700 active:scale-95 shadow-md"
                  >
                    ⚽ {label}
                  </button>
                ))}
              </div>

              {goalResult && (
                <div className="mt-4 rounded-xl bg-slate-800 p-3 text-sm font-bold text-emerald-300 animate-in fade-in">
                  {goalResult}
                </div>
              )}
            </div>
          )}

          {selectedActivity === 'arcade' && (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5">
                <h3 className="text-lg font-black text-white">Pixel Pulse - Neon Racer</h3>
                <p className="mt-1 text-xs text-slate-300">
                  Smash the boost button to clock fastest lap times!
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-2xl font-black text-purple-300 font-mono">
                  <Trophy className="h-6 w-6 text-yellow-400" /> {arcadeScore.toLocaleString()} PTS
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePlayArcade}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl hover:from-purple-500 hover:to-indigo-500 active:scale-95"
                >
                  ⚡ HIT NITRO BOOST [SPACE]
                </button>
              </div>

              {arcadeFeedback && (
                <div className="mt-2 text-sm font-bold text-amber-300">{arcadeFeedback}</div>
              )}
            </div>
          )}

          {selectedActivity === 'canteen' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-5">
                <h3 className="text-lg font-black text-white">Northwood Campus Canteen Menu</h3>
                <p className="mt-1 text-xs text-slate-300">
                  Pick a snack for {char.name} and share with whoever is sitting nearby.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Garma-Garam Samosa & Masala Chai', cost: '₹30', quote: 'Classic combo, impossible to beat!' },
                  { name: 'Veg Cheese Grilled Sandwich', cost: '₹50', quote: 'Melted cheese and spicy mint chutney.' },
                  { name: 'Chilled Cold Coffee with Cream', cost: '₹40', quote: 'Perfect refreshment between classes.' },
                  { name: 'Cheese Maggi with Extra Peri-Peri', cost: '₹45', quote: 'The ultimate friend group feast!' },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleOrderFood(item.name)}
                    className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/80 p-4 text-left transition hover:border-orange-500 hover:bg-slate-700"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{item.name}</span>
                        <span className="text-xs font-bold text-orange-400 font-mono">{item.cost}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300 italic">{item.quote}</p>
                    </div>
                    <span className="mt-3 text-[11px] font-bold text-indigo-400">Order for Squad →</span>
                  </button>
                ))}
              </div>

              {canteenOrder && (
                <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 text-center text-xs font-bold text-emerald-300">
                  Ordered <strong className="text-white">{canteenOrder}</strong>! All friends nearby enjoyed the treat (+2 Friendship).
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            Close Activities
          </button>
        </div>
      </div>
    </div>
  );
};
