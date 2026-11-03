// SC-01 Landing content (docs/screens/screen-spec-SC-01.md): dictionary keys only, no text here (SYS FR-006).
// Clarifications Q3: nothing on this page names VFDA or shows its logo until VFDA approves it in writing.
// D2 / SR-012: items whose module is not built yet are shown as "coming soon" and are not links.
// SR-013: the Article 13 strip waits for wording approved by the VFDA Legal Board.

const soon = (key, hint) => ({ key, hint, href: null, status: 'soon' });

export const LANDING = Object.freeze({
  eyebrow: 'landing.eyebrow',
  headline: 'landing.headline',
  lead: 'landing.lead',
  start: { key: 'landing.start', href: '/start' },
  quickCheck: { key: 'landing.quick_check', href: null, status: 'soon' },
  soon: 'landing.soon',
  uncertaintiesTitle: 'landing.uncertain.title',
  uncertainties: [
    soon('landing.uncertain.content', 'landing.uncertain.content_hint'),
    { key: 'landing.uncertain.where', hint: 'landing.uncertain.where_hint', href: '/locations/match', status: 'live' },
    soon('landing.uncertain.partner', 'landing.uncertain.partner_hint'),
    soon('landing.uncertain.deadline', 'landing.uncertain.deadline_hint')
  ],
  journeyTitle: 'landing.journey.title',
  journeyStep: 'landing.journey.step',
  journey: [1, 2, 3, 4, 5].map(n => ({ title: `landing.journey.${n}.title`, text: `landing.journey.${n}.text` }))
});

/** Every dictionary key the landing content uses. */
export function landingKeys(content) {
  const keys = [];
  const walk = (v) => {
    if (typeof v === 'string' && /^[a-z_]+(\.[a-z0-9_]+)+$/.test(v)) keys.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(content);
  return [...new Set(keys)];
}

/** The footer line: on the landing page it does not say "operated for VFDA" (Clarifications Q3). */
export const footerTextKey = (pathname) => (pathname === '/' ? 'frame.footer_landing' : 'frame.footer');
