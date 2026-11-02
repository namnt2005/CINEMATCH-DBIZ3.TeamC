/**
 * Which data source lib/db/ uses (specs/003-sys-core D4):
 * 'supabase' when NEXT_PUBLIC_SUPABASE_URL is set, otherwise 'sqlite' (node:sqlite + data/seed, offline).
 * npm test never sets the URL, so tests always run on sqlite without the network.
 */
export function dataSource() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ? 'supabase' : 'sqlite';
}

export const isSupabase = () => dataSource() === 'supabase';
