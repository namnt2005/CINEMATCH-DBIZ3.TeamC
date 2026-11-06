import fs from 'node:fs/promises';
import path from 'node:path';
import { getI18n } from '../../../lib/i18n/server.js';
import { NDA_DOCUMENT, NDA_VERSION } from '../../../lib/partners/nda.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('legal.nda.title')} · CINEMATCH` };
}

/** The full text of the standard mutual NDA (M4 Q4, FR-017; SC-25 *Non-disclosure agreement* link): a draft for VFDA. */
export default async function NdaPage() {
  const { t } = await getI18n();
  const text = await fs.readFile(path.join(process.cwd(), NDA_DOCUMENT), 'utf8').catch(() => '');
  return (
    <main style={{ maxWidth: '820px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('legal.nda.title')}</h1>
      <p role="note" style={{ background: '#fdf3dc', color: '#7c4a03', padding: '0.625rem 0.875rem', borderRadius: '0.5rem' }}>{t('legal.nda.draft', { version: NDA_VERSION })}</p>
      <pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', lineHeight: 1.55, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem' }}>{text}</pre>
    </main>
  );
}
