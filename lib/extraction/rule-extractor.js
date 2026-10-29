/**
 * Rule-based scene attribute extractor (F-M3-11): the default for development and tests
 * (LLM_PROVIDER=mock) and the fallback when Gemini fails.
 * Moved unchanged from app/api/locations/extract-scene/route.js; it returns raw values,
 * which lib/extraction/index.js validates against the catalogue like Gemini's.
 *
 * @returns {{ scene_types: string[], crew_size: string|null, shoot_month: null, era: string|null,
 *             time_of_day: string[], notes: null }}
 */
export function extractWithRules(text = '') {
  const lower = text.toLowerCase();
  const rawSceneTypes = [];
  const timeOfDay = [];
  let era = null;
  let crowd_scale = null;

  // Scene type detection & synonyms
  if (/karst|limestone|đá vôi/i.test(lower)) rawSceneTypes.push('limestone karsts');
  if (/ferry landing|landing|bến phà|bến thuyền|river|sông/i.test(lower)) rawSceneTypes.push('landing');
  if (/waterside village|fishing village|làng chài|làng ven sông/i.test(lower)) rawSceneTypes.push('waterside village');
  if (/rice field|paddy|ruộng lúa/i.test(lower)) rawSceneTypes.push('rice_field');
  if (/sea|ocean|beach|biển/i.test(lower)) rawSceneTypes.push('sea');
  if (/cave|cavern|grotto|hang/i.test(lower)) rawSceneTypes.push('cave');
  if (/jungle|forest|rừng/i.test(lower)) rawSceneTypes.push('jungle');
  if (/old town|ancient town|phố cổ/i.test(lower)) rawSceneTypes.push('old_town');
  if (/market|chợ/i.test(lower)) rawSceneTypes.push('market');
  if (/rice terrace|ruộng bậc thang/i.test(lower)) rawSceneTypes.push('rice_terrace');
  if (/mountain|núi/i.test(lower)) rawSceneTypes.push('mountain');
  if (/dunes|sand dunes|đồi cát/i.test(lower)) rawSceneTypes.push('sand dunes');
  if (/mangrove|rừng ngập mặn/i.test(lower)) rawSceneTypes.push('mangrove');

  // Era detection
  if (/1970s|1970/i.test(lower)) era = '1970s';
  else if (/war|1950|1960/i.test(lower)) era = 'war_1950_1975';
  else if (/historical|pre1950|cổ trang/i.test(lower)) era = 'historical_pre1950';
  else if (/postwar|1980|1990/i.test(lower)) era = 'postwar_1975_2000';
  else era = 'contemporary';

  // Time of day detection
  if (/dawn|hừng đông|bình minh/i.test(lower)) timeOfDay.push('dawn');
  if (/night|đêm|tối/i.test(lower)) timeOfDay.push('night');
  if (/dusk|hoàng hôn/i.test(lower)) timeOfDay.push('dusk');
  if (/golden hour/i.test(lower)) timeOfDay.push('golden_hour');
  if (/day|ngày/i.test(lower)) timeOfDay.push('day');

  // Crowd scale / extras
  if (/30 extras|15[-–]50|vài chục diễn viên/i.test(lower)) crowd_scale = '15_50';
  else if (/u15|nhỏ|ít diễn viên/i.test(lower)) crowd_scale = 'u15';
  else if (/o50|hàng trăm|đông người/i.test(lower)) crowd_scale = 'o50';

  return {
    scene_types: rawSceneTypes,
    crew_size: crowd_scale,
    shoot_month: null,
    era,
    time_of_day: timeOfDay,
    notes: null
  };
}
