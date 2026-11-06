// The 12 fixed service groups of M4 (BR-002, Q1), in the order of the schema CHECK list and the Screen Specs.
// Labels come from lib/i18n (`partners.group.<value>`); organisations cannot add a group.
export const SERVICE_GROUPS = Object.freeze(['full_production', 'permits_paperwork', 'casting', 'crew', 'camera_lighting',
  'studios_interiors', 'location_management', 'transport_logistics', 'lodging_catering', 'interpreting', 'insurance_legal',
  'post_production']);

export const isServiceGroup = (value) => typeof value === 'string' && SERVICE_GROUPS.includes(value);
