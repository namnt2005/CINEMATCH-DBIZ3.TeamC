// Gemini translation of a batch of paragraphs (M5 FR-004, Q3; specs/009-m5-dossier R5). Structured output only:
// [{ idx, target_text }]. The project glossary is given as fixed translations (BR-006). The caller decides whether the
// model may be called at all; nothing here logs the text or the key.
import { GoogleGenAI, Type } from '@google/genai';

export class TranslateError extends Error {
  constructor(code) { super(code); this.name = 'TranslateError'; this.code = code; }
}

export function buildRequest(batch, { glossary = [], model, signal }) {
  const terms = glossary.length ? `Always translate these terms exactly as given:\n${glossary.map(g => `- ${g.term_en} → ${g.term_vi}`).join('\n')}\n` : '';
  return {
    model,
    contents: `Translate each English paragraph of a film synopsis or script into natural Vietnamese for a person to proofread. `
      + `Keep the meaning, names and paragraph boundaries; do not add or remove content.\n${terms}`
      + `Paragraphs (JSON): ${JSON.stringify(batch.map(p => ({ idx: p.idx, text: p.source_text })))}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { idx: { type: Type.INTEGER }, target_text: { type: Type.STRING } }, required: ['idx', 'target_text'] } },
      abortSignal: signal
    }
  };
}

export async function translateBatch(batch, { glossary, apiKey, model, client, timeoutMs = 15000 }) {
  const ai = client || new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new TranslateError('TIMEOUT')); }, timeoutMs); });
  try {
    const response = await Promise.race([ai.models.generateContent(buildRequest(batch, { glossary, model, signal: controller.signal })), timeout]);
    const out = JSON.parse(response?.text ?? '[]');
    if (!Array.isArray(out)) throw new TranslateError('SHAPE');
    const asked = new Set(batch.map(p => p.idx));
    return out.filter(o => o && asked.has(o.idx) && typeof o.target_text === 'string' && o.target_text.trim()).map(o => ({ idx: o.idx, target_text: o.target_text.trim() }));
  } catch (err) {
    throw err instanceof TranslateError ? err : new TranslateError('MODEL');
  } finally {
    clearTimeout(timer);
  }
}
