import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateIllustrativeOvertime } from '../src/domain/pay/estimate.ts';
import { createPreset } from '../src/domain/cycles/presets.ts';

const example = {
  startDate: '2025-01-01',
  endDate: '2026-01-25',
  cycle: createPreset('222'),
  startingDayInCycle: 1,
};

test('caso de referencia: salario 413.000, 390 días', () => {
  const result = estimateIllustrativeOvertime(example, 413_000);
  assert.deepEqual(result.illustrativeOvertimeHours, { diurno: 520, nocturno: 780, mixto: 0 });
  assert.equal(result.subtotals.diurno, 1_342_250);
  assert.equal(result.subtotals.nocturno, 2_684_500);
  assert.equal(result.total, 4_026_750);
});

test('ciclo parcial respeta la fase seleccionada para horas extra', () => {
  const result = estimateIllustrativeOvertime({ ...example, endDate: '2026-01-27', startingDayInCycle: 3 }, 413_000);
  assert.equal(result.illustrativeOvertimeHours.diurno, 520);
  assert.equal(result.illustrativeOvertimeHours.nocturno, 792);
});

test('turno de 8 horas diurnas no crea horas extra ilustrativas', () => {
  const cycle = [{ id: 'd', kind: 'diurno', hours: 8 }];
  const result = estimateIllustrativeOvertime({ ...example, cycle }, 413_000);
  assert.equal(result.total, 0);
});

test('turnos nocturnos personalizados respetan su duración', () => {
  const cycle = [
    { id: '1', kind: 'nocturno', hours: 10 },
    { id: '2', kind: 'libre', hours: 0 },
  ];
  const result = estimateIllustrativeOvertime({ startDate: '2026-11-01', endDate: '2026-11-02', cycle, startingDayInCycle: 1 }, 300_000);
  assert.equal(result.illustrativeOvertimeHours.nocturno, 4);
  assert.equal(result.illustrativeOvertimeHours.diurno, 0);
  assert.equal(result.total, 10_000);
});

test('salarios inválidos nunca producen montos', () => {
  for (const salary of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => estimateIllustrativeOvertime(example, salary));
  }
});

test('cálculo monetario se detiene en fechas inválidas', () => {
  assert.throws(() => estimateIllustrativeOvertime({ ...example, endDate: '2024-01-01' }, 413_000));
});
