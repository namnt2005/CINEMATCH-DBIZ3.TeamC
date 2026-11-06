import { localAdapter, MAX_BYTES } from '../../../../../lib/storage/org-documents.js';

// Offline stand-in for the signed Storage URLs of `org-documents` (specs/007-m4-partners R10): node:sqlite only, never
// in production (analysis U1) and never when Supabase is configured.
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
  const bytes = await localAdapter().read(pathOf(params)).catch(() => null);
  return bytes ? new Response(bytes, { status: 200, headers: { 'content-type': 'application/pdf' } }) : new Response(null, { status: 404 });
}
