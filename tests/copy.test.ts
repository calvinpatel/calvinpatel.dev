// Tests for the copy helper. Run from the repo root:
//   node --test tests/copy.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { copyHtml, copyText } from '../src/lib/copy.ts';

test('plain text passes through', () => {
  assert.equal(copyHtml('AI engineer with clinical training.'), 'AI engineer with clinical training.');
  assert.equal(copyText('© 2026 Calvin Patel'), '© 2026 Calvin Patel');
});

test('apostrophes turn curly', () => {
  assert.equal(copyText("The hard part wasn't the model: it was teaching code."), 'The hard part wasn’t the model: it was teaching code.');
  assert.equal(copyText("What's next"), 'What’s next');
  assert.equal(copyText("I'd felt that before. It's one I'd choose."), 'I’d felt that before. It’s one I’d choose.');
});

test('double quotes open and close', () => {
  assert.equal(
    copyText('"Hold" reached past the comma. Read as apixaban stopped: wrong.'),
    '“Hold” reached past the comma. Read as apixaban stopped: wrong.',
  );
  assert.equal(
    copyText('a test line reading "Reports chest pain," quoting "chest pain" from "Denies chest pain.", passed'),
    'a test line reading “Reports chest pain,” quoting “chest pain” from “Denies chest pain.”, passed',
  );
  assert.equal(copyText('which drug a "hold" stops ("R/O PE" is not a diagnosis)'), 'which drug a “hold” stops (“R/O PE” is not a diagnosis)');
});

test('single quotes open and close, and nest inside double quotes', () => {
  assert.equal(copyText("He wrote 'left' twice."), 'He wrote ‘left’ twice.');
  assert.equal(copyText(`"'Hold' is a verb," she said.`), '“‘Hold’ is a verb,” she said.');
});

test('an apostrophe before dropped digits stays an apostrophe', () => {
  assert.equal(copyText("Class of '26, born in the '90s"), 'Class of ’26, born in the ’90s');
});

test('links render and their targets are left untouched', () => {
  assert.equal(
    copyHtml('shared under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.'),
    'shared under the <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> license.',
  );
  assert.equal(copyHtml("I'm leading [Prelude](#projects), an AI intake system"), 'I’m leading <a href="#projects">Prelude</a>, an AI intake system');
  assert.equal(copyHtml('[NotePilot](/projects/notepilot)'), '<a href="/projects/notepilot">NotePilot</a>');
  assert.equal(copyHtml('[Write to me](mailto:calvin@calvinpatel.dev)'), '<a href="mailto:calvin@calvinpatel.dev">Write to me</a>');
  // A quote, an underscore, and an ampersand in a target all survive.
  assert.equal(
    copyHtml(`[Cal's "paper"](https://example.com/it's_a_"test"?a=1&b=2)`),
    '<a href="https://example.com/it\'s_a_&quot;test&quot;?a=1&amp;b=2">Cal’s “paper”</a>',
  );
});

test('a URL written out in the text keeps its straight marks', () => {
  assert.equal(copyText("It's at https://example.com/it's_here today"), "It’s at https://example.com/it's_here today");
});

test('italics render with either mark', () => {
  assert.equal(copyHtml('published in *Nature Neuroscience* last year'), 'published in <em>Nature Neuroscience</em> last year');
  assert.equal(copyHtml('published in _Nature Neuroscience_ last year'), 'published in <em>Nature Neuroscience</em> last year');
  assert.equal(copyHtml('[*Nature Neuroscience*](https://example.com)'), '<a href="https://example.com"><em>Nature Neuroscience</em></a>');
});

test('a quote beside a mark is judged by the text around it', () => {
  assert.equal(copyHtml("*Nature Neuroscience*'s cover"), '<em>Nature Neuroscience</em>’s cover');
  assert.equal(copyHtml('the "*Dendrometer*" paper'), 'the “<em>Dendrometer</em>” paper');
  assert.equal(copyHtml('[GitHub](https://github.com/calvinpatel)\'s page'), '<a href="https://github.com/calvinpatel">GitHub</a>’s page');
});

test('marks that are not italics print as written', () => {
  assert.equal(copyHtml('2 * 3 * 4 and snake_case_name'), '2 * 3 * 4 and snake_case_name');
  assert.equal(copyHtml('a lone [bracket] and (parens)'), 'a lone [bracket] and (parens)');
});

test('HTML in a field is escaped', () => {
  assert.equal(copyHtml('R&D <script>alert(1)</script>'), 'R&amp;D &lt;script&gt;alert(1)&lt;/script&gt;');
});

test('copyText drops the marks and keeps the words', () => {
  assert.equal(
    copyText("I also built [NotePilot](/projects/notepilot), a *clinical* note summarizer that's live."),
    'I also built NotePilot, a clinical note summarizer that’s live.',
  );
});
