/** @typedef {import('../types.mjs').StandardisedBuffer} StandardisedBuffer */

/** @param {StandardisedBuffer} buffer */
export const isWebp = (buffer) => buffer.read(8, 12) === 'WEBP';

/** @param {StandardisedBuffer} buffer */
export const isAnimated = (buffer) =>
  ['VP8 ', 'VP8X'].includes(buffer.read(12, 16)) &&
  buffer.read(30, 34) === 'ANIM';
