import React, { useState } from 'react';
import { X, MessageSquare, Heart, Sparkles } from 'lucide-react';
import { CharacterId } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { getContextualDialogue, DialogueChoice } from '../data/dialogues';
import { soundSystem } from '../audio/soundSystem';

interface DialogueOverlayProps {
  speakerId: CharacterId;
  listenerId: CharacterId;
  locationId: string;
  hour: number;
  onClose: () => void;
  onAffinityIncrease: (charA: CharacterId, charB: CharacterId, amount: number) => void;
}

export const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
  speakerId,
  listenerId,
  locationId,
  hour,
  onClose,
  onAffinityIncrease,
}) => {
  const speaker = CHARACTERS[speakerId];
  const listener = CHARACTERS[listenerId];

  const dialogueNode = React.useMemo(() => {
    soundSystem.playDialogueChirp();
    return getContextualDialogue(speakerId, listenerId, locationId, hour);
  }, [speakerId, listenerId, locationId, hour]);

  const [activeReply, setActiveReply] = useState<string | null>(null);
  const [affinityGained, setAffinityGained] = useState<number | null>(null);

  const handleSelectChoice = (choice: DialogueChoice) => {
    soundSystem.playDialogueChirp();
    setActiveReply(choice.response);

    if (choice.affinityChange && choice.affinityChange > 0) {
      soundSystem.playAffinityUp();
      setAffinityGained(choice.affinityChange);
      onAffinityIncrease(speakerId, listenerId, choice.affinityChange);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-slate-950/40 backdrop-blur-sm select-none font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header with speaker badge & close */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
              style={{ backgroundColor: speaker.appearance.shirtColor }}
            >
              {speaker.nickname.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white">{speaker.name}</span>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  Talking in Casual Hinglish
                </span>
                {affinityGained && (
                  <span className="flex items-center gap-1 rounded-full bg-pink-500/20 px-2 py-0.5 text-[11px] font-extrabold text-pink-400 animate-pulse">
                    <Heart className="h-3 w-3 fill-pink-500" /> +{affinityGained} Friendship!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Conversing with {listener.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dialogue Bubble */}
        <div className="my-5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5">
          <p className="text-lg font-medium text-slate-100 leading-relaxed italic">
            &ldquo;{dialogueNode.text}&rdquo;
          </p>
          {activeReply && (
            <div className="mt-4 border-t border-indigo-500/20 pt-3">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                {speaker.name}&apos;s Reaction:
              </span>
              <p className="text-base font-medium text-emerald-300">
                &ldquo;{activeReply}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Player Choices */}
        {!activeReply && dialogueNode.choices && dialogueNode.choices.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Select Your Reply:
            </span>
            <div className="grid gap-2">
              {dialogueNode.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectChoice(choice)}
                  className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-700 hover:text-white"
                >
                  <span>{choice.text}</span>
                  {choice.affinityChange && (
                    <span className="flex items-center gap-1 text-xs text-pink-400">
                      <Heart className="h-3.5 w-3.5 fill-pink-500" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Finished close button if reply given */}
        {activeReply && (
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-500"
            >
              Continue Exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
