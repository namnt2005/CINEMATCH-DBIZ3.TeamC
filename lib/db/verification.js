// VFDA Verified and the Article 13 flag (M4 FR-008..FR-011, BR-004, Q2, Q3), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/verification.js';

const supabase = () => import('./supabase/verification.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const prepareUpload = call('prepareUpload');
export const submitVerification = call('submitVerification');
export const listMyVerification = call('listMyVerification');
export const listVerificationQueue = call('listVerificationQueue');
export const decideVerification = call('decideVerification');
export const setArt13 = call('setArt13');
export const remindExpiringVerifications = call('remindExpiringVerifications');
export const documentLink = call('documentLink');
