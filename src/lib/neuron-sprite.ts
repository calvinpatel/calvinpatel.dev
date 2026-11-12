// Blurs a cell's sprite for the hero's neuron layer (DESIGN.md, Drawings:
// Neuron layer, Depth). Canvas has a blur filter, but Safari doesn't run it,
// and reading a sprite's pixels back to blur them in script takes the main
// thread tens of ms per cell. So the blur is drawn: the sprite is laid over
// itself at whole-pixel offsets, each copy at its Gaussian weight, adding up;
// once across, then once down. Browser only.

import { blurWeights } from './neuron-cell.ts';

/**
 * Blurs `sprite` in place: a Gaussian with a standard deviation of `sigma`
 * of the sprite's own pixels. `scratch` is any canvas to work in; it is made
 * large enough and its contents are lost.
 */
export function blurSprite(sprite: HTMLCanvasElement, sigma: number, scratch: HTMLCanvasElement): void {
  const weights = blurWeights(sigma);
  if (weights.length === 1) return;
  const { width, height } = sprite;
  if (scratch.width < width) scratch.width = width;
  if (scratch.height < height) scratch.height = height;

  // One pass: `from` drawn into `to` once per weight, moved along one axis.
  const pass = (from: HTMLCanvasElement, to: HTMLCanvasElement, across: boolean) => {
    const g = to.getContext('2d')!;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, width, height);
    g.globalCompositeOperation = 'lighter'; // the copies add up
    for (let k = 1 - weights.length; k < weights.length; k++) {
      g.globalAlpha = weights[Math.abs(k)];
      g.drawImage(from, 0, 0, width, height, across ? k : 0, across ? 0 : k, width, height);
    }
    g.restore();
  };
  pass(sprite, scratch, true);
  pass(scratch, sprite, false);
}
