// Helpers for the router contract tests (not a test file).
export const COOKIE = 'cm_router_session';

export function post(body, { cookie = '', lang = '' } = {}) {
  const headers = { 'content-type': 'application/json' };
  const jar = [cookie && `${COOKIE}=${cookie}`, lang && `locale=${lang}`].filter(Boolean).join('; ');
  if (jar) headers.cookie = jar;
  return new Request('http://localhost:3000/api/router/decisions', { method: 'POST', headers, body: JSON.stringify(body) });
}

export function patch(id, body, { cookie = '' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = `${COOKIE}=${cookie}`;
  return new Request(`http://localhost:3000/api/router/decisions/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
}

/** The router session cookie a response sets: { value, attributes } or null. */
export function sessionCookie(res) {
  const line = (res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') || '']).find(c => c.startsWith(`${COOKIE}=`));
  if (!line) return null;
  const [pair, ...attributes] = line.split(';').map(s => s.trim());
  return { value: pair.slice(COOKIE.length + 1), attributes: attributes.map(a => a.toLowerCase()) };
}

export const YES_ABROAD_FOREIGN = { q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', q4_needs: ['locations', 'crew'] };
