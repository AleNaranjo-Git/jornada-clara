import { useEffect, useMemo, useRef, useState } from 'react';
import { BRAND } from './config/branding.ts';
import { previewSchedule, summarizeSchedule } from './domain/cycles/calculator.ts';
import { createPreset, PRESETS, type PresetId } from './domain/cycles/presets.ts';
import type { ScheduleRequest, ShiftDay, ShiftKind } from './domain/cycles/types.ts';
import { estimateIllustrativeOvertime } from './domain/pay/estimate.ts';
import { summarizeSettlement } from './domain/pay/settlement.ts';
import { localizeError, translations, type Locale } from './i18n/translations.ts';

type PresetSelection = PresetId | 'custom';
const INITIAL_START = '2025-01-01';
const INITIAL_END = '2026-01-25'; // 390 inclusive calendar days
const KIND_INITIALS: Record<ShiftKind, string> = { diurno: 'D', nocturno: 'N', mixto: 'M', libre: 'L' };

/** Prefer a previously selected language, otherwise the browser preference. */
function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem('jornada-clara-locale');
    if (stored === 'es' || stored === 'en') return stored;
  } catch { /* Browsers may block local storage; the selector still works. */ }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function compute(request: ScheduleRequest) {
  try {
    return {
      summary: summarizeSchedule(request),
      preview: previewSchedule(request, 12),
      error: null as string | null,
    };
  } catch (error) {
    return {
      summary: null,
      preview: [] as ReturnType<typeof previewSchedule>,
      error: error instanceof Error ? error.message : 'No se pudo procesar el cálculo.',
    };
  }
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = translations[locale];
  const [preset, setPreset] = useState<PresetSelection>('222');
  const [cycle, setCycle] = useState<ShiftDay[]>(() => createPreset('222'));
  const [startDate, setStartDate] = useState(INITIAL_START);
  const [endDate, setEndDate] = useState(INITIAL_END);
  const [startingDayInCycle, setStartingDayInCycle] = useState(1);
  const [salaryInput, setSalaryInput] = useState('413000');
  const [noticeInput, setNoticeInput] = useState('');
  const [severanceInput, setSeveranceInput] = useState('');
  const [wagesInput, setWagesInput] = useState('');
  const idCounter = useRef(0);
  const request: ScheduleRequest = { startDate, endDate, cycle, startingDayInCycle };

  const { summary, preview, error } = useMemo(
    () => compute(request),
    [startDate, endDate, cycle, startingDayInCycle],
  );

  const salary = Number(salaryInput);
  const validSalary = salaryInput.trim() !== '' && Number.isFinite(salary) && salary >= 0;
  const estimate = useMemo(() => {
    if (!summary || !validSalary) return null;
    try {
      return estimateIllustrativeOvertime(request, salary);
    } catch {
      return null;
    }
  }, [summary, validSalary, salary, startDate, endDate, cycle, startingDayInCycle]);

  const pendingValues = [noticeInput, severanceInput, wagesInput];
  const validPending = pendingValues.every((value) => value.trim() === '' || (Number.isFinite(Number(value)) && Number(value) >= 0));
  const settlement = useMemo(() => {
    if (!estimate || !validPending) return null;
    return summarizeSettlement(estimate.total, {
      notice: noticeInput ? Number(noticeInput) : 0,
      severance: severanceInput ? Number(severanceInput) : 0,
      wages: wagesInput ? Number(wagesInput) : 0,
    });
  }, [estimate, validPending, noticeInput, severanceInput, wagesInput]);

  useEffect(() => {
    try { window.localStorage.setItem('jornada-clara-locale', locale); } catch { /* Optional preference only. */ }
    document.documentElement.lang = locale === 'es' ? 'es-CR' : 'en';
    document.title = t.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.pageDescription);
  }, [locale, t.pageTitle, t.pageDescription]);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale === 'es' ? 'es-CR' : 'en-US', {
    day: '2-digit', month: 'short', timeZone: 'UTC',
  }), [locale]);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale === 'es' ? 'es-CR' : 'en-US', {
    maximumFractionDigits: 2,
  }), [locale]);
  const moneyFormatter = useMemo(() => new Intl.NumberFormat(locale === 'es' ? 'es-CR' : 'en-US', {
    style: 'currency', currency: 'CRC', maximumFractionDigits: 2,
  }), [locale]);
  const formatDate = (iso: string) => dateFormatter.format(new Date(`${iso}T00:00:00.000Z`));
  const num = (value: number) => numberFormatter.format(value);
  const money = (value: number) => moneyFormatter.format(value);

  function selectPreset(selection: PresetSelection) {
    setPreset(selection);
    if (selection !== 'custom') {
      setCycle(createPreset(selection));
      setStartingDayInCycle(1);
    }
  }
  function updateCycle(updater: (previous: ShiftDay[]) => ShiftDay[]) {
    setCycle(updater);
    setPreset('custom');
  }
  function changeKind(id: string, kind: ShiftKind) {
    updateCycle((previous) => previous.map((day) => day.id !== id ? day : {
      ...day, kind,
      hours: kind === 'libre' ? 0 : kind === 'mixto' ? 8 : day.kind === 'libre' ? 12 : day.hours,
    }));
  }
  function changeHours(id: string, hours: number) {
    updateCycle((previous) => previous.map((day) => day.id === id ? { ...day, hours } : day));
  }
  function addDay(kind: ShiftKind) {
    idCounter.current += 1;
    updateCycle((previous) => [...previous, { id: `custom-${idCounter.current}`, kind, hours: kind === 'libre' ? 0 : kind === 'mixto' ? 8 : 12 }]);
  }
  function removeDay(id: string) {
    if (cycle.length < 2) return;
    updateCycle((previous) => previous.filter((day) => day.id !== id));
    setStartingDayInCycle((previous) => Math.min(previous, cycle.length - 1));
  }
  function moveDay(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= cycle.length) return;
    updateCycle((previous) => {
      const updated = [...previous];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  }
  function resetExample() {
    setPreset('222');
    setCycle(createPreset('222'));
    setStartDate(INITIAL_START);
    setEndDate(INITIAL_END);
    setStartingDayInCycle(1);
    setSalaryInput('413000');
    setNoticeInput('');
    setSeveranceInput('');
    setWagesInput('');
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#inicio" aria-label={t.brand}>
            <span className="brand-mark" aria-hidden="true">≡</span>
            <span>{BRAND.name}</span>
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-kicker">{t.projectStatus}</span>
          </a>
          <div className="topbar-actions">
            <a className="header-link" href="#calculadora">{t.explore} <span aria-hidden="true">↗</span></a>
            <div className="language-picker" role="group" aria-label={t.languageLabel}>
              <button type="button" lang="es" onClick={() => setLocale('es')} className={locale === 'es' ? 'active' : ''} aria-pressed={locale === 'es'}>ES</button>
              <button type="button" lang="en" onClick={() => setLocale('en')} className={locale === 'en' ? 'active' : ''} aria-pressed={locale === 'en'}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" />{t.heroEyebrow}</div>
            <h1>{t.heroTitle} <em>{t.heroHighlight}</em></h1>
            <p>{t.heroDescription}</p>
            <a className="primary-link" href="#calculadora">{t.heroCta} <span aria-hidden="true">→</span></a>
          </div>
          <aside className="hero-visual" aria-label={t.heroPattern}>
            <div className="visual-heading"><span>{t.heroPattern}</span><span className="visual-chip">2 × 2 × 2</span></div>
            <div className="hero-cycle">
              {createPreset('222').map((day, i) => (
                <div className={`hero-day kind-${day.kind}`} key={day.id}>
                  <span>{`0${i + 1}`}</span><strong>{KIND_INITIALS[day.kind]}</strong><small>{t.kinds[day.kind]}</small>
                </div>
              ))}
            </div>
            <div className="visual-bottom"><span>{t.heroCycleFooter}</span><span>→</span></div>
          </aside>
        </section>

        <section className="workspace" id="calculadora">
          <div className="section-head">
            <div><div className="section-overline">{t.tool}</div><h2>{t.sectionTitle}</h2><p>{t.sectionDescription}</p></div>
            <button className="reset-button" type="button" onClick={resetExample}>{t.reset}</button>
          </div>

          <div className="workspace-grid">
            <div className="form-panel">
              <div className="panel-step"><span className="step-number">01</span><div><h3>{t.cycleTypeTitle}</h3><p>{t.cycleTypeDesc}</p></div></div>
              <div className="preset-grid">
                {PRESETS.map((option) => (
                  <button key={option.id} className={`preset-button ${preset === option.id ? 'is-selected' : ''}`} type="button" onClick={() => selectPreset(option.id)} aria-pressed={preset === option.id}>
                    <strong>{option.name}</strong><small>{t.presetDescriptions[option.id]}</small>
                  </button>
                ))}
                <button className={`preset-button ${preset === 'custom' ? 'is-selected' : ''}`} type="button" onClick={() => setPreset('custom')} aria-pressed={preset === 'custom'}>
                  <strong>{t.custom}</strong><small>{t.customDescription}</small>
                </button>
              </div>

              <div className="cycle-editor-heading"><strong>{t.cycleSequence}</strong><span>{cycle.length} {t.daysTotal}</span></div>
              <div className="cycle-strip" aria-label={t.cycleSequence}>
                {cycle.map((shift, index) => (
                  <div key={shift.id} className={`cycle-tile kind-${shift.kind}`} title={`${t.day} ${index + 1}: ${t.kinds[shift.kind]}, ${num(shift.hours)} h`}>
                    <small>{index + 1}</small><strong>{KIND_INITIALS[shift.kind]}</strong>
                  </div>
                ))}
              </div>
              <div className="legend">
                <span><i className="dot day-dot" />{t.kinds.diurno}</span><span><i className="dot night-dot" />{t.kinds.nocturno}</span><span><i className="dot mixed-dot" />{t.kinds.mixto}</span><span><i className="dot off-dot" />{t.kinds.libre}</span>
              </div>

              {preset === 'custom' ? (
                <div className="custom-editor">
                  <div className="custom-editor-title">{t.editSequence}</div>
                  {cycle.map((day, index) => (
                    <div className="custom-row" key={day.id}>
                      <span className="custom-index">{index + 1}</span>
                      <select aria-label={`${t.day} ${index + 1}`} value={day.kind} onChange={(e) => changeKind(day.id, e.target.value as ShiftKind)}>
                        {(['diurno', 'nocturno', 'mixto', 'libre'] as const).map((kind) => <option key={kind} value={kind}>{t.kinds[kind]}</option>)}
                      </select>
                      <label className="hours-label">
                        <span className="visually-hidden">{t.scheduledHoursDay} {index + 1}</span>
                        <input type="number" min="0" max="24" step="0.5" value={day.hours} disabled={day.kind === 'libre'} onChange={(e) => changeHours(day.id, Number(e.target.value))} />
                        <span>h</span>
                      </label>
                      <button className="icon-button" type="button" aria-label={`${t.upDay} ${index + 1}`} disabled={index === 0} onClick={() => moveDay(index, -1)}>↑</button>
                      <button className="icon-button" type="button" aria-label={`${t.downDay} ${index + 1}`} disabled={index === cycle.length - 1} onClick={() => moveDay(index, 1)}>↓</button>
                      <button className="icon-button remove-button" type="button" aria-label={`${t.removeDay} ${index + 1}`} disabled={cycle.length === 1} onClick={() => removeDay(day.id)}>×</button>
                    </div>
                  ))}
                  <div className="add-buttons">
                    {(['diurno', 'nocturno', 'mixto', 'libre'] as const).map((kind) => <button key={kind} type="button" onClick={() => addDay(kind)}>+ {t.kinds[kind]}</button>)}
                  </div>
                </div>
              ) : <button className="text-button" type="button" onClick={() => setPreset('custom')}>{t.editThisCycle} <span aria-hidden="true">→</span></button>}

              <div className="panel-divider" />
              <div className="panel-step"><span className="step-number">02</span><div><h3>{t.periodTitle}</h3><p>{t.periodDesc}</p></div></div>
              <div className="input-grid">
                <label>{t.startDate}<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
                <label>{t.endDate}<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
                <label className="full-row">{t.startingPosition}
                  <select value={Math.min(startingDayInCycle, cycle.length)} onChange={(e) => setStartingDayInCycle(Number(e.target.value))}>
                    {cycle.map((shift, index) => <option key={`${shift.id}-${index}`} value={index + 1}>{t.day} {index + 1} — {t.kinds[shift.kind]}</option>)}
                  </select>
                </label>
              </div>
              <p className="helper-note">{t.startingHelp}</p>

              <div className="panel-divider" />
              <div className="panel-step"><span className="step-number">03</span><div><h3>{t.salaryTitle}</h3><p>{t.salaryDesc}</p></div></div>
              <div className="input-grid">
                <label className="full-row">{t.salaryLabel}
                  <input type="number" min="0" step="0.01" inputMode="decimal" value={salaryInput} onChange={(e) => setSalaryInput(e.target.value)} aria-invalid={!validSalary} />
                </label>
              </div>
              {!validSalary && <div className="input-error" role="alert">{t.invalidSalary}</div>}
              <p className="helper-note">{t.salaryHelp}</p>
              <div className="panel-divider" />
              <div className="panel-step"><span className="step-number">04</span><div><h3>{t.pendingTitleForm}</h3><p>{t.pendingFormHelp}</p></div></div>
              <div className="input-grid">
                {([
                  { label: t.pendingNotice, value: noticeInput, set: setNoticeInput },
                  { label: t.pendingSeverance, value: severanceInput, set: setSeveranceInput },
                  { label: t.pendingWages, value: wagesInput, set: setWagesInput },
                ] as const).map((field) => (
                  <label key={field.label}>{field.label}
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={field.value} placeholder="0"
                      onChange={(e) => field.set(e.target.value)} aria-invalid={field.value.trim() !== '' && (!Number.isFinite(Number(field.value)) || Number(field.value) < 0)} />
                  </label>
                ))}
              </div>
              {!validPending && <div className="input-error" role="alert">{t.invalidPending}</div>}
              <p className="helper-note">{t.pendingFormNotice}</p>
              <div className="math-note assumption-note"><span>{t.moneyStatus}</span><p>{t.financialAssumptions}</p></div>
            </div>

            <div className="result-column" id="results">
              <div className="print-only print-heading"><h1>{BRAND.name}</h1><p>{t.printReport}</p><p>{t.printPeriod}: {startDate} — {endDate}</p>
                <p>{t.printCycle}: {cycle.map((shift) => `${t.kinds[shift.kind]} (${shift.hours} h)`).join(' · ')}</p>
                <p>{t.printPhase}: {startingDayInCycle} · {t.printSalary}: {validSalary ? money(salary) : '—'}</p>
                <p>{t.printCreated}: {new Intl.DateTimeFormat(locale === 'es' ? 'es-CR' : 'en-US', { dateStyle: 'long' }).format(new Date())}</p>
              </div>
              <div className="result-panel">
                <div className="results-heading"><div><div className="section-overline">{t.summaryLabel}</div><h3>{t.summaryTitle}</h3></div><span className="calculating-tag">{t.calendarTag}</span></div>
                {error ? <div className="error-message" role="alert">{localizeError(error, locale)}</div> : summary && (
                  <>
                    <div className="big-metric"><strong>{num(summary.totalDays)}</strong><span>{t.calendarDays}</span></div>
                    <div className="mini-stats">
                      <div><strong>{num(summary.completeCycles)}</strong><span>{t.completeCycles}</span></div>
                      <div><strong>{num(summary.remainingDays)}</strong><span>{t.remainingDays}</span></div>
                      <div><strong>{num(summary.scheduledHours)}</strong><span>{t.scheduledHours}</span></div>
                    </div>
                    <div className="metric-list">
                      <div><span><i className="dot day-dot" />{t.kindPlurals.diurno}</span><strong>{num(summary.counts.diurno)} {t.days}</strong></div>
                      <div><span><i className="dot night-dot" />{t.kindPlurals.nocturno}</span><strong>{num(summary.counts.nocturno)} {t.days}</strong></div>
                      <div><span><i className="dot mixed-dot" />{t.kindPlurals.mixto}</span><strong>{num(summary.counts.mixto)} {t.days}</strong></div>
                      <div><span><i className="dot off-dot" />{t.kindPlurals.libre}</span><strong>{num(summary.counts.libre)} {t.days}</strong></div>
                    </div>
                    <div className="math-note"><span>{t.howCalculated}</span><p>{num(summary.totalDays)} {t.days} ÷ {summary.cycleLength} {t.perCycle} = <strong>{num(summary.completeCycles)} {t.cyclesComplete}</strong> + <strong>{num(summary.remainingDays)} {t.additionalDays}</strong>.</p></div>
                  </>
                )}
              </div>

              {summary && estimate && <div className="result-panel pay-panel">
                <div className="results-heading"><div><div className="section-overline">{t.moneyStatus}</div><h3>{t.moneyTitle}</h3></div></div>
                <div className="metric-list">
                  <div><span>{t.monthlyBasis}</span><strong>{money(estimate.dailySalary)}</strong></div>
                  <div><span>{t.nightWorkedHours}</span><strong>{num(summary.scheduledHoursByKind.nocturno)} h</strong></div>
                  <div><span>{t.mixedWorkedHours}</span><strong>{num(summary.scheduledHoursByKind.mixto)} h</strong></div>
                  <div><span>{t.overtimeDay}</span><strong>{num(estimate.illustrativeOvertimeHours.diurno)} h</strong></div>
                  <div><span>{t.dayValue}</span><strong>{money(estimate.overtimeHourlyRates.diurno)}</strong></div>
                  <div><span>{t.daySubtotal}</span><strong>{money(estimate.subtotals.diurno)}</strong></div>
                  <div><span>{t.overtimeNight}</span><strong>{num(estimate.illustrativeOvertimeHours.nocturno)} h</strong></div>
                  <div><span>{t.nightValue}</span><strong>{money(estimate.overtimeHourlyRates.nocturno)}</strong></div>
                  <div><span>{t.nightSubtotal}</span><strong>{money(estimate.subtotals.nocturno)}</strong></div>
                  <div><span>{t.overtimeMixed}</span><strong>{num(estimate.illustrativeOvertimeHours.mixto)} h</strong></div>
                  <div><span>{t.mixedValue}</span><strong>{money(estimate.overtimeHourlyRates.mixto)}</strong></div>
                  <div><span>{t.mixedSubtotal}</span><strong>{money(estimate.subtotals.mixto)}</strong></div>
                </div>
                <div className="total-estimate"><span>{t.estimateTotal}</span><strong>{money(estimate.total)}</strong></div>
                {settlement && <div className="settlement-breakdown">
                  <h4>{t.finalSummaryTitle}</h4>
                  <div className="metric-list">
                    <div><span>{t.overtimeSubtotal}</span><strong>{money(settlement.overtimeSubtotal)}</strong></div>
                    <div><span>{t.pendingNotice}</span><strong>{money(settlement.pending.notice)}</strong></div>
                    <div><span>{t.pendingSeverance}</span><strong>{money(settlement.pending.severance)}</strong></div>
                    <div><span>{t.pendingWages}</span><strong>{money(settlement.pending.wages)}</strong></div>
                  </div>
                  <div className="total-estimate"><span>{t.grandTotal}</span><strong>{money(settlement.grandTotal)}</strong></div>
                </div>}
                <p className="disclaimer" role="note">{t.estimationNotice}</p>
                <button type="button" className="print-button no-print" onClick={() => window.print()}>{t.pdfButton} ↗</button>
                <p className="helper-note no-print">{t.pdfHint}</p>
              </div>}

              <div className="preview-panel no-print">
                <div className="preview-heading"><h3>{t.previewTitle}</h3><span>{t.maxDays}</span></div>
                {preview.length ? <div className="preview-grid">{preview.map((item) => (
                  <div className={`preview-day kind-${item.shift.kind}`} key={item.date} title={`${t.day} ${item.cyclePosition}`}>
                    <span>{formatDate(item.date)}</span><strong>{KIND_INITIALS[item.shift.kind]}</strong><small>{num(item.shift.hours)} h</small>
                  </div>
                ))}</div> : <p>{t.previewInvalid}</p>}
                <p className="helper-note">{t.previewHelp}</p>
              </div>
              <div className="scope-note no-print"><strong>{t.pendingTitle}</strong><p>{t.pendingDescription}</p></div>
            </div>
          </div>
        </section>
      </main>
      <footer><span>{BRAND.name}</span><span>{t.footerDisclaimer}</span></footer>
    </div>
  );
}
