-- Local database rules for node:sqlite, run by lib/db/client.js AFTER the seed is loaded
-- (the seed inserts published locations before their authority contacts).
-- Supabase gets the same rules as PostgreSQL triggers (specs/002-m3-publish/research.md R1).

-- M3 BR-004 / FR-005: a location becomes published only with a verified authority contact.
-- Fires only when a location BECOMES published, so editing a contact later does not unpublish it (decision D4).
CREATE TRIGGER trg_location_publish_needs_contact
BEFORE UPDATE OF intake_status, published ON location
WHEN (NEW.intake_status = 'published' OR CAST(NEW.published AS TEXT) = 'true')
  AND NOT (OLD.intake_status = 'published' AND CAST(OLD.published AS TEXT) = 'true')
  AND NOT EXISTS (
    SELECT 1 FROM authority_contact c
    WHERE c.location_id = NEW.location_id AND CAST(c.contact_verified AS TEXT) IN ('true', '1')
  )
BEGIN
  SELECT RAISE(ABORT, 'Authority contact not verified (M3 BR-004).');
END;

-- No contact can exist before its location, so a location is never inserted already published.
CREATE TRIGGER trg_location_publish_needs_contact_insert
BEFORE INSERT ON location
WHEN NEW.intake_status = 'published' OR CAST(NEW.published AS TEXT) = 'true'
BEGIN
  SELECT RAISE(ABORT, 'Authority contact not verified (M3 BR-004).');
END;

-- M10 BR-005: audit records are append-only.
CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'Audit records are append-only (M10 BR-005).');
END;

CREATE TRIGGER trg_audit_log_append_only_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'Audit records are append-only (M10 BR-005).');
END;
