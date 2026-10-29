import { extractScene } from '../../../../lib/extraction/index.js';

/**
 * Route Handler for scene attribute extraction (F-M3-10, F-M3-11, F-M3-12).
 * The extractor is chosen by LLM_PROVIDER (mock | gemini) on the server; the Gemini key
 * stays in process.env and is never part of the response.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const description = body ? body.description : null;

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return Response.json(
        { error: 'Description must be at least 10 characters (FR-010).' },
        { status: 400 }
      );
    }

    const extraction = await extractScene(description.trim());

    return Response.json(extraction, { status: 200 });
  } catch (err) {
    return Response.json(
      { error: 'Invalid JSON request payload', details: err.message },
      { status: 400 }
    );
  }
}
