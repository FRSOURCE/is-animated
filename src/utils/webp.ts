import type { StandardisedBuffer } from '../types';

export const isWebp = (buffer: StandardisedBuffer) =>
  buffer.read(8, 12) === 'WEBP';

export const isAnimated = (buffer: StandardisedBuffer) =>
  ['VP8 ', 'VP8X'].includes(buffer.read(12, 16)) &&
  buffer.read(30, 34) === 'ANIM';
