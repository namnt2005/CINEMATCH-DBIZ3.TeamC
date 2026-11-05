// Provincial notices (M7 FR-001..FR-004, BR-001..BR-003), node:sqlite or Supabase (003 D4).
// No function here sends a notice (BR-001); downloads are recorded by markDownloaded only (D7).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/notices.js';

const supabase = () => import('./supabase/notices.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const expressInterest = call('expressInterest');
export const listNotices = call('listNotices');
export const submitNotice = call('submitNotice');
export const reviewNotice = call('reviewNotice');
export const listStaffNotices = call('listStaffNotices');
export const getApprovedLetter = call('getApprovedLetter');
export const markDownloaded = call('markDownloaded');
export const recordReply = call('recordReply');
