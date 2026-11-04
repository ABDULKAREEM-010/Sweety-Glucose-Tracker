const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function validateReading(input) {
  const errors = {};
  if (!input.value && input.value !== 0) errors.value = 'Please enter a glucose value.';
  else if (!Number.isInteger(Number(input.value)) || Number(input.value) < 40 || Number(input.value) > 600) {
    errors.value = 'Value must be between 40 and 600 mg/dl.';
  }
  if (!isValidDate(input.date)) errors.date = 'Please choose a valid date.';
  else if (input.date > new Date().toISOString().slice(0, 10)) errors.date = 'Date cannot be in the future.';
  if (!SLOTS.includes(input.slot)) errors.slot = 'Please choose a valid time slot.';
  return errors;
}

function summarizeReadings(readings) {
  const values = readings.map((reading) => Number(reading.value));
  if (!values.length) return { count: 0, highest: null, lowest: null, average: null };
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    highest: Math.max(...values),
    lowest: Math.min(...values),
    average: Math.round((total / values.length) * 10) / 10
  };
}

module.exports = { SLOTS, validateReading, summarizeReadings, isValidDate };
