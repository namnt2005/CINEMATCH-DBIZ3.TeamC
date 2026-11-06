// Collaboration requests (M4 FR-012..FR-017, BR-005, BR-009), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/collab.js';

const supabase = () => import('./supabase/collab.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const sendRequest = call('sendRequest');
export const respond = call('respond');
export const acceptNda = call('acceptNda');
export const confirm = call('confirm');
export const withdraw = call('withdraw');
export const postMessage = call('postMessage');
export const getRequest = call('getRequest');
export const listRequests = call('listRequests');
