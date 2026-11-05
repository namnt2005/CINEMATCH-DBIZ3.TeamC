'use client';
// SC-02, in the order of docs/screens/screen-spec-SC-02.md: progress (#2) → question 1 (#3) → questions 2
// and 3 (#4–#5) → question 4 (#6) → See the result, locked until the required answers are there →
// result with the reason (#8–#9) and the Needed / Not needed table from segment_requirement (#10) →
// Create a project with this segment (#11, sign-in needed) and Choose another segment (#12).
import { useEffect, useState } from 'react';
import { useLocale, useSignedIn, useT } from '../../lib/i18n/client.js';
import { decide, splitRequirements, needsLegalCaveat } from '../../lib/router/decide.js';
import { RELEASES, PRODUCERS, NEEDS } from '../../lib/router/answers.js';
import {
  EMPTY_ANSWERS, progress, visibleQuestions, setAnswer, isComplete, reasonText, confirmAction,
  saveAnswers, loadAnswers, chooseCard, saveResult, shownSegment, chosenByYou, cardsFor
} from './router-view.js';

const C = { navy: '#0f2d52', text: '#111827', muted: '#6b7280', border: '#e5e7eb', blue: '#2563eb', green: '#15803d', red: '#b91c1c' };
const card = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', background: '#fff', padding: '1rem 1.25rem' };
const pill = (on) => ({
  display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '9999px', cursor: 'pointer',
  border: `1px solid ${on ? C.navy : C.border}`, background: on ? '#e8eef7' : '#fff', fontWeight: on ? 600 : 400
});
const hidden = { position: 'absolute', opacity: 0, width: 1, height: 1 };

const QUESTIONS = {
  1: { field: 'q1_shoot_in_vn', options: [[true, 'router.q1.yes'], [false, 'router.q1.no']], label: 'router.q1' },
  2: { field: 'q2_release', options: RELEASES.map(v => [v, `router.q2.${v}`]), label: 'router.q2' },
  3: { field: 'q3_producer', options: PRODUCERS.map(v => [v, `router.q3.${v}`]), label: 'router.q3' }
};

async function send(method, path, body) {
  try {
    const res = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function ChoiceQuestion({ n, answers, onAnswer, editing, onEdit }) {
  const t = useT();
  const q = QUESTIONS[n];
  const value = answers[q.field];
  const answered = value !== null && value !== undefined;
  const label = q.options.find(([v]) => v === value)?.[1];
  return (
    <fieldset style={{ ...card, margin: 0 }}>
      <legend style={{ padding: 0, float: 'left', width: '100%' }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: C.muted }}>
          <span>{t('router.question_n', { n })}</span>
          {answered && !editing ? <button type="button" onClick={onEdit} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', padding: 0 }}>{t('router.edit')}</button> : null}
        </span>
        <span style={{ display: 'block', fontWeight: 600, margin: '0.375rem 0 0.75rem', color: C.text }}>{t(q.label)}</span>
      </legend>
      {answered && !editing ? (
        <p style={{ clear: 'both', margin: 0 }}><span style={pill(true)}>{t(label)}</span></p>
      ) : (
        <div style={{ clear: 'both', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {q.options.map(([v, key]) => (
            <label key={String(v)} style={pill(value === v)}>
              <input type="radio" name={q.field} checked={value === v} onChange={() => onAnswer(q.field, v)} style={hidden} />
              {t(key)}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function NeedsQuestion({ answers, onAnswer }) {
  const t = useT();
  const list = answers.q4_needs || [];
  const toggle = (need) => onAnswer('q4_needs', list.includes(need) ? list.filter(x => x !== need) : [...list, need]);
  return (
    <fieldset style={{ ...card, margin: 0 }}>
      <legend style={{ padding: 0, float: 'left', width: '100%' }}>
        <span style={{ display: 'block', fontSize: '0.8125rem', color: C.muted }}>{t('router.question_n', { n: 4 })} {t('router.optional')}</span>
        <span style={{ display: 'block', fontWeight: 600, margin: '0.375rem 0 0.75rem', color: C.text }}>{t('router.q4')}</span>
      </legend>
      <div style={{ clear: 'both', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {NEEDS.map(need => (
          <label key={need} style={pill(list.includes(need))}>
            <input type="checkbox" checked={list.includes(need)} onChange={() => toggle(need)} style={hidden} />
            {list.includes(need) ? '✓ ' : ''}{t(`router.q4.${need}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SegmentCard({ letter, onPick }) {
  const t = useT();
  return (
    <button type="button" onClick={() => onPick(letter)} style={{ ...card, textAlign: 'left', cursor: 'pointer', flex: '1 1 12rem' }}>
      <strong>{t('router.segment_label', { letter })}</strong>
      <span style={{ display: 'block', color: C.muted, fontSize: '0.875rem', marginTop: '0.25rem' }}>{t(`router.segment.${letter}`)}</span>
    </button>
  );
}

function Result({ result, view, requirements, onPick }) {
  const t = useT();
  const locale = useLocale();
  const signedIn = useSignedIn();
  const [showOthers, setShowOthers] = useState(false);
  const segment = shownSegment(view);
  const action = confirmAction({ signedIn, segment });
  const list = splitRequirements(segment, requirements, locale);

  if (!segment) {
    // SC-02 Error state: no rule matches — choose directly or ask VFDA, with the three cards
    return (
      <div>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>{t('router.no_match.title')}</h2>
        <p style={{ margin: '0 0 1rem', color: '#374151' }}>{t('router.no_match.text')}</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {cardsFor(view).map(letter => <SegmentCard key={letter} letter={letter} onPick={onPick} />)}
        </div>
        <p style={{ color: C.muted, fontSize: '0.875rem' }}>{t('router.ask_vfda')} · {t('landing.soon')}</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('router.result')}</p>
      <h2 style={{ fontSize: '1.375rem', margin: '0.25rem 0' }}>
        <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>{segment}</span>{t(`router.segment.${segment}`)}
      </h2>
      {chosenByYou(view) ? (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>
          <strong>{t('router.chosen')}</strong>
          {view.computed ? <span style={{ color: C.muted }}> · {t('router.suggested', { name: t('router.segment_label', { letter: view.computed }) })}</span> : null}
        </p>
      ) : (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#374151' }}>
          {reasonText(t, result.decided_by)} {t('router.reason_q4')}
        </p>
      )}
      {view.saved === 'failed' ? <p role="alert" style={{ color: C.red, fontSize: '0.875rem', margin: '0 0 0.5rem' }}>{t('router.save_failed')}</p> : null}

      <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.5rem' }}>{t('router.means')}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: C.muted, fontSize: '0.8125rem' }}>
            <th style={{ padding: '0.25rem 0', width: '7rem' }} scope="col">{t('router.needed')} / {t('router.not_needed')}</th>
            <th scope="col">{t('router.requirement')}</th>
          </tr>
        </thead>
        <tbody>
          {[...list.needed.map(r => ({ ...r, needed: true })), ...list.not_needed.map(r => ({ ...r, needed: false }))].map(r => (
            <tr key={r.code} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: '0.5rem 0', fontWeight: 600, color: r.needed ? C.green : C.muted }}>{r.needed ? t('router.needed') : t('router.not_needed')}</td>
              <td style={{ padding: '0.5rem 0' }}>{r.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {needsLegalCaveat(segment) ? (
        <p role="note" style={{ background: '#fdf3dc', border: '1px solid #f0d9a8', color: '#7c4a03', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', margin: '0.75rem 0 0' }}>{t('router.caveat')}</p>
      ) : null}

      <div style={{ marginTop: '1.25rem' }}>
        <a href={action.href} style={{ display: 'block', textAlign: 'center', background: C.navy, color: '#fff', padding: '0.875rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600 }}>
          {t('router.create')}{signedIn ? null : <span style={{ fontWeight: 400, opacity: 0.8 }}> · {t('router.create_login')}</span>}
        </a>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button type="button" aria-expanded={showOthers} onClick={() => setShowOthers(v => !v)}
          style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.5rem 0.875rem', cursor: 'pointer', width: '100%' }}>
          {t('router.other')}
        </button>
        {showOthers ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            {cardsFor(view).map(letter => <SegmentCard key={letter} letter={letter} onPick={onPick} />)}
          </div>
        ) : null}
        <p style={{ color: C.muted, fontSize: '0.875rem' }}>{t('router.ask_vfda')} · {t('landing.soon')}</p>
      </div>
    </div>
  );
}

export default function RouterForm({ rules, requirements }) {
  const t = useT();
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [editing, setEditing] = useState(null);
  const [result, setResult] = useState(null);   // { id, decided_by }
  const [view, setView] = useState(null);       // { computed, override, saved }
  const [stale, setStale] = useState(false);

  // Answers in progress are kept in this tab only; nothing reaches the server before See the result (spec §3)
  useEffect(() => { setAnswers(loadAnswers(window.sessionStorage)); }, []);

  function onAnswer(field, value) {
    const next = setAnswer(answers, field, value);
    setAnswers(next);
    saveAnswers(window.sessionStorage, next);
    setEditing(null);
    if (result) setStale(true);
  }

  async function seeResult() {
    if (!isComplete(answers)) return;
    const body = { ...answers, q4_needs: answers.q4_needs || [] };
    const local = decide(body, rules); // instant, from the same table the server uses (BR-001)
    setResult({ id: null, decided_by: local.decided_by });
    setView({ computed: local.segment, override: null, saved: 'pending' });
    setStale(false);
    const stored = await send('POST', '/api/router/decisions', body);
    setResult({ id: stored?.segment_decision_id ?? null, decided_by: stored?.decided_by ?? local.decided_by });
    setView(v => saveResult({ ...v, computed: stored ? stored.segment : v.computed }, Boolean(stored)));
  }

  async function onPick(letter) {
    const next = chooseCard(view, letter);
    setView(next);
    // BR-003: every choice is recorded on the stored row
    const saved = result?.id ? await send('PATCH', `/api/router/decisions/${result.id}`, { segment_override: letter }) : null;
    setView(v => saveResult(v, Boolean(saved)));
  }

  const shown = visibleQuestions(answers);
  const complete = isComplete(answers);
  const done = progress(answers);

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', margin: '0 0 0.25rem' }}>{t('router.title')}</h1>
          <p style={{ margin: 0, color: C.muted }}>{t('router.lead')}</p>
        </div>
        <div style={{ minWidth: '12rem' }} aria-live="polite">
          <div style={{ fontSize: '0.8125rem', color: C.muted, textAlign: 'right' }}>{t('router.progress', { n: done })}</div>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={done} aria-label={t('router.progress', { n: done })}
            style={{ height: '0.375rem', background: C.border, borderRadius: '9999px', marginTop: '0.375rem' }}>
            <div style={{ width: `${(done / 4) * 100}%`, height: '100%', background: C.navy, borderRadius: '9999px' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1.5rem' }}>
        <section style={{ flex: '1 1 26rem', minWidth: 0, display: 'grid', gap: '0.875rem' }}>
          {shown.filter(n => n !== 4).map(n => (
            <ChoiceQuestion key={n} n={n} answers={answers} onAnswer={onAnswer} editing={editing === n} onEdit={() => setEditing(n)} />
          ))}
          {shown.includes(4) ? <NeedsQuestion answers={answers} onAnswer={onAnswer} /> : null}
          <div>
            <button type="button" disabled={!complete} onClick={seeResult} aria-describedby={complete ? undefined : 'see-hint'}
              style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, fontSize: '1rem', color: '#fff', background: complete ? C.navy : '#94a3b8', cursor: complete ? 'pointer' : 'not-allowed' }}>
              {t('router.see_result')}
            </button>
            {complete ? null : <p id="see-hint" style={{ color: C.muted, fontSize: '0.8125rem', margin: '0.375rem 0 0' }}>{t('router.see_result_hint')}</p>}
          </div>
        </section>

        <section aria-live="polite" style={{ ...card, flex: '1 1 24rem', minWidth: 0, borderColor: result && !stale ? C.navy : C.border, borderWidth: result && !stale ? 2 : 1 }}>
          {!result ? <p style={{ color: C.muted, margin: 0 }}>{t('router.empty')}</p>
            : stale ? <p style={{ color: C.muted, margin: 0 }}>{t('router.stale')}</p>
              : <Result result={result} view={view} requirements={requirements} onPick={onPick} />}
        </section>
      </div>
    </main>
  );
}
