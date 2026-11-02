// Secret-key client for the System actor (specs/003-sys-core D2). Server and scripts only:
// it bypasses Row Level Security, so it must never reach a browser bundle.
if (typeof window !== 'undefined') {
  throw new Error('lib/supabase/admin.js is server-only: it uses SUPABASE_SECRET_KEY.');
}

import { createClient } from '@supabase/supabase-js';
import { testClient } from './testing.js';

let client = null;

export function getAdminClient() {
  const fake = testClient('admin');
  if (fake) return fake;
  if (!client) {
    if (!process.env.SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY is not set (server environment).');
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}
