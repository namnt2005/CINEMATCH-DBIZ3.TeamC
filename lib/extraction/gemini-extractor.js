import { getSceneCatalog } from '../catalog/validator.js';

// SC-15: a slow model must not hold the producer up; past this the rule-based extractor answers.
export const GEMINI_TIMEOUT_MS = 8000;

/**
 * A Gemini failure the caller turns into the rule-based fallback.
 * `reason` is a fixed code; the SDK message is never passed on, since it may echo request details.
 */
export class ExtractionError extends Error {
  constructor(reason) {
    super(`Gemini extraction failed: ${reason}`);
    this.reason = reason; // timeout | rate_limited | network | invalid_response | error
  }
}

const NETWORK_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'];

function classify(err) {
  if (err instanceof ExtractionError) return err;
  if (err?.name === 'AbortError') return new ExtractionError('timeout');
  if (err?.status === 429) return new ExtractionError('rate_limited');
  const code = err?.code || err?.cause?.code;
  if (err instanceof TypeError || NETWORK_CODES.includes(code) || /fetch failed|network/i.test(err?.message || '')) {
    return new ExtractionError('network');
  }
  return new ExtractionError('error');
}

/**
 * BR-001: the model only fills this template. It is given no location data and is told
 * never to name, choose or score a place; ranking stays in lib/scoring/engine.js.
 */
function buildRequest(description, model, signal) {
  const catalog = getSceneCatalog();
  return {
    model,
    contents: description,
    config: {
      systemInstruction: [
        'You extract filming-scene attributes from a producer\'s scene description written in English or Vietnamese.',
        'Fill only the JSON schema. Use only the allowed values; leave a field null (or the list empty) when the description does not say.',
        `scene_types: every visual setting the scene needs, from: ${catalog.scene_types.join(', ')}. A floating market needs floating_village, market and river.`,
        'crew_size: people on set, extras included: u15 = under 15, 15_50 = 15 to 50, o50 = over 50.',
        'shoot_month: the month of shooting as a number 1-12 ("tháng 3" = 3).',
        `era: one of ${catalog.era.join(', ')}.`,
        'notes: one short sentence about needs the other fields cannot hold (time of day, weather, night scenes), or null.',
        'Never name, suggest, rank or score any real place, venue or location.'
      ].join('\n'),
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          scene_types: { type: 'ARRAY', items: { type: 'STRING', enum: catalog.scene_types } },
          crew_size: { type: 'STRING', enum: catalog.crew_capacity, nullable: true },
          shoot_month: { type: 'INTEGER', nullable: true },
          era: { type: 'STRING', enum: catalog.era, nullable: true },
          notes: { type: 'STRING', nullable: true }
        },
        required: ['scene_types'],
        propertyOrdering: ['scene_types', 'crew_size', 'shoot_month', 'era', 'notes']
      },
      temperature: 0,
      abortSignal: signal
    }
  };
}

// Only the template fields leave this function; anything else the model adds is ignored (BR-001)
function parseReply(response) {
  let data;
  try {
    data = JSON.parse(typeof response?.text === 'string' ? response.text : '');
  } catch {
    throw new ExtractionError('invalid_response');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ExtractionError('invalid_response');
  }
  return {
    scene_types: Array.isArray(data.scene_types) ? data.scene_types.filter(v => typeof v === 'string') : [],
    crew_size: data.crew_size ?? null,
    shoot_month: data.shoot_month ?? null,
    era: data.era ?? null,
    time_of_day: [],
    notes: typeof data.notes === 'string' ? data.notes : null
  };
}

async function createClient(apiKey) {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey });
}

/**
 * Extracts raw scene attributes with Gemini (F-M3-11). Throws ExtractionError on any failure.
 *
 * @param {string} description
 * @param {{ apiKey: string, model: string, client?: object, timeoutMs?: number }} options
 *        `client` replaces the @google/genai client in tests (no network)
 */
export async function extractWithGemini(description, { apiKey, model, client, timeoutMs = GEMINI_TIMEOUT_MS }) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ExtractionError('timeout'));
    }, timeoutMs);
  });

  try {
    const ai = client || (await createClient(apiKey));
    const response = await Promise.race([
      ai.models.generateContent(buildRequest(description, model, controller.signal)),
      timeout
    ]);
    return parseReply(response);
  } catch (err) {
    throw classify(err);
  } finally {
    clearTimeout(timer);
  }
}
