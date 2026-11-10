"""Row Level Security policy source for Supabase (specs/003-sys-core, data-model §3–§4, research R3).

One entry per policy: (table, operation, roles, condition). tools/build_supabase.py turns this list into
supabase/migrations/20261101000300_grants_rls.sql, with the grants each policy needs.

Roles: anon, signed_in (any active role), member, partner, vfda_staff, vfda_legal, admin.
app.has_role() lets admin satisfy vfda_staff and vfda_legal (decision D5); a deactivated account has
no role at all (app.current_role() = 'guest', BR-005). The System actor uses the secret key and has no
policy (decision D2). No DELETE policy or grant exists anywhere (BR-005, M3 BR-008, M0/M4 rules).
"""

SIGNED_IN = "app.current_role() <> 'guest'"
PUBLISHED_LOCATION = "intake_status = 'published' AND published"


def has(role):
    return f"app.has_role('{role}')"


def member_of(col='project_id'):
    return f"app.is_project_member({col})"


def org_user(org_col):
    """M4 D1: the caller acts for the organisation (inline, so it needs no function from a later migration)."""
    return (f"EXISTS (SELECT 1 FROM public.organisation_user ou WHERE ou.org_id = {org_col} AND ou.user_id = auth.uid()) "
            f"AND app.has_role('partner')")


def published(location_col):
    return (f"EXISTS (SELECT 1 FROM public.location l WHERE l.location_id = {location_col} "
            f"AND l.intake_status = 'published' AND l.published)")


# name: policy name (the data model's named policies keep their names)
# using / check: SQL conditions (check defaults to using for INSERT/UPDATE)
# columns: column-level UPDATE grant instead of a table-level one
POLICIES = [
    # ---- SYS -------------------------------------------------------------------------------
    dict(table='user_account', op='select', roles=['signed_in'], using='user_id = auth.uid()'),
    dict(table='user_account', op='select', roles=['admin'], using=has('admin'), name='rls_user_account_role_grant'),
    dict(table='producer_organisation', op='select', roles=['signed_in'],
         using='producer_org_id IN (SELECT p.producer_org_id FROM public.profile p WHERE p.user_id = auth.uid())'),
    dict(table='profile', op='select', roles=['signed_in'], using='user_id = auth.uid()'),
    dict(table='profile', op='update', roles=['signed_in'], using='user_id = auth.uid()',
         columns=['full_name', 'crew_role', 'locale']),
    dict(table='consent', op='select', roles=['signed_in'], using='user_id = auth.uid()'),
    dict(table='consent', op='insert', roles=['signed_in'], check='user_id = auth.uid()'),
    dict(table='notification', op='select', roles=['signed_in'], using='recipient_id = auth.uid()'),
    dict(table='notification', op='update', roles=['signed_in'], using='recipient_id = auth.uid()', columns=['read_at']),

    # ---- M1 / M0 -----------------------------------------------------------------------------
    dict(table='segment_requirement', op='select', roles=['signed_in'], using=SIGNED_IN),
    dict(table='segment_decision', op='insert', roles=['member'], check=f"{has('member')} AND {member_of()}"),
    dict(table='project', op='select', roles=['member'], using=member_of()),
    dict(table='project', op='insert', roles=['member'], check=has('member')),
    dict(table='project', op='update', roles=['member'], using=f"{member_of()} AND COALESCE(stage, '') <> 'archived'",
         check=member_of(), name='rls_project_archived_read_only'),
    dict(table='project_member', op='select', roles=['member'], using=member_of()),
    dict(table='project_member', op='insert', roles=['member'], check=f"{has('member')} AND {member_of()}"),
    dict(table='project_province', op='select', roles=['member'], using=member_of()),
    dict(table='project_province', op='insert', roles=['member'], check=f"{has('member')} AND {member_of()}"),
    dict(table='readiness_snapshot', op='select', roles=['member'], using=member_of()),

    # ---- M2 ----------------------------------------------------------------------------------
    dict(table='legal_rule', op='select', roles=['anon', 'signed_in'], using="status = 'approved' AND is_active",
         name='rls_public_reads_approved_only'),
    dict(table='legal_rule', op='select', roles=['vfda_legal'], using=has('vfda_legal')),
    dict(table='legal_rule', op='insert', roles=['vfda_legal'], check=has('vfda_legal')),
    dict(table='legal_rule', op='update', roles=['vfda_legal'], using=has('vfda_legal')),
    # M2 plan data-model §7 (09/11/2026): the version label for signed-in users (guests read it through the API);
    # pre-check and content-check runs for the members of their project
    dict(table='rule_set_version', op='select', roles=['signed_in'], using=SIGNED_IN),
    dict(table='precheck_run', op='select', roles=['member'],
         using="project_id IS NOT NULL AND app.is_project_member(project_id)"),
    dict(table='compliance_run', op='select', roles=['member'], using=member_of()),
    dict(table='precheck_finding', op='select', roles=['member'],
         using="EXISTS (SELECT 1 FROM public.precheck_run r WHERE r.brief_id = precheck_finding.brief_id "
               "AND r.project_id IS NOT NULL AND app.is_project_member(r.project_id))"),
    dict(table='compliance_finding', op='select', roles=['member'],
         using="EXISTS (SELECT 1 FROM public.compliance_run r WHERE r.run_id = compliance_finding.run_id "
               "AND app.is_project_member(r.project_id))"),
    dict(table='compliance_finding', op='update', roles=['member'],
         using="EXISTS (SELECT 1 FROM public.compliance_run r WHERE r.run_id = compliance_finding.run_id "
               "AND app.is_project_member(r.project_id))"),

    # ---- M3 ----------------------------------------------------------------------------------
    dict(table='province', op='select', roles=['anon', 'signed_in'], using='true'),
    dict(table='location', op='select', roles=['anon', 'signed_in'], using=PUBLISHED_LOCATION),
    dict(table='location', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='location_image', op='select', roles=['anon', 'signed_in'],
         using=f"status = 'approved' AND {published('location_image.location_id')}"),
    dict(table='location_image', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='location_image', op='insert', roles=['vfda_staff'], check=has('vfda_staff')),
    dict(table='location_image', op='update', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='authority_contact', op='select', roles=['signed_in'],
         using=f"{SIGNED_IN} AND contact_verified AND {published('authority_contact.location_id')}",
         name='rls_authority_contact_members'),
    dict(table='authority_contact', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='project_shortlist', op='select', roles=['member'], using=member_of()),
    dict(table='project_shortlist', op='insert', roles=['member'], check=f"{has('member')} AND {member_of()}"),

    # ---- M4 ----------------------------------------------------------------------------------
    dict(table='organisation', op='select', roles=['anon', 'signed_in'], using='true'),
    dict(table='organisation', op='update', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='organisation_member_layer', op='select', roles=['signed_in'], using=SIGNED_IN,
         name='rls_org_member_layer_members'),
    dict(table='organisation_member_layer', op='update', roles=['vfda_staff'], using=has('vfda_staff')),
    # M4 BR-001: layer 3 needs an accepted or confirmed request and the NDA of both parties (specs/007-m4-partners R3)
    dict(table='organisation_private_layer', op='select', roles=['member'], name='rls_org_private_after_nda',
         using="EXISTS (SELECT 1 FROM public.collab_request r WHERE r.org_id = organisation_private_layer.org_id "
               "AND r.status IN ('accepted', 'confirmed') AND app.is_project_member(r.project_id) "
               "AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted) "
               "AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted))"),
    dict(table='organisation_private_layer', op='select', roles=['partner'], name='rls_org_private_own',
         using=org_user('organisation_private_layer.org_id')),
    dict(table='organisation_user', op='select', roles=['signed_in'], using='user_id = auth.uid()'),
    dict(table='organisation_user', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='partner_invitation', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='verification_request', op='select', roles=['partner'], using=org_user('verification_request.org_id')),
    dict(table='collab_request', op='select', roles=['partner'], using=org_user('collab_request.org_id')),
    dict(table='collab_message', op='select', roles=['member', 'partner'],
         using="EXISTS (SELECT 1 FROM public.collab_request r WHERE r.request_id = collab_message.request_id "
               f"AND (app.is_project_member(r.project_id) OR ({org_user('r.org_id')})))"),
    dict(table='nda_acceptance', op='select', roles=['partner'],
         using=f"EXISTS (SELECT 1 FROM public.collab_request r WHERE r.request_id = nda_acceptance.request_id AND {org_user('r.org_id')})"),
    dict(table='verification_request', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='verification_request', op='update', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='collab_request', op='select', roles=['member'], using=member_of()),
    dict(table='collab_request', op='insert', roles=['member'], check=f"{has('member')} AND {member_of()}"),
    dict(table='nda_acceptance', op='select', roles=['member'],
         using="EXISTS (SELECT 1 FROM public.collab_request r WHERE r.request_id = nda_acceptance.request_id "
               "AND app.is_project_member(r.project_id))"),
    dict(table='document_access_log', op='select', roles=['member'],
         using="EXISTS (SELECT 1 FROM public.document d WHERE d.document_id = document_access_log.document_id "
               "AND app.is_project_member(d.project_id))"),

    # ---- M5 ----------------------------------------------------------------------------------
    dict(table='document_type', op='select', roles=['signed_in'], using=SIGNED_IN),
    dict(table='document_slot', op='select', roles=['member'], using=member_of()),
    dict(table='document', op='select', roles=['member'], using=member_of(), name='rls_document_project_members'),
    dict(table='document', op='insert', roles=['member'], check=f"{member_of()} AND uploaded_by = auth.uid()"),
    dict(table='public_holiday', op='select', roles=['signed_in'], using=SIGNED_IN),

    # ---- M7 ----------------------------------------------------------------------------------
    dict(table='location_interest', op='select', roles=['member'], using=member_of()),
    dict(table='location_interest', op='insert', roles=['member'], check=f"{has('member')} AND {member_of()}"),
    dict(table='province_notice', op='select', roles=['member'],
         using="EXISTS (SELECT 1 FROM public.location_interest i WHERE i.interest_id = province_notice.interest_id "
               "AND app.is_project_member(i.project_id))"),
    dict(table='consultation_booking', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='consultation_booking', op='select', roles=['member'], using='member_id = auth.uid()'),
    dict(table='consultation_booking', op='insert', roles=['member'], check=f"{has('member')} AND member_id = auth.uid()"),
    dict(table='consultation_booking', op='update', roles=['vfda_staff'], using=has('vfda_staff')),

    # ---- M10 ---------------------------------------------------------------------------------
    dict(table='moderation_item', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='moderation_item', op='update', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='audit_log', op='select', roles=['admin'], using=has('admin')),
    dict(table='quarterly_report', op='select', roles=['vfda_staff'], using=has('vfda_staff')),
    dict(table='quarterly_report', op='update', roles=['vfda_staff'], using=has('vfda_staff')),
]

# Human (table, operation, actor) of data/02-crud-matrix.md with no policy yet, and why (research open questions).
# M4 partner writes stay here on purpose: since specs/007-m4-partners they go only through the SECURITY DEFINER
# functions of supabase/migrations/20261106000200_m4_partners.sql (no direct write policy, research R4).
DEFERRED = [
    ('bilingual_paragraph', 'update', 'Partner', 13),
    ('collab_message', 'insert', 'Partner', 13),
    ('collab_request', 'update', 'Partner', 13),
    ('moderation_item', 'insert', 'Partner', 13),
    ('nda_acceptance', 'insert', 'Partner', 13),
    ('organisation', 'insert', 'Partner', 13),
    ('organisation', 'update', 'Partner', 13),
    ('organisation_member_layer', 'insert', 'Partner', 13),
    ('organisation_member_layer', 'update', 'Partner', 13),
    ('organisation_member_layer', 'select', 'Guest', 14),
    ('organisation_private_layer', 'insert', 'Partner', 13),
    ('organisation_private_layer', 'update', 'Partner', 13),
    ('verification_request', 'insert', 'Partner', 13),
    ('province_notice', 'update', 'Province', 1),
]

# anon may read these five tables only (data-model §4)
ANON_TABLES = ['province', 'location', 'location_image', 'legal_rule', 'organisation']
