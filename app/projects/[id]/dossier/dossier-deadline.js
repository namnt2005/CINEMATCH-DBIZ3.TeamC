// The deadline line of SC-27 (M2 plan D13): the same getTimeline() as SC-29 and the SC-12 strip (SR-173).
import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getTimeline } from '../../../../lib/db/timeline.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import { dossierLine, vnDate } from '../../../../lib/licensing/view.js';

export default async function DossierDeadline({ projectId }) {
  const { t } = await getI18n();
  const session = await getSession({ headers: headers() });
  const line = dossierLine(await getTimeline(session, projectId).catch(() => null));
  return (
    <p style={{ margin: 0 }}>
      {line ? <>{t('dossier.deadline.line', { recommended: vnDate(line.recommended), latest: vnDate(line.latest) })} · </> : null}
      <a href={`/projects/${projectId}/timeline`} style={{ color: '#2563eb' }}>{t('dossier.countdown')}</a>
    </p>
  );
}
