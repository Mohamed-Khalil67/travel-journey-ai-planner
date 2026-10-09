/**
 * fetch() + JSON with a hard timeout, so a slow third-party API can't stall a request.
 * Aborts when either the timeout fires or the caller's signal aborts.
 */
export async function fetchJson(url, { timeoutMs = 4000, signal } = {}) {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const res = await fetch(url, {
    signal: combined,
    headers: { 'User-Agent': 'travel-journey-demo/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}
