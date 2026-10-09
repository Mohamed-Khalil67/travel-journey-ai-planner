const formatterCache = new Map();

/** Formats an amount in the trip's currency, e.g. 1200 + 'EUR' -> '€1,200'. */
export function formatMoney(amount, currency = 'USD') {
  let formatter = formatterCache.get(currency);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
    } catch {
      formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    }
    formatterCache.set(currency, formatter);
  }
  return formatter.format(Number(amount) || 0);
}
