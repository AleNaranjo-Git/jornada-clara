import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeError, translations } from '../src/i18n/translations.ts';

function sameShape(a, b, path = '') {
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), `Missing translation at ${path}`);
  for (const key of Object.keys(a)) {
    if (typeof a[key] === 'object') sameShape(a[key], b[key], `${path}.${key}`);
    else assert.equal(typeof b[key], 'string', `${path}.${key} is missing`);
  }
}

test('Español e inglés tienen exactamente las mismas claves', () => {
  sameShape(translations.es, translations.en);
});

test('los mensajes de error se localizan sin modificar el motor de cálculo', () => {
  assert.match(localizeError('La fecha final debe ser igual o posterior a la inicial.', 'en'), /End date/);
  assert.match(localizeError('La fecha final debe ser igual o posterior a la inicial.', 'es'), /final/);
});
