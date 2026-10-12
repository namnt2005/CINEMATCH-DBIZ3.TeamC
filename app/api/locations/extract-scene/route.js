import { validateAndMapAttributes } from '../../../../lib/catalog/validator.js';

/**
 * Heuristic/rule-based fallback attribute extractor for development and offline testing (F-M3-11).
 * In production, this coordinates with the configured Language Model API while enforcing
 * that the model never chooses or ranks locations (BR-001).
 */
function extractAttributesFromText(text = '') {
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

  // Validate and map through catalog taxonomy
  const validation = validateAndMapAttributes({
    scene_types: rawSceneTypes,
    era,
    time_of_day: timeOfDay,
    crew_size: crowd_scale
  });

  return {
    raw: {
      scene_types: rawSceneTypes,
      era,
      time_of_day: timeOfDay,
      crowd_scale
    },
    attributes: {
      scene_types: validation.valid_attributes.scene_types || [],
      era: validation.valid_attributes.era || era,
      time_of_day: validation.valid_attributes.time_of_day || timeOfDay,
      crowd_scale: validation.valid_attributes.crew_size || crowd_scale,
      water: rawSceneTypes.includes('landing') ? 'river' : 'none'
    },
    valid_attributes: validation.valid_attributes,
    mapped_synonyms: validation.mapped_explanations,
    rejected: validation.rejected,
    editable: true
  };
}

/**
 * Route Handler for scene attribute extraction (F-M3-10, F-M3-11, F-M3-12).
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const description = body ? body.description : null;

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return Response.json(
        { error: 'Description must be at least 10 characters (FR-010).' },
        { status: 400 }
      );
    }

    const extraction = extractAttributesFromText(description.trim());

    return Response.json(extraction, { status: 200 });
  } catch (err) {
    return Response.json(
      { error: 'Invalid JSON request payload', details: err.message },
      { status: 400 }
    );
  }
}
