import React, { useState } from 'react';
import { X, MapPin, Compass, Navigation, Sparkles, Building, Coffee, GraduationCap, Waves, ShoppingBag, Footprints } from 'lucide-react';
import { CITY_DISTRICTS, LOCATION_SPOTS, FRIEND_SPECIAL_PLACES } from '../data/locations';
import { CHARACTERS } from '../data/characters';
import { CharacterId } from '../types/game';

interface WorldMapModalProps {
  onClose: () => void;
  onSetWaypoint?: (coords: [number, number, number], name: string, autoWalk: boolean) => void;
  onTeleportToLocation?: (coords: [number, number, number]) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  onClose,
  onSetWaypoint,
  onTeleportToLocation,
}) => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('school_campus');
  const district = CITY_DISTRICTS[selectedDistrictId];

  const districtSpots = Object.values(LOCATION_SPOTS).filter(
    (s) => s.districtId === selectedDistrictId
  );

  const getDistrictIcon = (id: string) => {
    switch (id) {
      case 'school_campus':
        return <GraduationCap className="h-4 w-4" />;
      case 'residential':
        return <Building className="h-4 w-4" />;
      case 'city_center':
        return <Compass className="h-4 w-4" />;
      case 'commercial_mall':
        return <ShoppingBag className="h-4 w-4" />;
      case 'cafe_and_park':
        return <Coffee className="h-4 w-4" />;
      case 'waterfront':
        return <Waves className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/75 backdrop-blur-md select-none font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-amber-400" />
              <h2 className="text-2xl font-black text-white">City Districts & Walking Guide</h2>
            </div>
            <p className="text-xs text-slate-400">
              Walk physically to any location via roads, sidewalks, and open interior doorways.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* District Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 py-3">
          {Object.values(CITY_DISTRICTS).map((d) => {
            const isSel = d.id === selectedDistrictId;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDistrictId(d.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                  isSel
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {getDistrictIcon(d.id)}
                {d.name.split('&')[0]}
              </button>
            );
          })}
        </div>

        {/* District Details & Spots */}
        <div className="overflow-y-auto py-5 space-y-5">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
            <h3 className="text-lg font-black text-white">{district.name}</h3>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">{district.description}</p>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              Locations in this District ({districtSpots.length})
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {districtSpots.map((spot) => (
                <div
                  key={spot.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-800/60 p-4 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h5 className="text-sm font-extrabold text-white">{spot.name}</h5>
                      {spot.isInterior && (
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                          Walkable Interior
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">{spot.description}</p>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {spot.activitiesAvailable.map((act) => (
                        <span
                          key={act}
                          className="rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-indigo-300"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Navigation Actions without requiring teleport */}
                  <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                    {onSetWaypoint && (
                      <button
                        onClick={() => {
                          onSetWaypoint(spot.position, spot.name, false);
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-indigo-600/90 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow"
                        title="Sets glowing 3D beacon marker in the world to walk towards manually"
                      >
                        <MapPin className="h-3.5 w-3.5" /> Set GPS Waypoint
                      </button>
                    )}

                    {onSetWaypoint && (
                      <button
                        onClick={() => {
                          onSetWaypoint(spot.position, spot.name, true);
                          onClose();
                        }}
                        className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600/90 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow"
                        title="Character physically walks along roads automatically to destination"
                      >
                        <Footprints className="h-3.5 w-3.5" /> Auto-Walk
                      </button>
                    )}

                    {onTeleportToLocation && (
                      <button
                        onClick={() => {
                          onTeleportToLocation(spot.position);
                          onClose();
                        }}
                        className="rounded-xl bg-slate-800 px-2.5 py-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        title="Fast travel option"
                      >
                        <Navigation className="h-3 w-3" /> Warp
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Friend-Specific Special Locations Section */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                Special Friend Memory Spots
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FRIEND_SPECIAL_PLACES.map((fPlace) => {
                const owner = CHARACTERS[fPlace.favoriteCharacterId as CharacterId];
                return (
                  <div key={fPlace.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: owner?.appearance.shirtColor || '#ffffff' }}
                        />
                        <span className="text-xs font-bold text-white">{fPlace.name}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300 leading-normal">{fPlace.description}</p>
                    </div>

                    {onSetWaypoint && (
                      <button
                        onClick={() => {
                          const spot = LOCATION_SPOTS[fPlace.locationId];
                          if (spot) {
                            onSetWaypoint(spot.position, fPlace.name, false);
                            onClose();
                          }
                        }}
                        className="mt-2.5 flex items-center justify-center gap-1 rounded-lg bg-slate-800 py-1 text-[11px] font-bold text-amber-300 hover:bg-slate-700"
                      >
                        <MapPin className="h-3 w-3" /> Walk to Memory Spot
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
