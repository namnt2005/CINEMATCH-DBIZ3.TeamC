import { resolveSessionRole } from '../../../../../lib/auth/session.js';
import { getPublishedLocationBySlug } from '../../../../../lib/db/locations.js';
import { canSeeAuthorityContact, getAuthorityContact } from '../../../../../lib/db/contacts.js';
import { locationNotFound } from '../../../../../lib/api/errors.js';

/**
 * Route Handler for the gated local authority contact (F-M3-15, BR-004, BR-005).
 * A guest is refused before anything is read, so the 401 carries no location or contact data.
 */
export async function GET(req, { params }) {
  try {
    const session = resolveSessionRole(req.headers);
    if (!canSeeAuthorityContact(session)) {
      return Response.json(
        {
          error: 'UNAUTHENTICATED',
          message: 'Local authority contacts are available to signed-in members only.',
          signup_url: '/auth/signup'
        },
        { status: 401 }
      );
    }

    const location = getPublishedLocationBySlug(params.slug);
    if (!location) {
      return locationNotFound();
    }

    const contact = getAuthorityContact(location.location_id, session);
    if (!contact) {
      return locationNotFound();
    }

    return Response.json(
      {
        location_id: contact.location_id,
        authority_name: contact.authority_name,
        contact_name: contact.contact_name,
        contact_phone: contact.contact_phone,
        contact_email: contact.contact_email,
        contact_verified: contact.contact_verified,
        verified_at: contact.verified_at
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Authority contact error:', err);
    return Response.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to load authority contact.' },
      { status: 500 }
    );
  }
}
