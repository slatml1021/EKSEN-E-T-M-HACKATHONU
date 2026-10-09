import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { deflateSync } from 'node:zlib';

const PORT = 8799;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_TOKEN = 'lifelens-test-token';
const VALID_CASES = 1600;
const INVALID_CASES = 200;
const UNAUTHORIZED_CASES = 100;
const ROUTE_CASES = 100;
const EXPECTED_CASES = VALID_CASES + INVALID_CASES + UNAUTHORIZED_CASES + ROUTE_CASES;
let executed = 0;

const server = spawn(process.execPath, ['server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    PORT: String(PORT),
    CORS_ORIGIN: '*',
    GEMINI_API_KEY: 'test-only-no-network',
    LIFELENS_API_TOKEN: TEST_TOKEN,
    LIFELENS_TEST_MODE: '1',
    LIFELENS_RATE_LIMIT_COUNT: '10000',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let diagnostics = '';
server.stdout.on('data', (chunk) => { diagnostics += chunk; });
server.stderr.on('data', (chunk) => { diagnostics += chunk; });

try {
  await waitForServer();
  await runValidCases();
  await runInvalidCases();
  await runUnauthorizedCases();
  await runRouteCases();
  assert.equal(executed, EXPECTED_CASES, 'The suite must execute exactly 2,000 scenarios.');
  console.log(JSON.stringify({
    ok: true,
    executed,
    breakdown: {
      validA1ToC2: VALID_CASES,
      malformedInput: INVALID_CASES,
      authentication: UNAUTHORIZED_CASES,
      routeAndMethod: ROUTE_CASES,
    },
  }));
} finally {
  server.kill('SIGTERM');
}

async function runValidCases() {
  for (let index = 0; index < VALID_CASES; index += 1) {
    const level = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][index % 6];
    const response = await postMission(validBody(index, level));
    executed += 1;
    assert.equal(response.status, 200, `valid case ${index} should succeed`);
    const payload = await response.json();
    assert.equal(payload.origin.mode, 'live');
    assert.equal(payload.analysis.provider, 'gemini');
    assert.equal(payload.alternatives.length, 3);
    assert.ok(payload.alternatives.some((scenario) => scenario.id === payload.mission.id));
    assert.ok(payload.analysis.objects.length >= 1);
    assert.ok(payload.mission.phrase.en.length > 4);
    if (level === 'A1') assert.match(payload.mission.phrase.en, /^Can I use this, please\?$/);
    if (level === 'A2') assert.match(payload.mission.phrase.en, /^Can I use this for a moment, please\?$/);
    if (level === 'B1') assert.match(payload.mission.phrase.en, /^Could you point me/);
    if (level === 'B2') assert.match(payload.mission.phrase.en, /^Could you help me/);
    if (level === 'C1') assert.match(payload.mission.phrase.en, /^Would you be able to advise me/);
    if (level === 'C2') assert.match(payload.mission.phrase.en, /^Could you clarify/);
  }
}

async function runInvalidCases() {
  for (let index = 0; index < INVALID_CASES; index += 1) {
    const body = validBody(index, 'A2');
    if (index % 5 === 0) body.image.mimeType = 'image/svg+xml';
    if (index % 5 === 1) body.image.base64 = '';
    if (index % 5 === 2) body.image.base64 = 'not-valid-base64!';
    if (index % 5 === 3) body.learner.level = 'C3';
    if (index % 5 === 4) body.learner = null;
    const response = await postMission(body);
    executed += 1;
    assert.equal(response.status, 400, `invalid case ${index} should be rejected`);
  }
}

async function runUnauthorizedCases() {
  for (let index = 0; index < UNAUTHORIZED_CASES; index += 1) {
    const response = await fetch(`${BASE_URL}/v1/missions/from-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: index % 2 === 0 ? '' : 'Bearer wrong-token' },
      body: JSON.stringify(validBody(index, 'B1')),
    });
    executed += 1;
    assert.equal(response.status, 401, `unauthorized case ${index} should be rejected`);
  }
}

async function runRouteCases() {
  for (let index = 0; index < ROUTE_CASES; index += 1) {
    const response = index % 2 === 0
      ? await fetch(`${BASE_URL}/not-a-route-${index}`)
      : await fetch(`${BASE_URL}/v1/missions/from-image`, { method: 'GET' });
    executed += 1;
    assert.equal(response.status, 404, `route case ${index} should return not found`);
  }
}

function validBody(seed, level) {
  return {
    image: { base64: pngBase64(seed), mimeType: 'image/png' },
    learner: {
      level,
      targetLanguage: 'English',
      nativeLanguage: 'Turkish',
      twin: { directness: seed % 101, warmth: (seed * 7) % 101, humour: (seed * 13) % 101 },
    },
  };
}

async function postMission(body) {
  return fetch(`${BASE_URL}/v1/missions/from-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TEST_TOKEN}` },
    body: JSON.stringify(body),
  });
}

async function waitForServer() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) return;
    } catch { /* Server is still booting. */ }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error(`Test gateway did not start. ${diagnostics}`);
}

function pngBase64(seed) {
  const red = seed & 255;
  const green = (seed >>> 8) & 255;
  const blue = (seed >>> 16) & 255;
  const header = Buffer.from('89504e470d0a1a0a', 'hex');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const image = Buffer.concat([header, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(Buffer.from([0, red, green, blue]))), pngChunk('IEND', Buffer.alloc(0))]);
  return image.toString('base64');
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
