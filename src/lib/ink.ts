// Measures text on the page. The brain's labels keep clear of the hero text's
// letters, and the neuron layer dims itself behind them, so both need the
// same boxes. Browser only.

import type { Box } from './brain-nav.ts';

/** The ink of some text, line by line: its letters' boxes in the viewport, not its blocks'. */
export function inkOf(element: Element): Box[] {
  const boxes: Box[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    range.selectNodeContents(walker.currentNode);
    for (const box of range.getClientRects()) if (box.width > 0) boxes.push(box);
  }
  return boxes;
}
