// SC-20 / SC-21 profile layers (BR-001): the shape follows the rows the source was allowed to read — RLS on Supabase,
// its twin on node:sqlite. Nothing is hidden here that was read, and nothing is added that was not.
import { isVerified } from './badge.js';

const asList = (v) => (Array.isArray(v) ? v : v ? JSON.parse(v) : []);

export function shapeProfile({ org, member, priv, approved, myRequest }, { today, signedIn }) {
  const verified = isVerified(org, today);
  const active = org.org_status !== 'deactivated';
  const out = {
    public: {
      org_id: org.org_id, slug: org.slug, org_name: org.org_name, legal_form: org.legal_form, founded_year: org.founded_year ?? null,
      hq_province: org.hq_province ?? null, service_groups: asList(org.service_groups), provinces: asList(org.provinces), verified,
      verified_at: verified ? org.verified_at : null, verified_until: verified ? org.verified_until : null,
      art13_eligible: Boolean(org.art13_eligible) && verified, active,
      checked: verified && approved ? { approved_at: approved.decided_at, references: asList(approved.reference_projects) } : null
    },
    layers: { public: true, member: false, private: false },
    my_request: myRequest ?? null
  };
  if (signedIn && active && member) {
    out.member = { capability_desc_vi: member.capability_desc_vi ?? null, capability_desc_en: member.capability_desc_en ?? null,
      portfolio: asList(member.portfolio), intl_project_count: Number(member.intl_project_count ?? 0), working_languages: asList(member.working_languages) };
    out.layers.member = true;
  }
  if (signedIn && active && priv) {
    out.private = { rate_card: priv.rate_card == null ? null : (typeof priv.rate_card === 'string' ? JSON.parse(priv.rate_card) : priv.rate_card),
      past_clients: asList(priv.past_clients), direct_contact: priv.direct_contact ?? null };
    out.layers.private = true;
  }
  return out;
}
