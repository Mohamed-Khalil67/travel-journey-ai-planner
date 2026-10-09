/**
 * Parses one SSE "data:" line and dispatches it.
 * Returns true when the stream signalled completion.
 */
function handleSseLine(line, { onChunk, onMeta }) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return false;

  const dataStr = trimmed.slice('data:'.length).trim();
  if (!dataStr) return false;
  if (dataStr === '[DONE]') return true;

  let data;
  try {
    data = JSON.parse(dataStr);
  } catch (e) {
    console.warn('Ignoring malformed SSE data line:', line, e);
    return false;
  }

  if (data.error) throw new Error(data.error.message || 'Generation failed on the server');
  if (data.meta !== undefined) onMeta?.(data.meta);
  if (data.chunk !== undefined) onChunk(data.chunk);
  return false;
}

export const api = {
  /**
   * Streams an itinerary over Server-Sent Events (POST + fetch, since EventSource is GET-only).
   * @param {object} params trip parameters
   * @param {(chunk: string) => void} onChunk called for each text chunk
   * @param {() => void} onComplete called once when the stream ends
   * @param {(err: Error) => void} onError called on failure (AbortError when cancelled)
   * @param {{ signal?: AbortSignal, onMeta?: (meta: object) => void }} [options]
   */
  async streamItinerary(params, onChunk, onComplete, onError, { signal, onMeta } = {}) {
    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal
      });

      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) errMsg = errJson.error.message;
        } catch { /* non-JSON error body */ }
        throw new Error(errMsg);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported on this browser or response body is empty');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      const handlers = { onChunk, onMeta };
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the trailing partial line for the next network chunk
        buffer = lines.pop();

        for (const line of lines) {
          if (handleSseLine(line, handlers)) {
            await reader.cancel();
            onComplete();
            return;
          }
        }
      }

      buffer += decoder.decode();
      handleSseLine(buffer, handlers);
      onComplete();
    } catch (err) {
      if (err.name !== 'AbortError') console.error('streamItinerary error:', err);
      onError(err);
    }
  }
};
