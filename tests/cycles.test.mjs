import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countInclusiveDays,
  parseCalendarDate,
  previewSchedule,
  summarizeSchedule,
} from '../src/domain/cycles/calculator.ts';
import { createPreset } from '../src/domain/cycles/presets.ts';

const base = { startDate: '2025-01-01', endDate: '2026-01-25', cycle: createPreset('222'), startingDayInCycle: 1 };

test('390 días: 65 ciclos completos de 2×2×2', () => {
  const result = summarizeSchedule(base);
  assert.equal(result.totalDays, 390);
  assert.equal(result.completeCycles, 65);
  assert.equal(result.remainingDays, 0);
  assert.deepEqual(result.counts, { diurno: 130, nocturno: 130, mixto: 0, libre: 130 });
  assert.equal(result.scheduledHours, 3120);
});

test('392 días incluyen correctamente el ciclo parcial', () => {
  const result = summarizeSchedule({ ...base, endDate: '2026-01-27' });
  assert.deepEqual(result.counts, { diurno: 132, nocturno: 130, mixto: 0, libre: 130 });
  assert.equal(result.remainingDays, 2);
});

test('la fase inicial modifica qué turnos sobran', () => {
  const result = summarizeSchedule({ ...base, endDate: '2026-01-27', startingDayInCycle: 3 });
  assert.deepEqual(result.counts, { diurno: 130, nocturno: 132, mixto: 0, libre: 130 });
});

test('los turnos pueden ser personalizados y tener orden arbitrario', () => {
  const cycle = [
    { id: 'a', kind: 'libre', hours: 0 },
    { id: 'b', kind: 'nocturno', hours: 10 },
    { id: 'c', kind: 'diurno', hours: 8 },
  ];
  const result = summarizeSchedule({ startDate: '2026-02-01', endDate: '2026-02-04', cycle, startingDayInCycle: 2 });
  assert.deepEqual(result.counts, { diurno: 1, nocturno: 2, mixto: 0, libre: 1 });
  assert.equal(result.scheduledHours, 28);
});

test('los días inicial y final se incluyen', () => {
  assert.equal(countInclusiveDays('2026-11-02', '2026-11-02'), 1);
});

test('el 29 de febrero de año bisiesto cuenta', () => {
  assert.equal(countInclusiveDays('2024-02-28', '2024-03-01'), 3);
});

test('se rechazan fechas inválidas y orden inverso', () => {
  assert.throws(() => parseCalendarDate('2026-02-30'), /inexistente/);
  assert.throws(() => countInclusiveDays('2026-03-02', '2026-03-01'), /posterior/);
});

test('no se acepta ciclo vacío ni fase fuera del ciclo', () => {
  assert.throws(() => summarizeSchedule({ ...base, cycle: [] }), /al menos un día/);
  assert.throws(() => summarizeSchedule({ ...base, startingDayInCycle: 7 }), /dentro del ciclo/);
});

test('días libres solo pueden tener cero horas', () => {
  assert.throws(() => summarizeSchedule({ ...base, cycle: [{ id: 'x', kind: 'libre', hours: 8 }] }), /0 horas/);
});

test('se genera una vista previa con fecha y posición coherentes', () => {
  const data = previewSchedule({ ...base, startingDayInCycle: 5 }, 3);
  assert.deepEqual(data.map((day) => day.date), ['2025-01-01', '2025-01-02', '2025-01-03']);
  assert.deepEqual(data.map((day) => day.shift.kind), ['libre', 'libre', 'diurno']);
  assert.deepEqual(data.map((day) => day.cyclePosition), [5, 6, 1]);
});

test('preset 4×2 produce cuatro diurnos y dos libres por ciclo', () => {
  const result = summarizeSchedule({ startDate: '2026-01-01', endDate: '2026-01-06', cycle: createPreset('42'), startingDayInCycle: 1 });
  assert.deepEqual(result.counts, { diurno: 4, nocturno: 0, mixto: 0, libre: 2 });
});
