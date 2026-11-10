// The language model as a passage finder only (M2 FR-011, research R3): it is given the active rules and the summary and
// may only return { rule_code, quoted_text } pairs copied from the text. It never writes explanations, levels or
// conclusions; anything else in its reply is ignored. Throws MatchError on any failure (the caller falls back).
export const GEMINI_MATCH_TIMEOUT_MS = 15000;

export class MatchError extends Error {
  constructor(reason) { super(`Language model unavailable: ${reason}`); this.reason = reason; }
}
const NETWORK_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'];
function classify(err) {
  if (err instanceof MatchError) return err;
  if (err?.name === 'AbortError') return new MatchError('timeout');
  if (err?.status === 429) return new MatchError('rate_limited');
  const code = err?.code || err?.cause?.code;
  if (err instanceof TypeError || NETWORK_CODES.includes(code) || /fetch failed|network/i.test(err?.message || '')) return new MatchError('network');
  return new MatchError('error');
}

function buildRequest(text, { rules, lang, model, signal }) {
  const catalogue = rules.map(r => `${r.rule_code}: ${r.title_en} — ${r.description_en}`).join('\n');
  return {
    model,
    contents: text,
    config: {
      systemInstruction: [
        `You find passages in a film story summary written in ${lang === 'vi' ? 'Vietnamese' : 'English'} that relate to the rules listed below.`,
        'For each passage return the rule code and the passage copied exactly, character for character, from the summary (verbatim).',
        'Return an empty list rather than guess. Use only the rule codes listed.',
        'Never judge, conclude or approve anything, and never explain: you only locate passages for a person to read.',
        'Rules:', catalogue
      ].join('\n'),
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          findings: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { rule_code: { type: 'STRING', enum: rules.map(r => r.rule_code) }, quoted_text: { type: 'STRING' } },
              required: ['rule_code', 'quoted_text']
            }
          }
        },
        required: ['findings']
      },
      temperature: 0,
      abortSignal: signal
    }
  };
}

function parseReply(response) {
  let data;
  try { data = JSON.parse(typeof response?.text === 'string' ? response.text : ''); } catch { throw new MatchError('invalid_response'); }
  if (!data || !Array.isArray(data.findings)) throw new MatchError('invalid_response');
  return data.findings.filter(f => typeof f?.rule_code === 'string' && typeof f?.quoted_text === 'string')
    .map(f => ({ rule_code: f.rule_code, quoted_text: f.quoted_text }));
}

async function createClient(apiKey) {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey });
}

export async function matchWithGemini(text, { rules, lang, apiKey, model, client, timeoutMs = GEMINI_MATCH_TIMEOUT_MS }) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new MatchError('timeout')); }, timeoutMs); });
  try {
    const ai = client || (await createClient(apiKey));
    const response = await Promise.race([ai.models.generateContent(buildRequest(text, { rules, lang, model, signal: controller.signal })), timeout]);
    return parseReply(response);
  } catch (err) {
    throw classify(err);
  } finally {
    clearTimeout(timer);
  }
}
