export const isPNG = (buffer: Buffer) => {
  const header = buffer.subarray(0, 8).toString('hex');
  return header === '89504e470d0a1a0a'; // \211 P N G \r \n \032 'n
};

export const isAnimated = (buffer: Buffer) => {
  let hasACTL = false;
  let hasIDAT = false;
  let hasFDAT = false;

  let previousChunkType = null;

  let offset = 8;

  while (offset < buffer.length) {
    var chunkLength = buffer.readUInt32BE(offset);
    var chunkType = buffer.slice(offset + 4, offset + 8).toString('ascii');

    switch (chunkType) {
      case 'acTL':
        hasACTL = true;
        break;
      case 'IDAT':
        if (!hasACTL) {
          return false;
        }

        if (previousChunkType !== 'fcTL' && previousChunkType !== 'IDAT') {
          return false;
        }

        hasIDAT = true;
        break;
      case 'fdAT':
        if (!hasIDAT) {
          return false;
        }

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
