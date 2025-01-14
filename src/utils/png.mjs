/** @typedef {import('../types.mjs').StandardisedBuffer} StandardisedBuffer */

/** @param {StandardisedBuffer} buffer */
export const isPNG = (buffer) => {
  const header = buffer.read(0, 8, { encoding: 'hex' });
  return header === '89504e470d0a1a0a'; // \211 P N G \r \n \032 'n
};

/** @param {StandardisedBuffer} buffer */
export const isAnimated = (buffer) => {
  let hasACTL = false;
  let hasIDAT = false;
  let hasFDAT = false;

  /** @type {string | undefined} */
  let previousChunkType;

  let offset = 8;

  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.read(offset + 4, offset + 8);

    switch (chunkType) {
      case 'acTL':
        hasACTL = true;
        break;
      case 'IDAT':
        if (!hasACTL) return false;

        if (previousChunkType !== 'fcTL' && previousChunkType !== 'IDAT') {
          return false;
        }

        hasIDAT = true;
        break;
      case 'fdAT':
        if (!hasIDAT) return false;

        if (previousChunkType !== 'fcTL' && previousChunkType !== 'fdAT') {
          return false;
        }

        hasFDAT = true;
        break;
    }

    previousChunkType = chunkType;
    offset += 4 + 4 + chunkLength + 4;
  }

  return hasACTL && hasIDAT && hasFDAT;
};
