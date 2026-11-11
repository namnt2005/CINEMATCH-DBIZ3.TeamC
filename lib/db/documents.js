// The document kit, uploads and downloads of SC-26 (M5 FR-001..FR-003, SR-154), node:sqlite or Supabase (003 D4).
// Versions are never deleted (FR-002); the files live in the private bucket project-documents (R3).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/documents.js';

const supabase = () => import('./supabase/documents.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const getKit = call('getKit');
export const requestUpload = call('requestUpload');
export const recordDocument = call('recordDocument');
export const listVersions = call('listVersions');
export const documentForDownload = call('documentForDownload');
