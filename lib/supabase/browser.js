'use client';

import { createBrowserClient } from '@supabase/ssr';

/** Browser client with the publishable key, for sign-in forms (slice 2). Never the secret key. */
export function getBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
