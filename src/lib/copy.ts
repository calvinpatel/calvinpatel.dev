// Renders content fields. Every component prints copy through this file
// (usually through Copy.astro), so two rules hold everywhere:
//
//   - A field may hold two inline Markdown marks, links and italics, and
//     nothing else (CLAUDE.md rule 3). Anything else prints as written.
//   - Straight quotes and apostrophes become curly ones (DESIGN.md, Type).
//     URLs are never touched.
//
// No Astro imports, so Node can run tests/copy.test.ts against it directly.

type Piece =
  | { type: 'text'; value: string }
  | { type: 'em'; children: Piece[] }
  | { type: 'link'; href: string; children: Piece[] };

// The same link shape content.config.ts checks: [label](target-without-spaces).
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/y;
// Italics hug their text: "*like this*", never "* like this *".
const EM_STAR = /\*(?!\s)([^*]+?)(?<!\s)\*/y;
const EM_UNDERSCORE = /_(?!\s)([^_]+?)(?<!\s)_(?![\p{L}\p{N}])/uy;
const WORD_CHAR = /[\p{L}\p{N}]/u;

function parse(source: string, allowLinks = true): Piece[] {
  const pieces: Piece[] = [];
  let text = '';
  const flush = () => {
    if (text) pieces.push({ type: 'text', value: text });
    text = '';
  };
  const matchAt = (pattern: RegExp, index: number) => {
    pattern.lastIndex = index;
    return pattern.exec(source);
  };

  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    let piece: Piece | undefined;
    let match: RegExpExecArray | null = null;

    if (ch === '[' && allowLinks && (match = matchAt(LINK, i))) {
      piece = { type: 'link', href: match[2], children: parse(match[1], false) };
    } else if (ch === '*' && (match = matchAt(EM_STAR, i))) {
      piece = { type: 'em', children: parse(match[1], allowLinks) };
    } else if (ch === '_' && !WORD_CHAR.test(source[i - 1] ?? '') && (match = matchAt(EM_UNDERSCORE, i))) {
      // An underscore inside a word (snake_case) is just an underscore.
      piece = { type: 'em', children: parse(match[1], allowLinks) };
    }

    if (piece && match) {
      flush();
      pieces.push(piece);
      i += match[0].length;
    } else {
      text += ch;
      i += 1;
    }
  }
  flush();
  return pieces;
}

// A URL written out in the text keeps its straight marks.
const BARE_URL = /(?:https?:\/\/|mailto:)\S+/g;
// A quote opens at the start of the text and after a space, an opening
// bracket, a dash, or another opening quote. Otherwise it closes.
const BEFORE_OPENING = /[\s([{\-–—“‘]/;
// An apostrophe standing in for dropped digits: '26, '90s.
const ELIDED_YEAR = /^\d\d(?:s\b|\b)/;

function curl(text: string): string {
  const inUrl = new Array<boolean>(text.length).fill(false);
  for (const url of text.matchAll(BARE_URL)) {
    inUrl.fill(true, url.index, url.index + url[0].length);
  }

  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch !== '"' && ch !== "'") || inUrl[i]) {
      out += ch;
      continue;
    }
    // Look at what was already written, so a quote inside a quote is judged
    // by the curly mark before it.
    const opens = i === 0 || BEFORE_OPENING.test(out[i - 1]);
    if (ch === '"') out += opens ? '“' : '”';
    else out += opens && !ELIDED_YEAR.test(text.slice(i + 1)) ? '‘' : '’';
  }
  return out;
}

// Curls quotes across the whole field's visible text at once, so a quote next
// to a mark ("*Title*'s") is judged by the letters around it, and a link's
// target is never part of the text being changed.
function curlPieces(pieces: Piece[]): Piece[] {
  const leaves: { type: 'text'; value: string }[] = [];
  const collect = (list: Piece[]) => {
    for (const piece of list) {
      if (piece.type === 'text') leaves.push(piece);
      else collect(piece.children);
    }
  };
  collect(pieces);

  const curled = curl(leaves.map((leaf) => leaf.value).join(''));
  let offset = 0;
  for (const leaf of leaves) {
    leaf.value = curled.slice(offset, offset + leaf.value.length);
    offset += leaf.value.length;
  }
  return pieces;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (ch) => ESCAPES[ch]);

function toHtml(pieces: Piece[]): string {
  return pieces
    .map((piece) => {
      if (piece.type === 'text') return escapeHtml(piece.value);
      if (piece.type === 'em') return `<em>${toHtml(piece.children)}</em>`;
      return `<a href="${escapeHtml(piece.href)}">${toHtml(piece.children)}</a>`;
    })
    .join('');
}

function toText(pieces: Piece[]): string {
  return pieces.map((piece) => (piece.type === 'text' ? piece.value : toText(piece.children))).join('');
}

/** A content field as HTML: links, italics, and curly quotes. Safe for `set:html`. */
export function copyHtml(source: string): string {
  return toHtml(curlPieces(parse(source)));
}

/**
 * A content field as plain text with curly quotes and its marks dropped, for
 * places that can't hold HTML: the page title, the meta description, alt text,
 * and aria-labels. Astro escapes it on the way out.
 */
export function copyText(source: string): string {
  return toText(curlPieces(parse(source)));
}
