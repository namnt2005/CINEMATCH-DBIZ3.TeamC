// Consultation requests (M7 FR-005 as reshaped by BR-005), node:sqlite or Supabase (003 D4).
// A request is stored, then emailed to VFDA; there is no slot calendar, officer assignment or reminder.
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/consultations.js';

const supabase = () => import('./supabase/consultations.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const requestConsultation = call('requestConsultation');
export const listConsultations = call('listConsultations');
export const getMemberContact = call('getMemberContact');
export const recordConsultationEmail = call('recordConsultationEmail');
