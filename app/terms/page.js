import LegalPage from '../components/legal/legal-page.js';

export const dynamic = 'force-dynamic';

/** SC-43 Terms of use (/terms, ?version= for an earlier version). */
export default function TermsPage({ searchParams }) {
  return <LegalPage kind="terms" version={typeof searchParams?.version === 'string' ? searchParams.version : undefined} />;
}
