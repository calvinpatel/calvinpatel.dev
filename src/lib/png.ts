// Reads a PNG's size from its first bytes, while the site builds. The link
// preview's width and height tags come from the picture itself
// (public/link-preview.png), so they can't drift from it.
//
// No Astro imports, so Node can run tests/png.test.ts against it directly.

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A PNG's width and height in pixels, from the file's bytes. Anything else is an error. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  // The signature, then the first chunk, which is always IHDR: its length and
  // name (8 bytes), then the width and the height as 4-byte numbers.
  const isPng = SIGNATURE.every((byte, i) => bytes[i] === byte) && String.fromCharCode(...bytes.subarray(12, 16)) === 'IHDR';
  if (!isPng || bytes.length < 24) throw new Error("This isn't a PNG, so its size can't be read.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
