import { getLocationDetail } from '../../../../lib/db/location-detail.js';
import { locationNotFound } from '../../../../lib/api/errors.js';

/**
 * Route Handler for public location detail (F-M3-13, BR-008).
 */
export async function GET(req, { params }) {
  try {
    const detail = getLocationDetail(params.slug);
    if (!detail) {
      return locationNotFound();
    }
    return Response.json(detail, { status: 200 });
  } catch (err) {
    console.error('Location detail error:', err);
    return Response.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to load location detail.' },
      { status: 500 }
    );
  }
}
