/** @typedef {import('../types.mjs').StandardisedBuffer} StandardisedBuffer */

/** @param {StandardisedBuffer} buffer */
export const isWebp = (buffer) => buffer.read(8, 12) === 'WEBP';

/** @param {StandardisedBuffer} buffer */
export const isAnimated = (buffer) =>
  buffer.length >= 30 &&
  buffer.read(12, 16) === 'VP8X' &&
  (buffer.at(20) & 0x02) !== 0;
