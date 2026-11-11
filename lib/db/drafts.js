// Bilingual drafts of SC-28 (M5 FR-004..FR-006), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/drafts.js';

const supabase = () => import('./supabase/drafts.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const listDrafts = call('listDrafts');
export const getDraft = call('getDraft');
export const createDraft = call('createDraft');
export const translateDraft = call('translateDraft');
export const editParagraph = call('editParagraph');
export const reviewParagraph = call('reviewParagraph');
export const confirmDraft = call('confirmDraft');
export const exportPdf = call('exportPdf');
