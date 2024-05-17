import * as gif from './utils/gif';
import * as webp from './utils/webp';
import * as png from './utils/png';
import type { NodeBufferOrArrayBuffer, StandardisedBuffer } from './types';

const toStandardisedBuffer = (
  buffer: NodeBufferOrArrayBuffer,
): StandardisedBuffer => {
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
  const array = new Uint8Array(buffer as ArrayBuffer);
  return {
    read: (begin, end, { encoding = 'utf8' } = {}) => {
      if (encoding === 'utf8')
        return decoder.decode(buffer.slice(begin, end) as ArrayBuffer);
      return [...array.slice(begin, end)]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    },
    readUInt32BE: (offset) =>
      new DataView(
        buffer as ArrayBuffer,
        array.byteOffset,
        array.byteLength,
      ).getUint32(offset),
    at: (i) => array[i],
    length: array.length,
  };
};

/**
 * Checks if buffer contains animated image
 */
export default function isAnimated(buffer: NodeBufferOrArrayBuffer) {
  const standardisedBuffer = toStandardisedBuffer(buffer);
  if (gif.isGIF(standardisedBuffer)) return gif.isAnimated(standardisedBuffer);
  if (png.isPNG(standardisedBuffer)) return png.isAnimated(standardisedBuffer);
  if (webp.isWebp(standardisedBuffer))
    return webp.isAnimated(standardisedBuffer);

  return false;
}
