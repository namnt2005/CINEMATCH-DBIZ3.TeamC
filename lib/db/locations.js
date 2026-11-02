// Public locations API (async). node:sqlite or Supabase, chosen by lib/db/source.js (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/locations.js';

const supabase = () => import('./supabase/locations.js');

export async function getPublishedLocations(...args) {
  return isSupabase() ? (await supabase()).getPublishedLocations(...args) : sqlite.getPublishedLocations(...args);
}

export async function getLocationCounts(...args) {
  return isSupabase() ? (await supabase()).getLocationCounts(...args) : sqlite.getLocationCounts(...args);
}

export async function getLocationBySlug(...args) {
  return isSupabase() ? (await supabase()).getLocationBySlug(...args) : sqlite.getLocationBySlug(...args);
}

export async function getPublishedLocationBySlug(...args) {
  return isSupabase() ? (await supabase()).getPublishedLocationBySlug(...args) : sqlite.getPublishedLocationBySlug(...args);
}

export async function getLocationImages(...args) {
  return isSupabase() ? (await supabase()).getLocationImages(...args) : sqlite.getLocationImages(...args);
}

export async function getApprovedLocationImages(...args) {
  return isSupabase() ? (await supabase()).getApprovedLocationImages(...args) : sqlite.getApprovedLocationImages(...args);
}

export async function getAllLocationNames(...args) {
  return isSupabase() ? (await supabase()).getAllLocationNames(...args) : sqlite.getAllLocationNames(...args);
}

export async function getAllProvinces(...args) {
  return isSupabase() ? (await supabase()).getAllProvinces(...args) : sqlite.getAllProvinces(...args);
}
