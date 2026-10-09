export type Tab = 'home' | 'studio' | 'library' | 'twin' | 'profile';
export type Stage = 'understand' | 'mission' | 'speak' | 'feedback';
export type SceneId = 'desk' | 'jury' | 'cafe';

export type Chat = {
  id: string;
  sender: 'coach' | 'user';
  text: string;
};

export type Phrase = {
  id: string;
  en: string;
  tr: string;
  context: string;
  used: boolean;
};

export type Twin = {
  directness: number;
  warmth: number;
  humour: number;
};

export type Scene = {
  id: SceneId;
  icon: string;
  title: string;
  place: string;
  confidence: number;
  objects: string[];
  context: string;
  mission: string;
  objective: string;
  partner: string;
  opening: string;
  phrase: Phrase;
  color: string;
};

export type Evaluation = {
  answer: string;
  grammar: string;
  corrected: string;
  natural: string;
  style: string;
  accuracy: number;
  naturalness: number;
  voice: number;
};

export type MissionRecord = {
  id: string;
  sceneId: SceneId;
  title: string;
  naturalness: number;
  completedAt: string;
};

export type LearningSnapshot = {
  schemaVersion: 1;
  phrases: Phrase[];
  twin: Twin;
  level: 'A2' | 'B1';
  privacy: boolean;
  completed: number;
  history: MissionRecord[];
};
