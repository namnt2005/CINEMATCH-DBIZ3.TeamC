import LegalPage from '../components/legal/legal-page.js';

/** SC-42 Privacy policy (/privacy, ?version= for an earlier version). */
export default function PrivacyPage({ searchParams }) {
  return <LegalPage kind="privacy" version={typeof searchParams?.version === 'string' ? searchParams.version : undefined} />;
}
