/** @typedef {import('../types.mjs').StandardisedBuffer} StandardisedBuffer */

/** @param {StandardisedBuffer} buffer */
export const isWebp = (buffer) => buffer.read(8, 12) === 'WEBP';

/** @param {StandardisedBuffer} buffer */
export const isAnimated = (buffer) => {
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    if (buffer.read(offset, offset + 4) === 'ANIM') return true;

    const chunkSize = buffer.readUInt32LE(offset + 4);
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  return false;
};
