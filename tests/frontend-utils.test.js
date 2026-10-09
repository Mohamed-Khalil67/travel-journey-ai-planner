import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { validateTripForm, MAX_TRIP_DAYS } from '../frontend/src/utils/validation.js';
import { calculateTripDuration, toLocalISODate, parseLocalDate } from '../frontend/src/utils/dates.js';
import { calculateBudget, BUDGET_STRATEGIES } from '../frontend/src/utils/budget.js';
import { escapeHTML } from '../frontend/src/utils/html.js';
import { formatMoney } from '../frontend/src/utils/format.js';

// Dates are built relative to "today" so these tests never expire.
const daysFromToday = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toLocalISODate(d);
};
const validTrip = (overrides = {}) => ({
  destination: 'Lisbon',
  startDate: daysFromToday(10),
  endDate: daysFromToday(14),
  travelers: 2,
  budget: 1500,
  ...overrides
});

describe('validateTripForm', () => {
  test('accepts a valid trip', () => {
    assert.equal(validateTripForm(validTrip()).valid, true);
  });

  test('rejects an empty destination', () => {
    const r = validateTripForm(validTrip({ destination: '   ' }));
    assert.equal(r.valid, false);
    assert.ok(r.errors.destination);
  });

  test('rejects a start date in the past', () => {
    const r = validateTripForm(validTrip({ startDate: daysFromToday(-3), endDate: daysFromToday(2) }));
    assert.ok(r.errors.startDate);
  });

  test('accepts a trip starting today (local timezone, not UTC)', () => {
    const r = validateTripForm(validTrip({ startDate: daysFromToday(0), endDate: daysFromToday(3) }));
    assert.equal(r.valid, true, JSON.stringify(r.errors));
  });

  test('rejects an end date before the start date', () => {
    const r = validateTripForm(validTrip({ startDate: daysFromToday(10), endDate: daysFromToday(5) }));
    assert.ok(r.errors.endDate);
  });

  test('accepts a single-day trip', () => {
    assert.equal(validateTripForm(validTrip({ startDate: daysFromToday(3), endDate: daysFromToday(3) })).valid, true);
  });

  test(`rejects trips longer than ${MAX_TRIP_DAYS} days`, () => {
    const r = validateTripForm(validTrip({ startDate: daysFromToday(1), endDate: daysFromToday(1 + MAX_TRIP_DAYS) }));
    assert.ok(r.errors.endDate);
  });

  test('rejects fractional travelers and non-positive budgets', () => {
    const r = validateTripForm(validTrip({ travelers: 1.5, budget: 0 }));
    assert.ok(r.errors.travelers);
    assert.ok(r.errors.budget);
  });
});

describe('calculateTripDuration', () => {
  test('counts both start and end day', () => {
    assert.equal(calculateTripDuration('2026-11-01', '2026-11-06'), 6);
  });

  test('a same-day trip is 1 day', () => {
    assert.equal(calculateTripDuration('2026-11-01', '2026-11-01'), 1);
  });

  test('is not skewed by a daylight-saving change', () => {
    assert.equal(calculateTripDuration('2027-03-27', '2027-04-02'), 7); // EU DST starts Mar 28
    assert.equal(calculateTripDuration('2027-03-13', '2027-03-15'), 3); // US DST starts Mar 14
  });

  test('returns 0 for reversed or invalid ranges', () => {
    assert.equal(calculateTripDuration('2026-11-06', '2026-11-01'), 0);
    assert.equal(calculateTripDuration('nope', '2026-11-01'), 0);
  });

  test('parses YYYY-MM-DD as a local date', () => {
    const d = parseLocalDate('2026-07-04');
    assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate()], [2026, 6, 4]);
  });
});

describe('calculateBudget', () => {
  test('every strategy ratio table sums to exactly 100%', () => {
    for (const [style, ratios] of Object.entries(BUDGET_STRATEGIES)) {
      const sum = Object.values(ratios).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1) < 1e-9, `${style} sums to ${sum}`);
    }
  });

  test('allocated parts always add up to the total (including rounding)', () => {
    for (const style of Object.keys(BUDGET_STRATEGIES)) {
      for (const total of [1, 99, 1000, 1234, 2000, 9999]) {
        const b = calculateBudget(total, style);
        assert.equal(b.accommodation + b.food + b.activities + b.transportation, total, `${style} @ ${total}`);
      }
    }
  });

  test('luxury allocation', () => {
    assert.deepEqual(calculateBudget(2000, 'luxury'), {
      total: 2000, accommodation: 1100, food: 400, activities: 300, transportation: 200
    });
  });

  test('unknown style falls back to balanced', () => {
    assert.deepEqual(calculateBudget(1000, 'yolo'), calculateBudget(1000, 'balanced'));
  });
});

describe('escapeHTML', () => {
  test('neutralises markup and attribute breakouts', () => {
    assert.equal(
      escapeHTML(`<img src=x onerror="alert('x')">`),
      '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;'
    );
    assert.equal(escapeHTML('</textarea><script>'), '&lt;/textarea&gt;&lt;script&gt;');
  });

  test('handles null, undefined and numbers', () => {
    assert.equal(escapeHTML(null), '');
    assert.equal(escapeHTML(undefined), '');
    assert.equal(escapeHTML(42), '42');
  });
});

describe('formatMoney', () => {
  test('formats in the trip currency', () => {
    assert.equal(formatMoney(1200, 'EUR'), '€1,200');
    assert.equal(formatMoney(1200, 'GBP'), '£1,200');
    assert.equal(formatMoney(1200, 'USD'), '$1,200');
  });

  test('falls back to USD for an invalid currency code', () => {
    assert.equal(formatMoney(5, 'NOT_A_CURRENCY'), '$5');
  });
});
