import * as gif from './utils/gif.mjs';
import * as webp from './utils/webp.mjs';
import * as png from './utils/png.mjs';

/** @typedef {import('./types.mjs').NodeBufferOrArrayBuffer} NodeBufferOrArrayBuffer */
/** @typedef {import('./types.mjs').StandardisedBuffer} StandardisedBuffer */

/**
 * Converts Node.js/Web buffer into an unified one with a standardized API
 * @param {NodeBufferOrArrayBuffer} buffer
 * @returns {StandardisedBuffer}
 */
const toStandardisedBuffer = (buffer) => {
  if ('subarray' in buffer) {
    return {
      read: (begin, end, { encoding = 'utf8' } = {}) =>
        buffer.subarray(begin, end).toString(encoding),
      readUInt32BE: (offset) => buffer.readUInt32BE(offset),
      at: (i) => buffer[i],
      length: buffer.length,
    };
  }

  const decoder = new TextDecoder();
  const array = new Uint8Array(/** @type {ArrayBuffer} */ (buffer));
  return {
    read: (begin, end, { encoding = 'utf8' } = {}) => {
      if (encoding === 'utf8')
        return decoder.decode(
          /** @type {ArrayBuffer} */ (buffer.slice(begin, end)),
        );
      return Array.from(array.slice(begin, end))
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    },
    readUInt32BE: (offset) =>
      new DataView(
        /** @type {ArrayBuffer} */
        (buffer),
        array.byteOffset,
        array.byteLength,
      ).getUint32(offset),
    at: (i) => array[i],
    length: array.length,
  };
};

/**
 * Checks if buffer contains animated image
 * @param {NodeBufferOrArrayBuffer} buffer
 */
export default function isAnimated(buffer) {
  const standardisedBuffer = toStandardisedBuffer(buffer);
  if (gif.isGIF(standardisedBuffer)) return gif.isAnimated(standardisedBuffer);
  if (png.isPNG(standardisedBuffer)) return png.isAnimated(standardisedBuffer);
  if (webp.isWebp(standardisedBuffer))
    return webp.isAnimated(standardisedBuffer);

  return false;
}
