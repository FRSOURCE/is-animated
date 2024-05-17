import type { StandardisedBuffer } from '../types';

/**
 * Returns total length of data blocks sequence
 */
function getDataBlocksLength(buffer: StandardisedBuffer, offset: number) {
  let length = 0;

  while (buffer.at(offset + length)) {
    length += buffer.at(offset + length) + 1;
  }

  return length + 1;
}

/**
 * Checks if buffer contains GIF image
 */
export const isGIF = (buffer: StandardisedBuffer) =>
  buffer.read(0, 3) === 'GIF';

/**
 * Checks if buffer contains animated GIF image
 */
export const isAnimated = (buffer: StandardisedBuffer) => {
  let hasColorTable, colorTableSize;
  let offset = 0;
  let imagesCount = 0;

  // Skip header, logical screen descriptor and global color table

  hasColorTable = buffer.at(10) & 0x80; // 0b10000000
  colorTableSize = buffer.at(10) & 0x07; // 0b00000111

  offset += 6; // skip header
  offset += 7; // skip logical screen descriptor
  offset += hasColorTable ? 3 * Math.pow(2, colorTableSize + 1) : 0; // skip global color table

  // Find if there is more than one image descriptor

  while (imagesCount < 2 && offset < buffer.length) {
    switch (buffer.at(offset)) {
      // Image descriptor block. According to specification there could be any
      // number of these blocks (even zero). When there is more than one image
      // descriptor browsers will display animation (they shouldn't when there
      // is no delays defined, but they do it anyway).
      case 0x2c:
        imagesCount += 1;

        hasColorTable = buffer.at(offset + 9) & 0x80; // 0b10000000
        colorTableSize = buffer.at(offset + 9) & 0x07; // 0b00000111

        offset += 10; // skip image descriptor
        offset += hasColorTable ? 3 * Math.pow(2, colorTableSize + 1) : 0; // skip local color table
        offset += getDataBlocksLength(buffer, offset + 1) + 1; // skip image data

        break;

      // Skip all extension blocks. In theory this "plain text extension" blocks
      // could be frames of animation, but no browser renders them.
      case 0x21:
        offset += 2; // skip introducer and label
        offset += getDataBlocksLength(buffer, offset); // skip this block and following data blocks

        break;

      // Stop processing on trailer block,
      // all data after this point will is ignored by decoders
      case 0x3b:
        offset = buffer.length; // fast forward to end of buffer
        break;

      // Oops! This GIF seems to be invalid
      default:
        offset = buffer.length; // fast forward to end of buffer
        break;
    }
  }

  return imagesCount > 1;
};
