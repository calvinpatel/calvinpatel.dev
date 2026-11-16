// Renders public/link-preview.png, the picture a link to the site shows in a
// message or a post (og:image; DESIGN.md, Page head). Run it again whenever
// the hero changes: its copy, the brain, or the neuron layer.
//
//   npx astro build && npx astro preview        (the production build, CLAUDE.md rule 16)
//   node scripts/link-preview.mjs [--out <file>]
//
// The picture is the built site's own hero in a 1200 x 630 window, without
// the top bar and the hint: the name, the two sentences, the brain, and the
// neurons. Reduced motion is on, so the neuron layer appears at once and
// nothing fires. It is drawn at device scale 2 and scaled down, so the text
// is as sharp as 1200 px allows.
//
// Nothing moves: the top bar keeps its height and the hint keeps its box, so
// the hero sits exactly where the page puts it. The styles that hide them are
// in the page before its own scripts run, so the neuron layer never dims
// behind links that aren't drawn.
//
// No package is added for this. It starts the installed Chrome and talks to
// it over Chrome's debugging protocol with Node's own WebSocket, then scales
// the shot with sharp, which Astro installs for its images. BASE and CHROME
// change the address and the browser.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const SCALE = 2;
const BASE = process.env.BASE ?? 'http://localhost:4321';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outFlag = process.argv.indexOf('--out');
const OUT = outFlag > 0 ? process.argv[outFlag + 1] : fileURLToPath(new URL('../public/link-preview.png', import.meta.url));

// What isn't drawn. `bar` is the top bar's own height, measured first.
const hidden = (bar) => `
  .top-bar { height: ${bar}px; box-sizing: border-box; }
  .top-bar > * { display: none !important; }
  [data-brain-hint] { visibility: hidden !important; }
`;

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

/** Starts Chrome with no window and resolves with its debugging address. */
function startChrome(profile) {
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--force-device-scale-factor=${SCALE}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--hide-scrollbars',
    '--no-first-run',
    'about:blank',
  ]);
  const address = new Promise((resolve, reject) => {
    let said = '';
    chrome.stderr.on('data', (chunk) => {
      said += chunk;
      const found = /DevTools listening on (ws:\/\/\S+)/.exec(said);
      if (found) resolve(found[1]);
    });
    chrome.on('error', (error) => reject(new Error(`Can't start Chrome at ${CHROME}: ${error.message}`)));
    chrome.on('exit', (code) => reject(new Error(`Chrome stopped before it was ready (exit ${code}).`)));
  });
  return { chrome, address };
}

/** A connection to Chrome: `send(method, params, session)` resolves with the answer. */
async function connect(address) {
  const socket = new WebSocket(address);
  await new Promise((open, fail) => {
    socket.addEventListener('open', open, { once: true });
    socket.addEventListener('error', () => fail(new Error(`Can't reach Chrome at ${address}.`)), { once: true });
  });
  const waiting = new Map();
  const listeners = new Set();
  let next = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id === undefined) return listeners.forEach((heard) => heard(message));
    const { resolve, reject } = waiting.get(message.id);
    waiting.delete(message.id);
    if (message.error) reject(new Error(`${message.error.message} (${JSON.stringify(message.error.data ?? '')})`));
    else resolve(message.result);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      waiting.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  /** Resolves when Chrome reports `method`. Ask before the thing that causes it. */
  const once = (method) =>
    new Promise((resolve) => {
      const heard = (message) => {
        if (message.method !== method) return;
        listeners.delete(heard);
        resolve(message.params);
      };
      listeners.add(heard);
    });
  return { send, once, close: () => socket.close() };
}

const profile = mkdtempSync(join(tmpdir(), 'link-preview-'));
const { chrome, address } = startChrome(profile);
try {
  const { send, once, close } = await connect(await address);
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  /** Runs an expression in the page and returns its value; a promise is waited for. */
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(`In the page: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    return result.value;
  };
  /** Opens the home page and waits for its fonts and for the neuron layer to have appeared. */
  const open = async () => {
    const loaded = once('Page.loadEventFired');
    const { errorText } = await page('Page.navigate', { url: `${BASE}/` });
    if (errorText) throw new Error(`Can't open ${BASE}/ (${errorText}). Is \`npx astro preview\` running?`);
    await loaded;
    await evaluate(`document.fonts.ready.then(() => new Promise((ready, late) => {
      const canvas = document.querySelector('.neurons');
      if (!canvas) return late(new Error('The page has no neuron canvas (.neurons).'));
      const started = performance.now();
      (function look() {
        if (canvas.classList.contains('is-ready')) ready(true);
        else if (performance.now() - started > 20000) late(new Error('The neuron layer never appeared.'));
        else setTimeout(look, 50);
      })();
    }))`);
  };
  /** A screenshot of the window once two in a row, 300 ms apart, are the same. */
  const stillShot = async () => {
    let last = '';
    for (let tries = 0; tries < 30; tries++) {
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      if (data === last) return Buffer.from(data, 'base64');
      last = data;
      await wait(300);
    }
    throw new Error('The hero never came to rest, so there is no still picture to take.');
  };

  await page('Page.enable');
  await page('Runtime.enable');
  // The same scale the flag forces, so this emulates nothing; it only sets the window's size.
  await page('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: false });
  await page('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  });

  // First as the page is, to measure the top bar.
  await open();
  const found = await evaluate(`({
    bar: document.querySelector('.top-bar')?.getBoundingClientRect().height,
    hint: !!document.querySelector('[data-brain-hint]'),
    scale: devicePixelRatio,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  })`);
  if (!found.bar || !found.hint) throw new Error("The page's top bar (.top-bar) or hint ([data-brain-hint]) wasn't found; this script hides both.");
  if (found.scale !== SCALE || !found.reduced) throw new Error(`The page reports device scale ${found.scale} and reduced motion ${found.reduced}.`);

  // Then with those two not drawn, from before the page's scripts run.
  await page('Page.addScriptToEvaluateOnNewDocument', {
    source: `new MutationObserver((_, observer) => {
      if (!document.head) return;
      observer.disconnect();
      document.head.append(Object.assign(document.createElement('style'), { textContent: ${JSON.stringify(hidden(found.bar))} }));
    }).observe(document, { childList: true, subtree: true });`,
  });
  await open();
  const shot = await stillShot();
  close();

  const png = await sharp(shot).resize(WIDTH, HEIGHT, { kernel: 'lanczos3' }).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  writeFileSync(OUT, png);
  console.log(`${OUT}: ${WIDTH} x ${HEIGHT}, ${png.length.toLocaleString('en-US')} bytes, from ${BASE}/`);
} finally {
  if (chrome.exitCode === null) {
    chrome.kill();
    await new Promise((gone) => chrome.once('exit', gone));
  }
  rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}
