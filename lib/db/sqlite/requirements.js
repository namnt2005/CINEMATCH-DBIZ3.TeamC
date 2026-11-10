import { query } from '../client.js';
import { listFrom, detailFrom } from '../../requirements/shape.js';

// node:sqlite source of the requirements library: drafts are never read (SR-281).
const readable = () => query("SELECT * FROM legal_rule WHERE status IN ('approved', 'retired')");
const versions = () => query('SELECT rule_version, created_at FROM rule_set_version');

export async function listRequirements(filters = {}) {
  return listFrom(readable(), versions(), filters);
}

export async function getRequirement(slug) {
  return detailFrom(readable(), versions(), slug);
}
