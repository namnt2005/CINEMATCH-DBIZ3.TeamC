import { resolveSessionRole } from '../auth/session.js';
import { AdminError } from '../admin/errors.js';

/*
 * Shared plumbing of the /api/admin/locations Route Handlers (contracts/admin-locations.contract.md §0).
 * vfda_staff only until the SYS sign-in slice (gate G2): no role → 401, any other role → 403.
 */

function gate(req) {
  const session = resolveSessionRole(req.headers);
  if (!session.isAuthenticated) {
    return { response: Response.json({ error: 'UNAUTHENTICATED', message: 'Sign in as VFDA staff to manage locations.' }, { status: 401 }) };
  }
  if (session.role !== 'vfda_staff') {
    return { response: Response.json({ error: 'FORBIDDEN', message: 'Only VFDA staff can manage locations.' }, { status: 403 }) };
  }
  return { session };
}

/**
 * Wraps a handler: checks the role first, then turns AdminError into its JSON response.
 * @param {(req: Request, params: object, session: object) => Promise<Response>|Response} handler
 */
export function adminRoute(handler) {
  return async (req, { params } = {}) => {
    const { session, response } = gate(req);
    if (response) return response;
    try {
      return await handler(req, params || {}, session);
    } catch (err) {
      if (err instanceof AdminError) {
        return Response.json({ error: err.code, message: err.message, ...err.extra }, { status: err.status });
      }
      console.error('Admin locations error:', err);
      return Response.json({ error: 'INTERNAL_ERROR', message: "Couldn't save — your changes are kept." }, { status: 500 });
    }
  };
}

/** Request body as an object; an empty body is {}. */
export async function readBody(req) {
  const text = await req.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AdminError('INVALID_JSON', 400, 'The request body is not valid JSON.');
  }
}

export const methodNotAllowed = () => {
  throw new AdminError('METHOD_NOT_ALLOWED', 405, 'Locations are unpublished, never deleted (M3 BR-008).');
};
