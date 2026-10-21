export type CharacterId = 'anirudh' | 'vaishnavi' | 'chirag' | 'shreya' | 'zannat' | 'shagun' | 'jatin';

export type Gender = 'male' | 'female';

export interface AppearanceData {
  hairColor: string;
  hairStyle: 'short_textured' | 'wavy_long' | 'slick_fade' | 'straight_long' | 'curly_bob' | 'messy_crop';
  shirtColor: string;
  pantsColor: string;
  shoesColor: string;
  skinTone: string;
  jacketColor?: string;
  accessory?: 'glasses' | 'watch' | 'headband' | 'necklace' | 'earrings' | 'cap';
  height: number; // e.g. 1.7 to 1.85
}

export interface RelationshipStatus {
  targetId: CharacterId;
  type: 'romantic' | 'best_friend' | 'close_friend' | 'friend';
  label: string; // e.g., "Girlfriend", "Boyfriend", "Bro / Bestie", "Friend"
  affinityScore: number; // 0 - 100
  trustLevel: number; // 0 - 100
  recentMemory?: string;
}

export interface RoutineEntry {
  startHour: number; // e.g. 7 for 07:00
  endHour: number;   // e.g. 9 for 09:00
  locationId: string;
  activityName: string;
  activityType: 'idle' | 'walking' | 'studying' | 'eating' | 'talking' | 'playing' | 'shopping' | 'chilling';
  targetPos: [number, number, number];
  dialogueMood: 'sleepy' | 'focused' | 'hyped' | 'hungry' | 'chill' | 'romantic';
}

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  nickname: string;
  gender: Gender;
  tagline: string;
  bio: string;
  appearance: AppearanceData;
  relationships: Record<string, RelationshipStatus>;
  schedule: RoutineEntry[];
  homeLocationId: string;
  favoritePlaces: string[];
  personalityTraits: string[];
  hobbies: string[];
  dialogueStyle: {
    greeting: string[];
    slang: string[];
    schoolComplaints: string[];
    foodReactions: string[];
  };
}

export interface CityDistrict {
  id: string;
  name: string;
  description: string;
  color: string;
  centerPos: [number, number, number];
}

export interface LocationSpot {
  id: string;
  name: string;
  districtId: string;
  description: string;
  position: [number, number, number];
  size: [number, number, number];
  isInterior?: boolean;
  parentBuildingId?: string;
  activitiesAvailable: string[];
  specialOwnerId?: CharacterId; // e.g., "Anirudh's House", "Chirag's Garage"
}

export type WeatherType = 'sunny' | 'golden_hour' | 'overcast' | 'evening_glow' | 'starlit_night';

export interface WorldClock {
  hour: number;
  minute: number;
  timeScale: number; // 1 = real-time, 60 = 1 sec is 1 min, etc.
  isPaused: boolean;
  dayCount: number;
}
