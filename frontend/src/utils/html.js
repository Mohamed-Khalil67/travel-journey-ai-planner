const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escapes a value for safe interpolation into HTML text or a quoted attribute.
 * Every user- or AI-supplied string must pass through this before reaching innerHTML.
 */
export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}
