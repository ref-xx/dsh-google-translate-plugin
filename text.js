/** Dependency-free, conservative protection for translation input.
 * Offsets and limits use JavaScript UTF-16 code units; input is never normalized.
 * This is deliberately not a complete Markdown parser.
 */
export function segmentText(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (!text.length) return [];
  const ranges = [];
  const add = (start, end) => { if (end > start) ranges.push([start, end]); };

  // Block code is recognized before inline syntax. Retain even an unfinished fence.
  let fence = null;
  const lines = /[^\r\n\u2028\u2029]*(?:\r\n|[\r\n\u2028\u2029]|$)/g;
  for (const match of text.matchAll(lines)) {
    if (!match[0]) continue;
    const line = match[0].replace(/[\r\n\u2028\u2029]+$/, '');
    if (fence) {
      const close = /^ {0,3}(`+|~+)[ \t]*$/.exec(line);
      if (close && close[1][0] === fence.marker && close[1].length >= fence.size) {
        add(fence.start, match.index + match[0].length);
        fence = null;
      }
    } else {
      const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (open) fence = { marker: open[1][0], size: open[1].length, start: match.index };
      else if (/^(?: {4}|\t)/.test(line)) add(match.index, match.index + match[0].length);
    }
  }
  if (fence) add(fence.start, text.length);
  const blockRanges = ranges.slice();
  const inBlock = (offset) => blockRanges.some(([start, end]) => offset >= start && offset < end);

  // Exact-length backtick runs may span lines. Unclosed runs protect the rest of
  // their line rather than risking translation of an unfinished code fragment.
  for (let i = 0; i < text.length;) {
    if (text[i] !== '`' || inBlock(i)) { i++; continue; }
    const start = i;
    while (text[i] === '`') i++;
    const size = i - start;
    let end = -1;
    for (let j = i; j < text.length;) {
      if (text[j] !== '`') { j++; continue; }
      const run = j;
      while (text[j] === '`') j++;
      if (j - run === size) { end = j; break; }
    }
    if (end < 0) {
      end = i;
      while (end < text.length && !/[\r\n\u2028\u2029]/.test(text[end])) end++;
    }
    add(start, end);
    i = end;
  }

  // Protect the complete destination/title, leaving the visible label available
  // for translation. Handle balanced parentheses and Markdown backslash escapes.
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== ']' || text[i + 1] !== '(') continue;
    const start = i + 1;
    let depth = 1;
    let j = start + 1;
    let quote = null;
    let angle = false;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (ch === '\\') { j++; continue; }
      if (quote) { if (ch === quote) quote = null; continue; }
      if (angle) { if (ch === '>') angle = false; continue; }
      if (ch === '<') { angle = true; continue; }
      if ((ch === '"' || ch === "'") && /\s/.test(text[j - 1])) { quote = ch; continue; }
      if (ch === '(') depth++;
      if (ch === ')' && --depth === 0) break;
    }
    if (depth === 0) { add(start, j + 1); i = j; }
    else {
      // An unfinished link destination is still a destination, not prose.
      const newline = text.slice(start).search(/[\r\n\u2028\u2029]/);
      add(start, newline < 0 ? text.length : start + newline);
    }
  }
  for (const match of text.matchAll(/^ {0,3}\[[^\]\r\n]+\]:[ \t]*(.*)$/gm)) {
    const offset = match.index + match[0].length - match[1].length;
    add(offset, offset + match[1].length);
  }

  const protectMatches = (regex, trim = false) => {
    for (const match of text.matchAll(regex)) {
      let value = match[0];
      if (trim) {
        value = value.replace(/[.,;:!?]+$/, '');
        while (value.endsWith(')') && (value.match(/\)/g)?.length ?? 0) > (value.match(/\(/g)?.length ?? 0)) value = value.slice(0, -1);
        value = value.replace(/[\]}]+$/, '');
      }
      add(match.index, match.index + value.length);
    }
  };
  protectMatches(/<(?:https?:\/\/|ftp:\/\/|mailto:)[^<>\s]+>/gi);
  protectMatches(/\b(?:https?:\/\/|ftp:\/\/|mailto:|www\.)[^\s<>"`]+/gi, true);
  // DSH references start at token boundaries, not inside email addresses.
  protectMatches(/(?<![\p{L}\p{N}_@])@"[^"\r\n]*"/gu);
  protectMatches(/(?<![\p{L}\p{N}_@])@[^\s<>"'`()[\]{},;!?]+/gu, true);
  protectMatches(/"(?:[A-Za-z]:[\\/]|\\\\|\.{1,2}\/|\/)[^"\r\n]*"/g);
  protectMatches(/'(?:[A-Za-z]:[\\/]|\\\\|\.{1,2}\/|\/)[^'\r\n]*'/g);
  protectMatches(/(?<![\p{L}\p{N}_])(?:[A-Za-z]:[\\/]|\\\\)[^\s<>"'`|]+/gu, true);
  protectMatches(/(?<![\p{L}\p{N}_:/])(?:\.{1,2}\/|\/)[^\s<>"'`|()[\]{}]+/gu, true);
  // Newline boundaries are always protected, including CRLF as one unit.
  protectMatches(/\r\n|[\r\n\u2028\u2029]/g);

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const [start, end] of ranges) {
    const previous = merged[merged.length - 1];
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else merged.push([start, end]);
  }
  const result = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) result.push({ text: text.slice(cursor, start), protected: false });
    result.push({ text: text.slice(start, end), protected: true });
    cursor = end;
  }
  if (cursor < text.length) result.push({ text: text.slice(cursor), protected: false });
  return result;
}

/** Split without dropping delimiters or breaking a valid surrogate pair.
 * Prefer a nearby sentence boundary, then whitespace, then a hard size limit.
 */
export function splitText(text, maxChars) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (!Number.isSafeInteger(maxChars) || maxChars < 2) throw new RangeError('maxChars must be a safe integer >= 2');
  const chunks = [];
  let start = 0;
  while (text.length - start > maxChars) {
    let end = start + maxChars;
    const high = text.charCodeAt(end - 1);
    const low = text.charCodeAt(end);
    if (high >= 0xd800 && high <= 0xdbff && low >= 0xdc00 && low <= 0xdfff) end--;
    const window = text.slice(start, end);
    const minimum = Math.max(1, Math.floor(window.length / 2));
    let sentence = 0;
    let space = 0;
    for (const match of window.matchAll(/(?:[.!?。！？]["'”’)]*\s+)|\s+/gu)) {
      const boundary = match.index + match[0].length;
      if (boundary < minimum) continue;
      space = boundary;
      if (/^[.!?。！？]/u.test(match[0])) sentence = boundary;
    }
    end = start + (sentence || space || window.length);
    chunks.push(text.slice(start, end));
    start = end;
  }
  if (start < text.length) chunks.push(text.slice(start));
  return chunks;
}
