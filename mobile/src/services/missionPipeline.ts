import type { MissionOrigin, PhotoMission, Scene, Twin, VisionAnalysis } from '../domain/types';

type ImageInput = {
  base64: string;
  mimeType: string;
};

export type PhotoMissionInput = {
  image: ImageInput;
  level: 'A2' | 'B1';
  twin: Twin;
};

type GatewayPayload = {
  analysis: VisionAnalysis;
  mission: Omit<Scene, 'color'> & { color?: string };
  alternatives: (Omit<Scene, 'color'> & { color?: string })[];
  origin: MissionOrigin;
};

const API_URL = process.env.EXPO_PUBLIC_LIFELENS_API_URL?.replace(/\/$/, '');

/**
 * Calls the server-side two-model pipeline. The app never receives either
 * provider key. If the gateway is unavailable, we deliberately return a
 * clearly labelled generic practice mission rather than inventing photo facts.
 */
export async function createMissionFromPhoto(input: PhotoMissionInput): Promise<PhotoMission> {
  if (!API_URL) return localFallbackMission();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28_000);
  try {
    const response = await fetch(`${API_URL}/v1/missions/from-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        image: input.image,
        learner: {
          level: input.level,
          targetLanguage: 'English',
          nativeLanguage: 'Turkish',
          twin: input.twin,
        },
      }),
    });
    if (!response.ok) throw new Error(`Gateway request failed (${response.status})`);
    const payload = await response.json() as GatewayPayload;
    if (!isGatewayPayload(payload)) throw new Error('Gateway returned an invalid mission');
    return {
      analysis: payload.analysis,
      origin: payload.origin,
      scene: { ...payload.mission, color: payload.mission.color ?? '#1C6970' },
      alternatives: payload.alternatives.map((alternative, index) => ({
        ...alternative,
        color: alternative.color ?? ['#1C6970', '#304D7C', '#9C6142'][index] ?? '#1C6970',
      })),
    };
  } catch {
    return localFallbackMission();
  } finally {
    clearTimeout(timeout);
  }
}

export function demoAnalysisFor(scene: Scene): VisionAnalysis {
  return {
    provider: 'demo',
    model: 'LifeLens demo context',
    confidence: scene.confidence,
    environment: scene.place,
    objects: scene.objects.map((label, index) => ({
      label,
      confidence: Math.max(72, scene.confidence - index * 4),
      visibleEvidence: 'Hazır demo bağlamı',
    })),
    observations: [scene.context],
    relationships: ['Demo akışında görünür nesneler ile iletişim amacı eşleştirildi.'],
    uncertainties: ['Bu sahne canlı fotoğraf analizi değil, sunum için hazırlanmış bir bağlamdır.'],
  };
}

function localFallbackMission(): PhotoMission {
  const scene: Scene = {
    id: `fallback-${Date.now()}`,
    icon: '⌁',
    title: 'A clear help request',
    place: 'Seçtiğin ortam',
    confidence: 0,
    objects: [],
    context: 'Fotoğrafın analizi için bağlantı kurulamadı. Bu yüzden görünmeyen nesneler hakkında varsayım yapmadan, herhangi bir ortak alanda kullanılabilecek güvenli bir konuşma görevi hazırladık.',
    mission: 'Ask for practical help',
    objective: 'Bulunduğun ortamda küçük bir ihtiyacını kısa ve nazik biçimde açıkla.',
    partner: 'Mina · helper',
    opening: 'Hi! Is there anything you need help with?',
    phrase: {
      id: `fallback-phrase-${Date.now()}`,
      en: 'Could you give me a hand with this, please?',
      tr: 'Bununla ilgili bana yardım eder misin, lütfen?',
      context: 'Genel yardım isteme',
      used: false,
    },
    color: '#5E7788',
  };
  return {
    analysis: {
      provider: 'demo',
      model: 'Local safe fallback',
      confidence: 0,
      environment: 'Fotoğraf seçildi',
      objects: [],
      observations: ['Fotoğraf alındı; Gemini bağlantısı olmadan nesne tespiti yapılmadı.'],
      relationships: [],
      uncertainties: ['Bu görev görseldeki nesneleri iddia etmez. Canlı analiz için güvenli AI Gateway yapılandırılmalıdır.'],
    },
    origin: {
      mode: 'fallback',
      visionLabel: 'Gemini Vision bekleniyor',
      scenarioLabel: 'Yerel güvenli görev',
    },
    scene,
    alternatives: [scene],
  };
}

function isGatewayPayload(value: unknown): value is GatewayPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GatewayPayload>;
  return Boolean(candidate.analysis && candidate.mission && candidate.origin && Array.isArray(candidate.alternatives)
    && Array.isArray(candidate.analysis.objects)
    && typeof candidate.mission.title === 'string'
    && typeof candidate.mission.opening === 'string'
    && typeof candidate.mission.phrase?.en === 'string'
    && candidate.alternatives.length >= 1
    && candidate.alternatives.every((alternative) => typeof alternative?.title === 'string' && typeof alternative?.opening === 'string' && typeof alternative?.phrase?.en === 'string'));
}
