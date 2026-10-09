const STYLES = new Set(['balanced', 'luxury', 'adventure']);
const CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isNonEmptyString = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isIntInRange = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/**
 * Validates the request body and returns a whitelisted copy.
 * Only known fields are forwarded to the AI prompt, which limits prompt-stuffing.
 * @returns {{ value?: object, errors?: string[] }}
 */
export function validateTripRequest(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object.'] };
  }

  const {
    destination, startDate, endDate, durationDays, travelers, budget,
    currency = 'USD', travelStyle = 'balanced', interests = [], notes = ''
  } = body;

  if (!isNonEmptyString(destination, 100)) errors.push('destination is required (max 100 characters).');
  if (!isIntInRange(durationDays, 1, 30)) errors.push('durationDays must be an integer between 1 and 30.');
  if (!isIntInRange(travelers, 1, 20)) errors.push('travelers must be an integer between 1 and 20.');
  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget <= 0 || budget > 1_000_000) {
    errors.push('budget must be a positive number.');
  }
  if (!CURRENCIES.has(currency)) errors.push(`currency must be one of ${[...CURRENCIES].join(', ')}.`);
  if (!STYLES.has(travelStyle)) errors.push(`travelStyle must be one of ${[...STYLES].join(', ')}.`);
  if (!Array.isArray(interests) || interests.length > 10 || !interests.every((i) => isNonEmptyString(i, 30))) {
    errors.push('interests must be an array of up to 10 short strings.');
  }
  if (typeof notes !== 'string' || notes.length > 500) errors.push('notes must be a string (max 500 characters).');
  for (const [name, value] of [['startDate', startDate], ['endDate', endDate]]) {
    if (value !== undefined && !(typeof value === 'string' && DATE_RE.test(value))) {
      errors.push(`${name} must be YYYY-MM-DD.`);
    }
  }

  if (errors.length) return { errors };

  return {
    value: {
      destination: destination.trim(),
      startDate,
      endDate,
      durationDays,
      travelers,
      budget,
      currency,
      travelStyle,
      interests: interests.map((i) => i.trim()),
      notes: notes.trim()
    }
  };
}
