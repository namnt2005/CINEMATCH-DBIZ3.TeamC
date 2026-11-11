import { localAdapter, MAX_BYTES, TYPE_OF_EXT } from '../../../../../lib/storage/project-documents.js';

export const dynamic = 'force-dynamic';

// Offline stand-in for the signed Storage URLs of `project-documents` (specs/009-m5-dossier R3): node:sqlite only, never
// in production and never when Supabase is configured.
const closed = () => process.env.NODE_ENV === 'production' || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const pathOf = (params) => (params?.path || []).join('/');

export async function PUT(req, { params }) {
  if (closed()) return new Response(null, { status: 404 });
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length > MAX_BYTES) return new Response(null, { status: 413 });
  try {
    await localAdapter().write(pathOf(params), bytes);
  } catch {
    return new Response(null, { status: 400 });
  }
  return new Response(null, { status: 200 });
}

export async function GET(req, { params }) {
  if (closed()) return new Response(null, { status: 404 });
  const p = pathOf(params);
  const bytes = await localAdapter().read(p).catch(() => null);
  const type = TYPE_OF_EXT[p.split('.').pop()] || 'application/octet-stream';
  return bytes ? new Response(bytes, { status: 200, headers: { 'content-type': type } }) : new Response(null, { status: 404 });
}
