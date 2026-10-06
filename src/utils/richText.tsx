import React from 'react';

/**
 * Wraps the currently selected text in a textarea with prefix and suffix markers
 * (e.g. **bold** or ==highlight==). If already wrapped, toggles it off.
 */
export function applyTextareaFormatting(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (newValue: string) => void,
  marker: '**' | '=='
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const mLen = marker.length;

  // Check if selection itself is already wrapped outside
  const before = value.slice(Math.max(0, start - mLen), start);
  const after = value.slice(end, Math.min(value.length, end + mLen));

  let nextValue = value;
  let nextStart = start;
  let nextEnd = end;

  if (before === marker && after === marker) {
    // Unwrap markers around selection
    nextValue = value.slice(0, start - mLen) + selected + value.slice(end + mLen);
    nextStart = start - mLen;
    nextEnd = end - mLen;
  } else if (
    selected.startsWith(marker) &&
    selected.endsWith(marker) &&
    selected.length >= mLen * 2
  ) {
    // Unwrap markers inside selection
    const inner = selected.slice(mLen, selected.length - mLen);
    nextValue = value.slice(0, start) + inner + value.slice(end);
    nextStart = start;
    nextEnd = start + inner.length;
  } else {
    // Wrap selection (or insert placeholder if empty)
    const content = selected || (marker === '**' ? 'texto em negrito' : 'texto destacado');
    nextValue = value.slice(0, start) + `${marker}${content}${marker}` + value.slice(end);
    nextStart = start + mLen;
    nextEnd = start + mLen + content.length;
  }

  onChange(nextValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(nextStart, nextEnd);
  });
}

/**
 * Strips formatting markers (** and ==) for plain-text clipboard export or search.
 */
export function stripFormattingMarkers(text: string): string {
  if (!text) return '';
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/==(.+?)==/g, '$1');
}

/**
 * Applies minimal local grammar & punctuation rules in Portuguese:
 * - Removes spaces before punctuation (, . ; : ! ?)
 * - Ensures a single space after punctuation (, . ; : ! ?) when followed by a word
 * - Collapses multiple consecutive spaces on the same line
 * - Capitalizes the first letter of paragraphs and sentences after (. ! ?)
 * - Fixes common Portuguese accentuation/typos while preserving **bold** and ==highlight== markers
 */
export function applyMinimalGrammarCorrection(text: string): string {
  if (!text || !text.trim()) return text;

  let result = text;

  // 1. Normalize multiple horizontal spaces into a single space
  result = result.replace(/[ \t]+/g, ' ');

  // 2. Remove space before punctuation marks (, . ; : ! ?)
  result = result.replace(/ +([,.;:!?])/g, '$1');

  // 3. Ensure a space after (, ; : ! ?) or period (when not part of ellipsis, number, or closing marker)
  result = result.replace(/([,;:])([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1 $2');
  result = result.replace(/([.!?])([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1 $2');

  // 4. Minimal common Portuguese accentuation fixes (case-preserving for lowercase words)
  const commonFixes: Record<string, string> = {
    nao: 'não',
    sao: 'são',
    entao: 'então',
     tambem: ' também',
    alem: 'além',
    porem: 'porém',
    atraves: 'através',
    apos: 'após',
    ate: 'até',
    ja: 'já',
    so: 'só',
    pais: 'país',
    epoca: 'época',
    historia: 'história',
    historico: 'histórico',
    filosofico: 'filosófico',
    sociologico: 'sociológico',
    publico: 'público',
    publica: 'pública',
    politica: 'política',
    politicas: 'políticas',
    economico: 'econômico',
    economica: 'econômica',
    cidadao: 'cidadão',
    cidadaos: 'cidadãos',
    constituicao: 'constituição',
    educacao: 'educação',
    saude: 'saúde',
    violencia: 'violência',
    ausencia: 'ausência',
    consequencia: 'consequência',
    consequencias: 'consequências',
    individuo: 'indivíduo',
    individuos: 'indivíduos',
    paragrafo: 'parágrafo',
    repertorio: 'repertório',
  };

  Object.entries(commonFixes).forEach(([wrong, right]) => {
    const cleanWrong = wrong.trim();
    const cleanRight = right.trim();
    const regex = new RegExp(`\\b${cleanWrong}\\b`, 'g');
    result = result.replace(regex, cleanRight);
  });

  // 5. Capitalize the first letter at the start of text, after newlines, or after sentence-ending punctuation (. ! ?), ignoring leading ** or ==
  result = result.replace(
    /(^|[\n\r]+\s*|[.!?]\s+)((?:\*\*|==|\s|["“'])*)([a-zà-öø-ÿ])/gm,
    (_match, prefix, markers, letter) => `${prefix}${markers}${letter.toUpperCase()}`
  );

  // 6. Ensure each non-empty paragraph ends with terminal punctuation (. ! ? : " ”) or formatting marker after punctuation
  result = result
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // Check if line already ends with punctuation (possibly inside ** or == or quotes)
      if (/([.!?…:;]["”']?|["”'][.!?…:;]|[.!?…:;](\*\*|==))$/.test(trimmed)) {
        return trimmed;
      }
      return `${trimmed}.`;
    })
    .join('\n');

  return result;
}

/**
 * Renders formatted text supporting **bold** and ==soft blue highlighter== safely in React.
 */
export const FormattedText: React.FC<{
  text?: string;
  className?: string;
}> = ({ text, className = '' }) => {
  if (!text) return null;

  // Tokenize by **bold** and ==highlight==
  const regex = /(\*\*[\s\S]+?\*\*|==[\s\S]+?==)/g;
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          const inner = part.slice(2, -2);
          return (
            <strong key={index} className="font-bold text-slate-950">
              {inner}
            </strong>
          );
        }
        if (part.startsWith('==') && part.endsWith('==') && part.length > 4) {
          const inner = part.slice(2, -2);
          return (
            <mark
              key={index}
              className="bg-blue-100/80 text-blue-950 border border-blue-300/80 rounded px-1 py-0.5 font-medium shadow-[0_1px_0_rgba(37,99,235,0.08)]"
            >
              {inner}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
