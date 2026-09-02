import { deflateSync } from 'node:zlib';
import isAnimated from '../src/index.mjs';
import * as avif from '../src/utils/avif.mjs';
import * as gif from '../src/utils/gif.mjs';
import * as png from '../src/utils/png.mjs';
import * as webp from '../src/utils/webp.mjs';

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

const createAnimatedPNG = (targetSize, metadataChunkCount) => {
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

const createStaticPNG = (targetSize) => {
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

const toStandardisedBuffer = (buffer) => ({
  read: (begin, end, { encoding = 'utf8' } = {}) =>
    buffer.subarray(begin, end).toString(encoding),
  readUInt32BE: (offset) => buffer.readUInt32BE(offset),
  at: (index) => buffer[index],
  length: buffer.length,
});

const isPNGAnimatedBeforeEarlyReturn = (buffer) => {
  let hasACTL = false;
  let hasIDAT = false;
  let hasFDAT = false;
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
    offset += 12 + chunkLength;
  }

  return hasACTL && hasIDAT && hasFDAT;
};

const isAnimatedBeforeEarlyReturn = (buffer) => {
  const standardisedBuffer = toStandardisedBuffer(buffer);
  if (gif.isGIF(standardisedBuffer)) return gif.isAnimated(standardisedBuffer);
  if (png.isPNG(standardisedBuffer)) {
    return isPNGAnimatedBeforeEarlyReturn(standardisedBuffer);
  }
  if (webp.isWebp(standardisedBuffer)) {
    return webp.isAnimated(standardisedBuffer);
  }
  if (avif.isAvif(standardisedBuffer)) {
    return avif.isAnimated(standardisedBuffer);
  }
  return false;
};

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const time = (callback, iterations) => {
  const start = process.hrtime.bigint();
  let result = false;
  for (let iteration = 0; iteration < iterations; iteration++) {
    result = callback();
  }
  const nanoseconds = Number(process.hrtime.bigint() - start) / iterations;
  if (typeof result !== 'boolean') throw new TypeError('Expected a boolean');
  return nanoseconds;
};

const calibrate = (callback) => {
  let iterations = 100;
  let elapsed = time(callback, iterations) * iterations;
  while (elapsed < 50e6 && iterations < 1e7) {
    iterations *= 10;
    elapsed = time(callback, iterations) * iterations;
  }
  return Math.max(
    100,
    Math.min(1e7, Math.round((iterations * 250e6) / elapsed)),
  );
};

const benchmark = (name, buffer) => {
  const beforeResult = isAnimatedBeforeEarlyReturn(buffer);
  const afterResult = isAnimated(buffer);
  if (beforeResult !== afterResult) {
    throw new Error(
      `${name} output mismatch: ${beforeResult} before, ${afterResult} after`,
    );
  }

  for (let iteration = 0; iteration < 1000; iteration++) {
    isAnimatedBeforeEarlyReturn(buffer);
    isAnimated(buffer);
  }

  const beforeIterations = calibrate(() => isAnimatedBeforeEarlyReturn(buffer));
  const afterIterations = calibrate(() => isAnimated(buffer));
  const beforeSamples = [];
  const afterSamples = [];

  for (let round = 0; round < 9; round++) {
    global.gc();
    if (round % 2 === 0) {
      beforeSamples.push(
        time(() => isAnimatedBeforeEarlyReturn(buffer), beforeIterations),
      );
      afterSamples.push(time(() => isAnimated(buffer), afterIterations));
    } else {
      afterSamples.push(time(() => isAnimated(buffer), afterIterations));
      beforeSamples.push(
        time(() => isAnimatedBeforeEarlyReturn(buffer), beforeIterations),
      );
    }
  }

  const beforeNanoseconds = median(beforeSamples);
  const afterNanoseconds = median(afterSamples);
  return {
    name,
    beforeMicroseconds: beforeNanoseconds / 1000,
    afterMicroseconds: afterNanoseconds / 1000,
    speedup: beforeNanoseconds / afterNanoseconds,
  };
};

const fixtures = [
  {
    name: '15.3 MiB animated PNG',
    buffer: createAnimatedPNG(Math.round(15.3 * 1024 * 1024), 850),
  },
  {
    name: '521-byte animated PNG',
    buffer: createAnimatedPNG(521, 1),
  },
  {
    name: '31.2 MiB static PNG',
    buffer: createStaticPNG(Math.round(31.2 * 1024 * 1024)),
  },
];

const results = fixtures.map(({ name, buffer }) => benchmark(name, buffer));

const output = [
  '| Fixture | Before | After | Improvement |',
  '|---|---:|---:|---:|',
];
for (const result of results) {
  output.push(
    `| ${result.name} | ${result.beforeMicroseconds.toFixed(2)} µs | ${result.afterMicroseconds.toFixed(2)} µs | **${result.speedup.toFixed(2)}×** |`,
  );
}
process.stdout.write(`${output.join('\n')}\n`);
