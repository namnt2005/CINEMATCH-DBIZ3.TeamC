// Display labels shared by the M3 screens (SC-14, SC-15, SC-16, SC-35), from the dictionary (FR-006).

export const sceneLabel = (t, type) => t(`scene.${type}`);
export const availabilityText = (t, value) => (value ? t(`availability.${value}`) : '');

/** SC-14 "Why it matches": the engine's reason codes (lib/scoring/engine.js) in the user's language. */
export function reasonText(t, { key, vars = {} }) {
  const values = { ...vars };
  if (Array.isArray(vars.types)) values.types = vars.types.map(type => sceneLabel(t, type)).join(', ');
  if (vars.crew) values.crew = t(`crew.${vars.crew}`);
  return t(key, values);
}
