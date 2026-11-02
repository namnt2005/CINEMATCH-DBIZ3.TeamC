import crypto from 'node:crypto';
import { systemDb } from './util.js';

/** Stores a confirmed scene search without personal data (BR-009) — System write. */
export async function sanitizeAndLogQuery(rawData = {}) {
  const query_id = crypto.randomUUID();
  const description = rawData.description || rawData.scene_description || '';
  const attributes = rawData.attributes || {};
  const month = rawData.shoot_month ? parseInt(rawData.shoot_month, 10) : null;
  const { error } = await systemDb().from('location_query').insert({
    query_id, project_id: rawData.project_id || null, scene_description: description, shoot_month: month, attributes
  });
  if (error) console.warn('Query persistence warning:', error.message);
  return { query_id, description, attributes, month };
}
