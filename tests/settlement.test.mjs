import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSettlement } from '../src/domain/pay/settlement.ts';

const base = { notice: 100_000, severance: 250_000, wages: 35_000, aguinaldo: 0, vacationDays: 0 };

test('suma preaviso, cesantía y salarios pendientes al subtotal de horas extra', () => {
  const result = summarizeSettlement(4_026_750, 15_000, base);
  assert.equal(result.pendingSubtotal, 385_000);
  assert.equal(result.grandTotal, 4_411_750);
});

test('calcula vacaciones por días pendientes × salario diario, incluyendo fracciones de día', () => {
  const result = summarizeSettlement(50_000, 15_000, { ...base, aguinaldo: 120_000, vacationDays: 8.5 });
  assert.equal(result.vacationAmount, 127_500);
  assert.equal(result.pendingSubtotal, 632_500);
  assert.equal(result.grandTotal, 682_500);
});

test('campos vacíos representados como cero no incrementan el resultado', () => {
  const result = summarizeSettlement(25_000, 15_000, { notice: 0, severance: 0, wages: 0, aguinaldo: 0, vacationDays: 0 });
  assert.equal(result.vacationAmount, 0);
  assert.equal(result.pendingSubtotal, 0);
  assert.equal(result.grandTotal, 25_000);
});

test('no permite montos ni días negativos, NaN o infinito', () => {
  assert.throws(() => summarizeSettlement(100, 15_000, { ...base, notice: -1 }));
  assert.throws(() => summarizeSettlement(NaN, 15_000, base));
  assert.throws(() => summarizeSettlement(100, Infinity, base));
  assert.throws(() => summarizeSettlement(100, 15_000, { ...base, aguinaldo: -100 }));
  assert.throws(() => summarizeSettlement(100, 15_000, { ...base, vacationDays: -1 }));
  assert.throws(() => summarizeSettlement(100, 15_000, { ...base, vacationDays: NaN }));
  assert.throws(() => summarizeSettlement(100, 15_000, { ...base, vacationDays: Infinity }));
});

test('rechaza resultados fuera del rango finito', () => {
  assert.throws(() => summarizeSettlement(1e308, 1e308, { ...base, vacationDays: 10 }));
  assert.throws(() => summarizeSettlement(1e308, 0, { ...base, aguinaldo: 1e308 }));
});
