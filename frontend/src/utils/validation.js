import { parseLocalDate, startOfToday } from './dates.js';

export const MAX_TRIP_DAYS = 30;

export function validateTripForm(data, today = startOfToday()) {
  const errors = {};
  if (!data.destination || data.destination.trim() === '') {
    errors.destination = 'Please enter a destination.';
  }

  if (!data.startDate || !data.endDate) {
    errors.dates = 'Start and end dates are required.';
  } else {
    const start = parseLocalDate(data.startDate);
    const end = parseLocalDate(data.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      errors.dates = 'Please enter valid dates.';
    } else if (start < today) {
      errors.startDate = 'Start date cannot be in the past.';
    } else if (end < start) {
      errors.endDate = 'End date cannot be before the start date.';
    } else if ((end - start) / 86400000 + 1 > MAX_TRIP_DAYS) {
      errors.endDate = `Trips can be at most ${MAX_TRIP_DAYS} days.`;
    }
  }

  if (!Number.isInteger(data.travelers) || data.travelers < 1) {
    errors.travelers = 'Must have at least 1 traveler.';
  }
  if (!Number.isFinite(data.budget) || data.budget <= 0) {
    errors.budget = 'Budget must be positive.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
