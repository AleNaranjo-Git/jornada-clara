import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSchedule } from '../src/domain/cycles/calculator.ts';
import { estimateIllustrativeOvertime } from '../src/domain/pay/estimate.ts';

const schedule = {
  startDate: '2026-01-01', endDate: '2026-01-10', startingDayInCycle: 1,
  cycle: [
    { id: 'd', kind: 'diurno', hours: 12 },
    { id: 'm', kind: 'mixto', hours: 8 },
    { id: 'n', kind: 'nocturno', hours: 12 },
    { id: 'r', kind: 'libre', hours: 0 },
  ],
};

test('el ciclo personalizado admite días mixtos y respeta los días sobrantes', () => {
  const summary = summarizeSchedule(schedule);
  assert.deepEqual(summary.counts, { diurno: 3, nocturno: 2, mixto: 3, libre: 2 });
  assert.equal(summary.scheduledHoursByKind.nocturno, 24);
  assert.equal(summary.scheduledHoursByKind.mixto, 24);
  assert.equal(summary.scheduledHours, 84);
});

test('la simulación da una hora extra por cada turno mixto sin afectar los otros turnos', () => {
  const result = estimateIllustrativeOvertime(schedule, 420_000);
  assert.deepEqual(result.illustrativeOvertimeHours, { diurno: 12, nocturno: 12, mixto: 3 });
  assert.equal(result.overtimeHourlyRates.mixto, 3_000); // (420000 / 30 / 7) × 1.5
  assert.equal(result.subtotals.mixto, 9_000);
});

test('un ciclo de solo turnos mixtos conserva la fase y no duplica horas', () => {
  const cycle = [{ id: 'm', kind: 'mixto', hours: 8 }];
  const result = estimateIllustrativeOvertime({ ...schedule, cycle }, 420_000);
  assert.equal(result.illustrativeOvertimeHours.mixto, 10);
  assert.equal(result.total, 30_000);
});
