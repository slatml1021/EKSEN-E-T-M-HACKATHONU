import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const RATE_LIMIT = { count: 12, windowMs: 10 * 60 * 1000 };
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
    const scenario = process.env.OPENAI_API_KEY
      ? await createScenarioWithOpenAI(analysis, input.learner)
      : await createScenarioWithGemini(analysis, input.learner);
    // The raw image is intentionally never written to disk, logs, or a database.
    return json(response, 200, {
      analysis,
      mission: {
        id: `photo-${requestId.slice(0, 8)}`,
        icon: '⌁',
        confidence: analysis.confidence,
        objects: analysis.objects.map((item) => item.label),
        color: '#1C6970',
        ...scenario.mission,
        phrase: { id: `phrase-${requestId.slice(0, 8)}`, used: false, ...scenario.mission.phrase },
      },
      origin: {
        mode: 'live',
        visionLabel: 'Gemini Vision',
        scenarioLabel: scenario.label,
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

async function createScenarioWithOpenAI(analysis, learner) {
  const model = process.env.OPENAI_SCENARIO_MODEL ?? 'gpt-5-mini';
  const prompt = {
    analysis,
    learner,
    instruction: 'Create one broader, believable daily-life English speaking scenario from this evidence only. The mission may extend beyond the frame (for example into a cafe, office, or event) but must remain plausibly connected to the visible context. Never turn an uncertainty into a fact. Keep the English phrase and opening appropriate for the learner CEFR level. Use Turkish for description/objective and English for title, mission, opening, and phrase.en. Respect the learner tone preferences.',
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        { role: 'developer', content: 'You are LifeLens Scenario Composer. Create structured learning missions from a separately verified vision analysis. Follow the supplied JSON schema exactly.' },
        { role: 'user', content: JSON.stringify(prompt) },
      ],
      text: { format: { type: 'json_schema', name: 'lifelens_mission', strict: true, schema: MISSION_SCHEMA } },
    }),
  });
  const payload = await parseProviderResponse(response, 'scenario_unavailable');
  const text = outputText(payload);
  const result = parseJson(text, 'scenario_invalid_response');
  if (!isMission(result)) throw new ProviderError('scenario_invalid_response');
  return { mission: result, label: 'OpenAI Scenario AI' };
}

/**
 * Free-tier-friendly live fallback: this is intentionally a second, separate
 * model call. Vision sees the photo; the scenario agent receives only Gemini's
 * structured output, never the original image.
 */
async function createScenarioWithGemini(analysis, learner) {
  const model = process.env.GEMINI_SCENARIO_MODEL ?? 'gemini-flash-lite-latest';
  const prompt = {
    analysis,
    learner,
    instruction: 'Create exactly one broader, believable daily-life English speaking scenario from this evidence only. The scenario can continue beyond the frame but must stay plausibly connected to visible evidence. Never turn an uncertainty into a fact. Keep English phrase and opening appropriate for the learner CEFR level. Use Turkish for objective/context and English for title, mission, opening, partner, and phrase.en. Respect the learner tone preferences.',
  };
  const payload = await callGemini(model, {
    systemInstruction: { parts: [{ text: 'You are LifeLens Scenario Agent. You create language-learning missions only from structured visual evidence produced by another model. Follow the supplied JSON schema exactly.' }] },
    contents: [{ parts: [{ text: JSON.stringify(prompt) }] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: MISSION_SCHEMA, temperature: 0.4 },
  }, 'scenario_unavailable');
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  const result = parseJson(text, 'scenario_invalid_response');
  if (!isMission(result)) throw new ProviderError('scenario_invalid_response');
  return { mission: result, label: 'Gemini Scenario Agent' };
}

function outputText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  return (payload.output ?? []).flatMap((item) => item.content ?? []).filter((item) => item.type === 'output_text').map((item) => item.text ?? '').join('');
}

async function parseProviderResponse(response, code) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new ProviderError(code, response.status);
  return payload;
}

async function callGemini(model, body, code) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24_000);
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
  if (Buffer.byteLength(image.base64, 'base64') > MAX_IMAGE_BYTES) throw new InputError('image_too_large');
  if (!learner || !['A2', 'B1'].includes(learner.level) || typeof learner.twin !== 'object') throw new InputError('invalid_learner');
  return { image, learner };
}

function isVisionAnalysis(value) {
  return value && typeof value.environment === 'string' && Number.isInteger(value.confidence) && Array.isArray(value.objects) && Array.isArray(value.observations) && Array.isArray(value.relationships) && Array.isArray(value.uncertainties)
    && value.objects.every((item) => typeof item?.label === 'string' && Number.isInteger(item?.confidence) && typeof item?.visibleEvidence === 'string');
}

function isMission(value) {
  return value && ['title', 'place', 'mission', 'objective', 'partner', 'opening'].every((key) => typeof value[key] === 'string')
    && value.phrase && ['en', 'tr', 'context'].every((key) => typeof value.phrase[key] === 'string');
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
