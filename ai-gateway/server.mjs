import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8787);
const GEMINI_REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS ?? 45_000);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const TEST_MODE = process.env.LIFELENS_TEST_MODE === '1';
const RATE_LIMIT = {
  count: Number(process.env.LIFELENS_RATE_LIMIT_COUNT ?? 12),
  windowMs: Number(process.env.LIFELENS_RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000),
};
const rateBuckets = new Map();

const VISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['environment', 'confidence', 'objects', 'observations', 'relationships', 'uncertainties'],
  properties: {
    environment: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    objects: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', additionalProperties: false,
        required: ['label', 'confidence', 'visibleEvidence'],
        properties: {
          label: { type: 'string' },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          visibleEvidence: { type: 'string' },
        },
      },
    },
    observations: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    relationships: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    uncertainties: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  },
};

const MISSION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'place', 'mission', 'objective', 'partner', 'opening', 'phrase'],
  properties: {
    title: { type: 'string' },
    place: { type: 'string' },
    mission: { type: 'string' },
    objective: { type: 'string' },
    partner: { type: 'string' },
    opening: { type: 'string' },
    phrase: {
      type: 'object', additionalProperties: false,
      required: ['en', 'tr', 'context'],
      properties: {
        en: { type: 'string' },
        tr: { type: 'string' },
        context: { type: 'string' },
      },
    },
  },
};

const SCENARIO_SET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendedIndex', 'scenarios'],
  properties: {
    recommendedIndex: { type: 'integer', minimum: 0, maximum: 2 },
    scenarios: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: MISSION_SCHEMA,
    },
  },
};

createServer(async (request, response) => {
  const requestId = randomUUID();
  setCors(request, response);
  response.setHeader('X-Request-Id', requestId);

  if (request.method === 'OPTIONS') return response.writeHead(204).end();
  if (request.method === 'GET' && request.url === '/health') return json(response, 200, { ok: true, providersConfigured: providersConfigured() });
  if (request.method !== 'POST' || request.url !== '/v1/missions/from-image') return json(response, 404, { error: 'not_found', requestId });
  if (!hasAccess(request)) return json(response, 401, { error: 'unauthorized', requestId });
  if (!withinRateLimit(clientKey(request))) return json(response, 429, { error: 'rate_limited', requestId });
  if (!providersConfigured()) return json(response, 503, { error: 'providers_not_configured', requestId });

  try {
    const body = await readJson(request);
    const input = validateInput(body);
    const analysis = await analyzeWithGemini(input.image);
    const scenarioSet = await createScenarioSetWithGemini(analysis, input.learner);
    const alternatives = scenarioSet.scenarios.map((scenario, index) => missionForResponse(scenario, analysis, requestId, index));
    // The raw image is intentionally never written to disk, logs, or a database.
    return json(response, 200, {
      analysis,
      mission: alternatives[scenarioSet.recommendedIndex],
      alternatives,
      origin: {
        mode: 'live',
        visionLabel: 'Gemini Vision',
        scenarioLabel: scenarioSet.label,
      },
    });
  } catch (error) {
    const status = error instanceof InputError ? 400 : error instanceof ProviderError ? 502 : 500;
    // Operational metadata is enough for tracing. Never log base64 image content or user text.
    console.error(JSON.stringify({ event: 'mission_pipeline_failed', requestId, status, code: error.code ?? 'internal_error' }));
    return json(response, status, { error: error.code ?? 'internal_error', requestId });
  }
}).listen(PORT, () => console.log(`LifeLens AI gateway listening on :${PORT}`));

async function analyzeWithGemini(image) {
  if (TEST_MODE) return mockVisionAnalysis(image);
  const primaryModel = process.env.GEMINI_VISION_MODEL ?? 'gemini-flash-latest';
  const fallbackModel = process.env.GEMINI_VISION_FALLBACK_MODEL ?? 'gemini-flash-lite-latest';
  const request = {
    systemInstruction: { parts: [{ text: 'You are LifeLens Vision. Analyze only visibly supported context for an English-learning application. Do not identify people, infer sensitive traits, read private text, or state guesses as facts. Return Turkish labels and explanations. Put every uncertainty in uncertainties.' }] },
    contents: [{ parts: [
      { inline_data: { mime_type: image.mimeType, data: image.base64 } },
      { text: 'List concrete visible objects, their visual evidence, visible relationships, a broad environment label, and uncertainty. This is analysis only; do not create a language lesson or scenario.' },
    ] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: VISION_SCHEMA, temperature: 0.1 },
  };
  let model = primaryModel;
  let payload;
  try {
    payload = await callGemini(model, request, 'gemini_unavailable');
  } catch (error) {
    if (!(error instanceof ProviderError) || ![429, 503].includes(error.status) || primaryModel === fallbackModel) throw error;
    model = fallbackModel;
    payload = await callGemini(model, request, 'gemini_unavailable');
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  const result = parseJson(text, 'gemini_invalid_response');
  if (!isVisionAnalysis(result)) throw new ProviderError('gemini_invalid_response');
  return { ...result, provider: 'gemini', model };
}

/**
 * This is deliberately a second Gemini call. Vision sees the photo; Gemini
 * 2.5 Flash-Lite receives only that structured analysis, never the raw image.
 */
async function createScenarioSetWithGemini(analysis, learner) {
  if (TEST_MODE) return mockScenarioSet(analysis, learner);
  const primaryModel = process.env.GEMINI_SCENARIO_MODEL ?? 'gemini-2.5-flash-lite';
  const fallbackModel = process.env.GEMINI_SCENARIO_FALLBACK_MODEL ?? 'gemini-3.5-flash-lite';
  const prompt = {
    analysis,
    learner,
    instruction: 'Verilen analize göre bir senaryo oluştur. Bu senaryo analizdeki obje ile bağlantılı ama genişletilmiş olsun. Farklı birkaç senaryo öner.',
    constraints: [
      'Return exactly three distinct, believable daily-life English speaking scenarios.',
      'Each scenario may continue beyond the frame, but must remain plausibly connected to visible evidence.',
      'Never turn an uncertainty into a fact and do not add unsupported objects or events.',
      'Keep the English phrase and opening appropriate for the learner CEFR level.',
      'Use Turkish for objective and context; use English for title, mission, opening, partner, and phrase.en.',
      'Respect the learner tone preferences. Set recommendedIndex to the strongest first choice.',
    ],
  };
  const request = {
    systemInstruction: { parts: [{ text: 'You are LifeLens Scenario Agent. You create language-learning missions only from structured visual evidence produced by another model. Follow the supplied JSON schema exactly.' }] },
    contents: [{ parts: [{ text: JSON.stringify(prompt) }] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: SCENARIO_SET_SCHEMA, temperature: 0.55 },
  };
  let model = primaryModel;
  let payload;
  try {
    payload = await callGemini(model, request, 'scenario_unavailable');
  } catch (error) {
    if (!(error instanceof ProviderError) || ![404, 429, 503].includes(error.status) || primaryModel === fallbackModel) throw error;
    model = fallbackModel;
    payload = await callGemini(model, request, 'scenario_unavailable');
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  const result = parseJson(text, 'scenario_invalid_response');
  if (!isScenarioSet(result) || !isSafeScenarioSet(result)) throw new ProviderError('scenario_invalid_response');
  return {
    scenarios: result.scenarios,
    recommendedIndex: result.recommendedIndex,
    label: model === primaryModel ? 'Gemini 2.5 Flash-Lite · 3 seçenek' : 'Gemini Flash-Lite · yedek model · 3 seçenek',
  };
}

async function parseProviderResponse(response, code) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new ProviderError(code, response.status);
  return payload;
}

async function callGemini(model, body, code) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body),
    });
    return await parseProviderResponse(response, code);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(code, 504);
  } finally {
    clearTimeout(timeout);
  }
}

function validateInput(body) {
  const image = body?.image;
  const learner = body?.learner;
  if (!image || typeof image.base64 !== 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)) throw new InputError('invalid_image');
  if (!isBase64(image.base64)) throw new InputError('invalid_image');
  const imageBytes = Buffer.from(image.base64, 'base64');
  if (imageBytes.length === 0 || !hasExpectedImageSignature(imageBytes, image.mimeType)) throw new InputError('invalid_image');
  if (imageBytes.length > MAX_IMAGE_BYTES) throw new InputError('image_too_large');
  if (!learner || !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(learner.level) || !isTwin(learner.twin)) throw new InputError('invalid_learner');
  return { image, learner };
}

function isBase64(value) { return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value); }

function hasExpectedImageSignature(bytes, mimeType) {
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/webp') return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

function isTwin(value) {
  return value && typeof value === 'object' && ['directness', 'warmth', 'humour']
    .every((key) => Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 100);
}

function isVisionAnalysis(value) {
  return value && typeof value.environment === 'string' && Number.isInteger(value.confidence) && Array.isArray(value.objects) && Array.isArray(value.observations) && Array.isArray(value.relationships) && Array.isArray(value.uncertainties)
    && value.objects.every((item) => typeof item?.label === 'string' && Number.isInteger(item?.confidence) && typeof item?.visibleEvidence === 'string');
}

function isMission(value) {
  return value && ['title', 'place', 'mission', 'objective', 'partner', 'opening'].every((key) => typeof value[key] === 'string')
    && value.phrase && ['en', 'tr', 'context'].every((key) => typeof value.phrase[key] === 'string');
}

function isScenarioSet(value) {
  return value && Number.isInteger(value.recommendedIndex) && value.recommendedIndex >= 0 && value.recommendedIndex < 3
    && Array.isArray(value.scenarios) && value.scenarios.length === 3 && value.scenarios.every(isMission);
}

/** Reject unsafe or unusably empty generated lessons before they reach a learner. */
function isSafeScenarioSet(value) {
  const text = value.scenarios.flatMap((scenario) => [scenario.title, scenario.place, scenario.mission, scenario.objective, scenario.partner, scenario.opening, scenario.phrase.en, scenario.phrase.tr, scenario.phrase.context]).join(' ').toLocaleLowerCase('en-US');
  const blocked = /\b(kill yourself|self-harm|suicide|sexual assault|hate speech)\b/;
  return !blocked.test(text) && value.scenarios.every((scenario) => scenario.opening.trim().length >= 3 && scenario.phrase.en.trim().length >= 3 && scenario.phrase.tr.trim().length >= 3);
}

function missionForResponse(mission, analysis, requestId, index) {
  const colors = ['#1C6970', '#304D7C', '#9C6142'];
  const icons = ['✦', '◌', '⌁'];
  return {
    id: `photo-${requestId.slice(0, 8)}-${index + 1}`,
    icon: icons[index] ?? '✦',
    confidence: analysis.confidence,
    objects: analysis.objects.map((item) => item.label),
    color: colors[index] ?? '#1C6970',
    ...mission,
    phrase: { id: `phrase-${requestId.slice(0, 8)}-${index + 1}`, used: false, ...mission.phrase },
  };
}

/**
 * Test-only deterministic provider substitute. It is enabled exclusively by
 * LIFELENS_TEST_MODE=1 so the 2,000-case suite exercises the real HTTP
 * pipeline without spending Gemini quota or sending generated test media.
 */
function mockVisionAnalysis(image) {
  const seed = stableHash(image.base64);
  const contexts = [
    { environment: 'çalışma alanı', object: 'dizüstü bilgisayar', related: 'şarj kablosu' },
    { environment: 'kafe masası', object: 'kahve bardağı', related: 'menü' },
    { environment: 'toplantı alanı', object: 'not defteri', related: 'kalem' },
    { environment: 'mutfak tezgâhı', object: 'su şişesi', related: 'bardak' },
  ];
  const context = contexts[seed % contexts.length];
  return {
    provider: 'gemini',
    model: 'test-double',
    environment: context.environment,
    confidence: 72 + (seed % 25),
    objects: [
      { label: context.object, confidence: 84 + (seed % 12), visibleEvidence: 'Test görselindeki ayırt edici renk/piksel dizisi.' },
      { label: context.related, confidence: 70 + (seed % 20), visibleEvidence: 'Test görselindeki eşlik eden renk/piksel dizisi.' },
    ],
    observations: [`${context.object} ile ${context.related} aynı günlük yaşam bağlamında test edildi.`],
    relationships: [`${context.object}, ${context.related} ile ilişkilendirildi.`],
    uncertainties: ['Test çiftinde görünmeyen kişiler veya olaylar kesin bilgi olarak üretilmez.'],
  };
}

function mockScenarioSet(analysis, learner) {
  const subject = analysis.objects[0]?.label ?? 'nesne';
  const actions = ['Ask for help', 'Make a practical request', 'Solve a small problem'];
  const places = ['Shared space', 'Cafe corner', 'Community desk'];
  const scenarios = actions.map((mission, index) => ({
    title: `${subject} · ${index + 1}. rota`,
    place: places[index],
    mission,
    objective: `${subject} ile bağlantılı günlük bir durumu kısa ve anlaşılır biçimde yönet.`,
    partner: index === 0 ? 'Mina · helper' : index === 1 ? 'Emre · barista' : 'Deniz · colleague',
    opening: openingForLevel(learner.level),
    phrase: phraseForLevel(learner.level, subject),
  }));
  return { scenarios, recommendedIndex: stableHash(`${analysis.environment}:${learner.level}`) % scenarios.length, label: 'Test Scenario Agent · 3 seçenek' };
}

function openingForLevel(level) {
  if (level === 'A1') return 'Hi! Can I help you?';
  if (level === 'A2') return 'Hello! What do you need?';
  if (level === 'B1') return 'Hi! What would you like to sort out today?';
  if (level === 'B2') return 'Hello. What can we work out together?';
  if (level === 'C1') return 'Hi. How would you like to handle this situation?';
  return 'Welcome. What outcome would be most useful for you today?';
}

function phraseForLevel(level, subject) {
  const phrases = {
    A1: { en: 'Can I use this, please?', tr: 'Bunu kullanabilir miyim, lütfen?' },
    A2: { en: 'Can I use this for a moment, please?', tr: 'Bunu kısa bir süre kullanabilir miyim, lütfen?' },
    B1: { en: 'Could you point me in the right direction with this?', tr: 'Bununla ilgili beni doğru yöne yönlendirebilir misin?' },
    B2: { en: 'Could you help me find the most practical way to deal with this?', tr: 'Bununla başa çıkmanın en pratik yolunu bulmama yardım eder misin?' },
    C1: { en: 'Would you be able to advise me on the best way to handle this?', tr: 'Bunu ele almanın en iyi yolu konusunda bana tavsiyede bulunabilir misin?' },
    C2: { en: 'Could you clarify the most effective way to resolve this situation?', tr: 'Bu durumu çözmenin en etkili yolunu netleştirebilir misin?' },
  };
  const phrase = phrases[level] ?? phrases.B1;
  return { ...phrase, context: `${subject} · ${level} test` };
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseJson(text, code) {
  try { return JSON.parse(text); } catch { throw new ProviderError(code); }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) { reject(new InputError('request_too_large')); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new InputError('invalid_json')); }
    });
    request.on('error', reject);
  });
}

function hasAccess(request) {
  const token = process.env.LIFELENS_API_TOKEN;
  return !token || request.headers.authorization === `Bearer ${token}`;
}

function clientKey(request) { return request.headers['x-forwarded-for']?.toString().split(',')[0].trim() ?? request.socket.remoteAddress ?? 'unknown'; }
function withinRateLimit(key) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt > RATE_LIMIT.windowMs) { rateBuckets.set(key, { startedAt: now, used: 1 }); return true; }
  if (current.used >= RATE_LIMIT.count) return false;
  current.used += 1; return true;
}
function providersConfigured() { return Boolean(process.env.GEMINI_API_KEY); }
function setCors(request, response) {
  const configuredOrigin = process.env.CORS_ORIGIN;
  const origin = request.headers.origin;
  if (!configuredOrigin || !origin || configuredOrigin === origin) response.setHeader('Access-Control-Allow-Origin', configuredOrigin || '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
}
function json(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)); }
class InputError extends Error { constructor(code) { super(code); this.code = code; } }
class ProviderError extends Error { constructor(code, status = 502) { super(code); this.code = code; this.status = status; } }
