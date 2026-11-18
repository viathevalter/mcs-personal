import React from 'react';

const ALLOWED_TAGS = new Set([
  'p',
  'div',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
]);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes rich-text HTML notes, removing all inline CSS styles (like Tailwind --tw-* dumps),
 * classes, data-* attributes, and unsafe tags, while preserving bold/italic/underline/lists/line-breaks.
 */
export function sanitizeNotesHtml(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Plain text without HTML tags
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return escapeHtml(trimmed).replace(/\r?\n/g, '<br/>');
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/html');

      const cleanNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return escapeHtml(node.textContent || '');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object') {
          return '';
        }

        if (tag === 'br') {
          return '<br/>';
        }

        let inner = '';
        el.childNodes.forEach((child) => {
          inner += cleanNode(child);
        });

        // Preserve semantic bold/italic/underline when pasted as <span style="font-weight: bolder">
        const styleAttr = (el.getAttribute('style') || '').toLowerCase();
        const isBoldStyle = /font-weight\s*:\s*(bold|bolder|[6-9]00)/.test(styleAttr);
        const isItalicStyle = /font-style\s*:\s*italic/.test(styleAttr);
        const isUnderlineStyle = /text-decoration[^;]*underline/.test(styleAttr);

        if (isUnderlineStyle && tag !== 'u') inner = `<u>${inner}</u>`;
        if (isItalicStyle && tag !== 'i' && tag !== 'em') inner = `<em>${inner}</em>`;
        if (isBoldStyle && tag !== 'b' && tag !== 'strong') inner = `<strong>${inner}</strong>`;

        if (ALLOWED_TAGS.has(tag)) {
          const outTag = tag === 'div' ? 'p' : tag === 'b' ? 'strong' : tag === 'i' ? 'em' : tag;
          if (outTag === 'p' && !inner.trim()) {
            return '<br/>';
          }
          return `<${outTag}>${inner}</${outTag}>`;
        }

        return inner;
      };

      let result = '';
      doc.body.childNodes.forEach((child) => {
        result += cleanNode(child);
      });

      // Collapse excessive trailing/duplicate breaks
      return result
        .replace(/(<br\/>\s*){3,}/g, '<br/><br/>')
        .replace(/^(<br\/>\s*)+|(<br\/>\s*)+$/g, '')
        .trim();
    } catch {
      // Fallback to regex sanitizer below
    }
  }

  // Fallback regex sanitizer
  return trimmed
    .replace(/<span[^>]*style="[^"]*font-weight:\s*(?:bold|bolder|[6-9]00)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '<strong>$1</strong>')
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/<([a-z0-9]+)\b[^>]*>/gi, (_m, tagName) => {
      const t = String(tagName).toLowerCase();
      if (t === 'br') return '<br/>';
      if (t === 'div') return '<p>';
      if (ALLOWED_TAGS.has(t)) return `<${t}>`;
      return '';
    })
    .replace(/<\/div>/gi, '</p>')
    .trim();
}

/**
 * Converts HTML notes or plain notes into clean readable multi-line plain text
 * (ideal for <Textarea>, tooltips, exports, and DOCX variables).
 */
export function htmlToPlainText(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  const withBreaks = trimmed
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li\b[^>]*>/gi, '• ')
    .replace(/<\/\s*(p|div|li|ul|ol|h[1-6]|tr)\s*>/gi, '\n');

  let decoded = withBreaks.replace(/<[^>]+>/g, '');

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(decoded, 'text/html');
      decoded = doc.body.textContent || decoded;
    } catch {
      // ignore
    }
  } else {
    decoded = decoded
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  return decoded
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean paste handler for contentEditable rich-text editors so pasted text never brings
 * external CSS custom properties (--tw-*) or broken inline styles.
 */
export function handleCleanRichPaste(
  e: React.ClipboardEvent<HTMLDivElement>,
  onUpdateHtml: (newHtml: string) => void
) {
  e.preventDefault();
  const html = e.clipboardData.getData('text/html');
  const text = e.clipboardData.getData('text/plain');
  const clean = html ? sanitizeNotesHtml(html) : sanitizeNotesHtml(text);
  document.execCommand('insertHTML', false, clean);
  onUpdateHtml(e.currentTarget.innerHTML);
}
