import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, InteractionTarget } from './engine/GameEngine';
import { CharacterId, WorldClock } from './types/game';
import { CHARACTERS } from './data/characters';
import { CITY_DISTRICTS } from './data/locations';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { DialogueOverlay } from './components/DialogueOverlay';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { RelationshipView } from './components/RelationshipView';
import { WorldMapModal } from './components/WorldMapModal';
import { ActivitiesModal } from './components/ActivitiesModal';
import { soundSystem } from './audio/soundSystem';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeCharId, setActiveCharId] = useState<CharacterId>('anirudh');
  const [clock, setClock] = useState<WorldClock>({
    hour: 8,
    minute: 15,
    timeScale: 3,
    isPaused: false,
    dayCount: 1,
  });
  const [nearbyTarget, setNearbyTarget] = useState<InteractionTarget | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeWaypointInfo, setActiveWaypointInfo] = useState<{ name: string; dist: number; isAutoWalking: boolean } | null>(null);

  // Modals
  const [showDialogue, setShowDialogue] = useState<boolean>(false);
  const [showCharSelect, setShowCharSelect] = useState<boolean>(false);
  const [showWorldMap, setShowWorldMap] = useState<boolean>(false);
  const [showRelationships, setShowRelationships] = useState<boolean>(false);
  const [showActivities, setShowActivities] = useState<boolean>(false);

  // Dynamic affinity adjustments
  const [relationshipsOverride, setRelationshipsOverride] = useState<Record<string, number>>({});

  // 1. Mount Game Engine
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, activeCharId);
    engineRef.current = engine;

    engine.onNearbyTargetChange = (target) => {
      setNearbyTarget(target);
    };

    engine.onTimeChange = (newClock) => {
      setClock({ ...newClock });
    };

    engine.onWaypointDistanceChange = (dist, name) => {
      setActiveWaypointInfo({
        name,
        dist,
        isAutoWalking: engine.activeWaypoint?.isAutoWalking || false,
      });
    };

    engine.onActiveCharacterChange = (newId) => {
      setActiveCharId(newId);
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // 2. Global Hotkeys for shortcuts (E to Talk, F for Activities, TAB for switcher, M for Map, R for Relations)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if already in a modal
      if (showDialogue || showCharSelect || showWorldMap || showRelationships || showActivities) {
        if (e.code === 'Escape') {
          setShowDialogue(false);
          setShowCharSelect(false);
          setShowWorldMap(false);
          setShowRelationships(false);
          setShowActivities(false);
        }
        return;
      }

      if (!isPlaying) return;

      if (e.code === 'KeyE') {
        if (nearbyTarget && nearbyTarget.type === 'character') {
          setShowDialogue(true);
        }
      } else if (e.code === 'KeyF') {
        if (nearbyTarget && nearbyTarget.type === 'spot') {
          setShowActivities(true);
        }
      } else if (e.code === 'Tab') {
        e.preventDefault();
        setShowCharSelect(true);
      } else if (e.code === 'KeyM') {
        setShowWorldMap(true);
      } else if (e.code === 'KeyR') {
        setShowRelationships(true);
      } else if (e.code === 'Escape') {
        setIsPlaying(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isPlaying, nearbyTarget, showDialogue, showCharSelect, showWorldMap, showRelationships, showActivities]);

  // Handlers
  const handleSwitchCharacter = (newId: CharacterId) => {
    setActiveCharId(newId);
    if (engineRef.current) {
      engineRef.current.switchCharacter(newId);
    }
  };

  const handleRotateCamera = (delta: number) => {
    if (engineRef.current) {
      engineRef.current.rotateCamera(delta);
    }
  };

  const handleZoomCamera = (delta: number) => {
    if (engineRef.current) {
      engineRef.current.zoomCamera(delta);
    }
  };

  const handleSetTimeSpeed = (scale: number) => {
    if (engineRef.current) {
      engineRef.current.setTimeScale(scale);
      setClock({ ...engineRef.current.clock });
    }
  };

  const handleToggleSound = () => {
    const muted = soundSystem.toggleMute();
    setIsMuted(muted);
    return muted;
  };

  const handleAffinityIncrease = (charA: CharacterId, charB: CharacterId, amount: number) => {
    const key = `${charA}_${charB}`;
    setRelationshipsOverride((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + amount,
    }));
  };

  const handleSetWaypoint = (coords: [number, number, number], name: string, autoWalk: boolean) => {
    if (engineRef.current) {
      engineRef.current.setWaypoint(coords, name, autoWalk);
      setActiveWaypointInfo({ name, dist: 0, isAutoWalking: autoWalk });
    }
  };

  const handleClearWaypoint = () => {
    if (engineRef.current) {
      engineRef.current.clearWaypoint();
      setActiveWaypointInfo(null);
    }
  };

  const handleTeleport = (coords: [number, number, number]) => {
    if (engineRef.current) {
      const activeChar = engineRef.current.characters.get(activeCharId);
      if (activeChar) {
        activeChar.root.position.set(coords[0], coords[1], coords[2]);
      }
    }
  };

  // Determine current district name
  const currentDistrictName = CITY_DISTRICTS['school_campus'].name;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0" />

      {/* Main Menu Overlay (when not in direct gameplay) */}
      {!isPlaying && (
        <MainMenu
          onStartGame={() => {
            soundSystem.playClick();
            setIsPlaying(true);
          }}
          selectedCharacterId={activeCharId}
          onSelectCharacter={handleSwitchCharacter}
          onOpenCharSelectModal={() => setShowCharSelect(true)}
          onOpenWorldMap={() => setShowWorldMap(true)}
          onOpenRelationships={() => setShowRelationships(true)}
          onOpenActivities={() => setShowActivities(true)}
          clock={clock}
        />
      )}

      {/* In-Game HUD (when playing) */}
      {isPlaying && (
        <HUD
          clock={clock}
          weather={engineRef.current ? engineRef.current.weather : 'sunny'}
          currentDistrictName={currentDistrictName}
          activeCharacterId={activeCharId}
          nearbyTarget={nearbyTarget}
          activeWaypointInfo={activeWaypointInfo}
          onClearWaypoint={handleClearWaypoint}
          onOpenDialogue={() => setShowDialogue(true)}
          onOpenActivity={() => setShowActivities(true)}
          onOpenCharSelect={() => setShowCharSelect(true)}
          onOpenMap={() => setShowWorldMap(true)}
          onOpenRelationships={() => setShowRelationships(true)}
          onSwitchCharacter={handleSwitchCharacter}
          onRotateCamera={handleRotateCamera}
          onZoomCamera={handleZoomCamera}
          onSetTimeSpeed={handleSetTimeSpeed}
          onToggleSound={handleToggleSound}
          isMuted={isMuted}
          onReturnToMenu={() => setIsPlaying(false)}
        />
      )}

      {/* Casual Hinglish Dialogue Modal */}
      {showDialogue && nearbyTarget && nearbyTarget.characterId && (
        <DialogueOverlay
          speakerId={nearbyTarget.characterId}
          listenerId={activeCharId}
          locationId="school_canteen"
          hour={clock.hour}
          onClose={() => setShowDialogue(false)}
          onAffinityIncrease={handleAffinityIncrease}
        />
      )}

      {/* Character Switcher Modal */}
      {showCharSelect && (
        <CharacterSelectModal
          activeCharacterId={activeCharId}
          onSelectCharacter={handleSwitchCharacter}
          onClose={() => setShowCharSelect(false)}
        />
      )}

      {/* Friendship & Relationship Matrix Modal */}
      {showRelationships && (
        <RelationshipView
          onClose={() => setShowRelationships(false)}
          relationshipsOverride={relationshipsOverride}
        />
      )}

      {/* City Districts & World Guide Modal */}
      {showWorldMap && (
        <WorldMapModal
          onClose={() => setShowWorldMap(false)}
          onSetWaypoint={handleSetWaypoint}
          onTeleportToLocation={handleTeleport}
        />
      )}

      {/* Interactive Activities & Mini-Games Modal */}
      {showActivities && (
        <ActivitiesModal
          spotId={nearbyTarget?.spotId}
          activeCharacterId={activeCharId}
          onClose={() => setShowActivities(false)}
          onReward={(amt) => {
            handleAffinityIncrease(activeCharId, 'chirag', amt);
          }}
        />
      )}
    </div>
  );
}
