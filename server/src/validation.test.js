const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReading, summarizeReadings } = require('./validation');

test('rejects missing and out-of-range values', () => {
  assert.equal(validateReading({ date: '2026-01-01', slot: 'morning' }).value, 'Please enter a glucose value.');
  assert.equal(validateReading({ value: 601, date: '2026-01-01', slot: 'morning' }).value, 'Value must be between 40 and 600 mg/dl.');
  assert.equal(validateReading({ value: 100.5, date: '2026-01-01', slot: 'morning' }).value, 'Value must be between 40 and 600 mg/dl.');
});

test('rejects future dates and invalid slots', () => {
  const errors = validateReading({ value: 100, date: '2999-01-01', slot: 'snack' });
  assert.equal(errors.date, 'Date cannot be in the future.');
  assert.equal(errors.slot, 'Please choose a valid time slot.');
  assert.equal(validateReading({ value: 100, date: '2026-02-31', slot: 'morning' }).date, 'Please choose a valid date.');
});

test('summarizes readings with one decimal average', () => {
  assert.deepEqual(summarizeReadings([{ value: 100 }, { value: 121 }, { value: 130 }]), { count: 3, highest: 130, lowest: 100, average: 117 });
  assert.deepEqual(summarizeReadings([]), { count: 0, highest: null, lowest: null, average: null });
});
