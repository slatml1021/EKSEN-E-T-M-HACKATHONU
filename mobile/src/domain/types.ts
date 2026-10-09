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
  id: string;
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

/**
 * The first, vision-only step. It intentionally records uncertainty so that
 * the scenario writer cannot turn a guess into a fact.
 */
export type VisionObject = {
  label: string;
  confidence: number;
  visibleEvidence: string;
};

export type VisionAnalysis = {
  provider: 'gemini' | 'demo';
  model: string;
  confidence: number;
  environment: string;
  objects: VisionObject[];
  observations: string[];
  relationships: string[];
  uncertainties: string[];
};

export type MissionOrigin = {
  mode: 'live' | 'fallback' | 'demo';
  visionLabel: string;
  scenarioLabel: string;
  /** A user-safe operational note; never contains provider keys or raw media. */
  notice?: string;
};

export type PhotoMission = {
  scene: Scene;
  alternatives: Scene[];
  analysis: VisionAnalysis;
  origin: MissionOrigin;
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
  sceneId: string;
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
