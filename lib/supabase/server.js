import { createServerClient } from '@supabase/ssr';
import { testClient } from './testing.js';

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client acting as the signed-in user (publishable key + the user's session cookies),
 * so Row Level Security decides what it reads (BR-001).
 * Server components and Route Handlers: cookies come from next/headers.
 * Middleware: pass { request, response } so refreshed cookies are written to the response.
 */
export async function getUserClient({ request, response } = {}) {
  const fake = testClient('user');
  if (fake) return fake;

  if (request) {
    return createServerClient(url(), publishableKey(), {
      cookies: {
        getAll: () => request.cookies?.getAll?.() ?? [],
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => response?.cookies?.set(name, value, options))
      }
    });
  }

  const { cookies } = await import('next/headers.js');
  const store = cookies();
  return createServerClient(url(), publishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      // Server components cannot set cookies; the middleware refreshes them instead.
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} }
    }
  });
}
