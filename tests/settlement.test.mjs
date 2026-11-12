import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSettlement } from '../src/domain/pay/settlement.ts';

test('suma preaviso, cesantía y salarios pendientes al subtotal de horas extra', () => {
  const result = summarizeSettlement(4_026_750, { notice: 100_000, severance: 250_000, wages: 35_000 });
  assert.equal(result.pendingSubtotal, 385_000);
  assert.equal(result.grandTotal, 4_411_750);
});

test('no permite montos pendientes negativos, NaN o infinito', () => {
  assert.throws(() => summarizeSettlement(100, { notice: -1, severance: 0, wages: 0 }));
  assert.throws(() => summarizeSettlement(NaN, { notice: 0, severance: 0, wages: 0 }));
  assert.throws(() => summarizeSettlement(100, { notice: 0, severance: Infinity, wages: 0 }));
});
