import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const MIB = 1024 * 1024;
const TESTS_DIR = join(import.meta.dirname, '..', '__tests__');

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) {
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return crc >>> 0;
});

const crc32 = (buffers) => {
  let crc = 0xffffffff;
  for (const buffer of buffers) {
    for (const byte of buffer) {
      crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const createChunk = (type, data = Buffer.alloc(0)) => {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32([typeBuffer, data]), 8 + data.length);
  return chunk;
};

const createIHDR = () => {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(1, 0);
  data.writeUInt32BE(1, 4);
  data[8] = 8;
  data[9] = 6;
  return createChunk('IHDR', data);
};

const createACTL = () => {
  const data = Buffer.alloc(8);
  data.writeUInt32BE(2, 0);
  return createChunk('acTL', data);
};

const createFCTL = (sequenceNumber) => {
  const data = Buffer.alloc(26);
  data.writeUInt32BE(sequenceNumber, 0);
  data.writeUInt32BE(1, 4);
  data.writeUInt32BE(1, 8);
  data.writeUInt16BE(1, 20);
  data.writeUInt16BE(10, 22);
  return createChunk('fcTL', data);
};

const createFDAT = (sequenceNumber, imageData) => {
  const data = Buffer.alloc(4 + imageData.length);
  data.writeUInt32BE(sequenceNumber, 0);
  imageData.copy(data, 4);
  return createChunk('fdAT', data);
};

const createTextChunks = (encodedSize, count) => {
  const minimumDataSize = Buffer.byteLength('benchmark') + 1;
  const minimumChunkSize = minimumDataSize + 12;
  if (encodedSize < minimumChunkSize * count) {
    throw new RangeError('Not enough space for PNG text chunks');
  }

  const baseChunkSize = Math.floor(encodedSize / count);
  let remainder = encodedSize % count;
  return Array.from({ length: count }, () => {
    const chunkSize = baseChunkSize + (remainder-- > 0 ? 1 : 0);
    const data = Buffer.alloc(chunkSize - 12, 0x78);
    data.write('benchmark');
    data[Buffer.byteLength('benchmark')] = 0;
    return createChunk('tEXt', data);
  });
};

/**
 * Creates a valid 1×1 animated PNG (APNG) with the given total size. The size
 * is reached with `metadataChunkCount` `tEXt` chunks placed after the last
 * `fdAT` chunk, so a parser without an early return has to walk all of them.
 * @param {number} targetSize
 * @param {number} metadataChunkCount
 */
export const createAnimatedPNG = (targetSize, metadataChunkCount) => {
  const redPixel = deflateSync(Buffer.from([0, 0xff, 0, 0, 0xff]));
  const bluePixel = deflateSync(Buffer.from([0, 0, 0, 0xff, 0xff]));
  const fixedChunks = [
    createIHDR(),
    createACTL(),
    createFCTL(0),
    createChunk('IDAT', redPixel),
    createFCTL(1),
    createFDAT(2, bluePixel),
  ];
  const endChunk = createChunk('IEND');
  const fixedSize =
    PNG_SIGNATURE.length +
    fixedChunks.reduce((total, chunk) => total + chunk.length, 0) +
    endChunk.length;
  const metadataChunks = createTextChunks(
    targetSize - fixedSize,
    metadataChunkCount,
  );
  return Buffer.concat([
    PNG_SIGNATURE,
    ...fixedChunks,
    ...metadataChunks,
    endChunk,
  ]);
};

/**
 * Creates a valid 1×1 static PNG with the given total size. The size is
 * reached with a single `tEXt` chunk placed before the `IDAT` chunk.
 * @param {number} targetSize
 */
export const createStaticPNG = (targetSize) => {
  const imageData = deflateSync(Buffer.from([0, 0, 0, 0, 0xff]));
  const fixedChunks = [
    createIHDR(),
    createChunk('IDAT', imageData),
    createChunk('IEND'),
  ];
  const fixedSize =
    PNG_SIGNATURE.length +
    fixedChunks.reduce((total, chunk) => total + chunk.length, 0);
  const metadataChunks = createTextChunks(targetSize - fixedSize, 1);
  return Buffer.concat([
    PNG_SIGNATURE,
    fixedChunks[0],
    ...metadataChunks,
    fixedChunks[1],
    fixedChunks[2],
  ]);
};

// ---------------------------------------------------------------------------
// GIF
// ---------------------------------------------------------------------------

const GIF_HEADER = Buffer.from('GIF89a');

// 1×1 logical screen with a 2-entry global colour table.
const GIF_LOGICAL_SCREEN_DESCRIPTOR = Buffer.from([
  0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
]);
const GIF_GLOBAL_COLOR_TABLE = Buffer.alloc(6);
const GIF_TRAILER = Buffer.from([0x3b]);
const GIF_MAX_SUB_BLOCK = 255;

/**
 * Encodes `dataSize` bytes as a GIF data sub-block sequence followed by the
 * block terminator. The payload is never decoded by `is-animated`, only walked.
 * @param {number} dataSize
 */
const createSubBlocks = (dataSize) => {
  const fullBlocks = Math.floor(dataSize / GIF_MAX_SUB_BLOCK);
  const lastBlockSize = dataSize % GIF_MAX_SUB_BLOCK;
  const fullBlock = Buffer.concat([
    Buffer.from([GIF_MAX_SUB_BLOCK]),
    Buffer.alloc(GIF_MAX_SUB_BLOCK, 0x78),
  ]);
  const blocks = Array.from({ length: fullBlocks }, () => fullBlock);
  if (lastBlockSize > 0) {
    blocks.push(
      Buffer.concat([
        Buffer.from([lastBlockSize]),
        Buffer.alloc(lastBlockSize, 0x78),
      ]),
    );
  }
  blocks.push(Buffer.from([0x00]));
  return Buffer.concat(blocks);
};

/** Size of the sub-block sequence produced by `createSubBlocks(dataSize)`. */
const subBlocksLength = (dataSize) =>
  dataSize + Math.ceil(dataSize / GIF_MAX_SUB_BLOCK) + 1;

/**
 * Creates a 1×1 image descriptor without a local colour table followed by
 * LZW image data of `dataSize` bytes.
 * @param {number} dataSize
 */
const createImageDescriptor = (dataSize) =>
  Buffer.concat([
    Buffer.from([
      0x2c, // image separator
      0x00,
      0x00, // left
      0x00,
      0x00, // top
      0x01,
      0x00, // width
      0x01,
      0x00, // height
      0x00, // packed: no local colour table
      0x02, // LZW minimum code size
    ]),
    createSubBlocks(dataSize),
  ]);

const IMAGE_DESCRIPTOR_HEADER_SIZE = 11;

const createGIF = (targetSize, frames) => {
  const smallFrameDataSize = 1;
  const fixedSize =
    GIF_HEADER.length +
    GIF_LOGICAL_SCREEN_DESCRIPTOR.length +
    GIF_GLOBAL_COLOR_TABLE.length +
    IMAGE_DESCRIPTOR_HEADER_SIZE +
    (frames > 1
      ? IMAGE_DESCRIPTOR_HEADER_SIZE + subBlocksLength(smallFrameDataSize)
      : 0) +
    GIF_TRAILER.length;

  // Find the largest payload whose encoded sub-blocks fit the remaining space.
  let dataSize = targetSize - fixedSize;
  while (dataSize > 0 && fixedSize + subBlocksLength(dataSize) > targetSize) {
    dataSize--;
  }
  if (dataSize <= 0) {
    throw new RangeError('Not enough space for GIF image data');
  }

  const parts = [
    GIF_HEADER,
    GIF_LOGICAL_SCREEN_DESCRIPTOR,
    GIF_GLOBAL_COLOR_TABLE,
    createImageDescriptor(dataSize),
  ];
  if (frames > 1) parts.push(createImageDescriptor(smallFrameDataSize));
  parts.push(GIF_TRAILER);
  return Buffer.concat(parts);
};

/**
 * Creates an animated GIF (two frames) whose first frame carries enough image
 * data to reach `targetSize`, so the parser has to walk it before finding the
 * second image descriptor.
 * @param {number} targetSize
 */
export const createAnimatedGIF = (targetSize) => createGIF(targetSize, 2);

/**
 * Creates a static GIF (one frame) whose image data reaches `targetSize`.
 * @param {number} targetSize
 */
export const createStaticGIF = (targetSize) => createGIF(targetSize, 1);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * @param {number} bytes
 */
export const formatBytes = (bytes) => {
  if (bytes >= MIB) return `${(bytes / MIB).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
};

const readTestFixture = (animated, format) =>
  readFileSync(
    join(TESTS_DIR, animated ? 'animated' : 'static', `regular.${format}`),
  );

/**
 * @typedef {object} Fixture
 * @property {string} name
 * @property {'gif' | 'png' | 'webp' | 'avif'} format
 * @property {boolean} animated
 * @property {string} description
 * @property {Buffer} buffer
 */

/**
 * @param {Fixture['format']} format
 * @param {boolean} animated
 * @param {Buffer} buffer
 * @param {string} [detail]
 * @returns {Fixture}
 */
const FORMAT_LABELS = { gif: 'GIF', png: 'PNG', webp: 'WebP', avif: 'AVIF' };

const fixture = (format, animated, buffer, detail) => ({
  name: `${formatBytes(buffer.length)} ${animated ? 'animated' : 'static'} ${FORMAT_LABELS[format]}${detail ? ` (${detail})` : ''}`,
  format,
  animated,
  description: detail ?? '',
  buffer,
});

/**
 * Only GIF and PNG parsing scales with the input, so those get large synthetic
 * buffers. WebP and AVIF are fixed-offset header reads, so the real test files
 * are enough for them.
 * @returns {Fixture[]}
 */
export const createFixtures = () => [
  fixture(
    'png',
    true,
    createAnimatedPNG(Math.round(15.3 * MIB), 850),
    '850 metadata chunks',
  ),
  fixture('png', false, createStaticPNG(Math.round(31.2 * MIB))),
  fixture('gif', true, createAnimatedGIF(16 * MIB)),
  fixture('gif', false, createStaticGIF(16 * MIB)),
  ...['png', 'gif', 'webp', 'avif'].flatMap((format) =>
    [true, false].map((animated) =>
      fixture(format, animated, readTestFixture(animated, format)),
    ),
  ),
];
