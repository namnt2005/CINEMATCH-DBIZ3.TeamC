import { searchLocations } from '../../../../lib/db/search.js';

/**
 * Route Handler for multi-criteria location discovery search & ranking (F-M3-06, F-M3-08, F-M3-09).
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Parse query parameters
    const q = searchParams.get('q') || '';
    const sceneTypesRaw = searchParams.get('scene_types');
    const scene_types = sceneTypesRaw
      ? sceneTypesRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const provincesRaw = searchParams.get('provinces');
    const provinces = provincesRaw
      ? provincesRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      : [];

    const crew_size = searchParams.get('crew_size') || null;
    const shootMonthRaw = searchParams.get('shoot_month');
    const shoot_month = shootMonthRaw ? parseInt(shootMonthRaw, 10) : null;

    const criteria = {
      q,
      scene_types,
      provinces,
      crew_size,
      shoot_month
    };

    // Execute search with deterministic scoring
    const scoredResults = searchLocations(criteria);

    // Format output cards matching API contract
    const results = scoredResults.map(item => {
      const loc = item.location;
      return {
        location_id: item.location_id,
        slug: loc.slug,
        name_en: loc.name_en,
        name_vi: loc.name_vi,
        province_name: loc.province_name,
        province_id: loc.province_id,
        score: item.score,
        match_reasons: item.match_reasons,
        crew_capacity: loc.crew_capacity,
        availability: loc.availability,
        permit_complexity: loc.permit_complexity
      };
    });

    return Response.json(
      {
        results,
        count: results.length,
        criteria
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { error: 'Failed to execute location search', details: err.message },
      { status: 500 }
    );
  }
}
