// The document access log (M4 FR-018 log only, BR-007, D4): one append-only row per view; the viewer is built with M5.
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/document-log.js';

const supabase = () => import('./supabase/document-log.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const logDocumentView = call('logDocumentView');
