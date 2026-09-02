// @vitest-environment happy-dom

import { promises as fs } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { File } from 'happy-dom';
import { it, describe } from 'vitest';
import isAnimated from './index.mjs';

const types = ['gif', 'png', 'webp', 'avif'];
const environmentTypes = ['browser', 'nodejs'];
const TEST_DIR = join(__dirname, '..', '__tests__');

const browserReadFile = async (path: string) => {
  const buffer = await fs.readFile(path);
  return new File([buffer], basename(path)).arrayBuffer();
};

const createWebp = (chunks: Array<[string, Buffer]>) => {
  const header = Buffer.alloc(12);
  header.write('RIFF');
  header.write('WEBP', 8);

  const encodedChunks = chunks.map(([type, data]) => {
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(type);
    chunkHeader.writeUInt32LE(data.length, 4);
    const padding = data.length % 2 === 0 ? Buffer.alloc(0) : Buffer.alloc(1);
    return Buffer.concat([chunkHeader, data, padding]);
  });

  const buffer = Buffer.concat([header, ...encodedChunks]);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  return buffer;
};

describe.each(environmentTypes)('when under %s environment', (env) => {
  const readFile = env === 'browser' ? browserReadFile : fs.readFile;
  const prepareBuffer = async (buffer: Buffer) =>
    env === 'browser'
      ? new File([buffer], 'fixture.webp').arrayBuffer()
      : buffer;

  describe.each(types)('when type is "%s"', (type) => {
    it('images are animated', async ({ expect }) => {
      const images = await fs.readdir(join(TEST_DIR, 'animated'));
      const imagesWithCorrectExtension = images.filter(
        (name) => extname(name).slice(1) === type,
      );

      for (const imageName of imagesWithCorrectExtension) {
        const buffer = await readFile(join(TEST_DIR, 'animated', imageName));
        expect(isAnimated(buffer), imageName).toBe(true);
      }
    });
    it('static images are not animated', async ({ expect }) => {
      const images = await fs.readdir(join(TEST_DIR, 'static'));
      const imagesWithCorrectExtension = images.filter(
        (name) => extname(name).slice(1) === type,
      );

      for (const imageName of imagesWithCorrectExtension) {
        const buffer = await readFile(join(TEST_DIR, 'static', imageName));
        expect(isAnimated(buffer), imageName).toBe(false);
      }
    });
    it('invalid images are not invalidated', async ({ expect }) => {
      const images = await fs.readdir(join(TEST_DIR, 'invalid'));
      const imagesWithCorrectExtension = images.filter(
        (name) => extname(name).slice(1) === type,
      );

      for (const imageName of imagesWithCorrectExtension) {
        const buffer = await readFile(join(TEST_DIR, 'invalid', imageName));
        expect(isAnimated(buffer), imageName).toBe(false);
      }
    });
  });

  it('detects animated WebP with an ICC profile', async ({ expect }) => {
    const vp8x = Buffer.alloc(10);
    vp8x[0] = 0x22;
    const webp = createWebp([
      ['VP8X', vp8x],
      ['ICCP', Buffer.alloc(1)],
      ['ANIM', Buffer.alloc(6)],
    ]);

    expect(isAnimated(await prepareBuffer(webp))).toBe(true);
  });

  it('ignores ANIM when the VP8X animation flag is unset', async ({
    expect,
  }) => {
    const webp = createWebp([
      ['VP8X', Buffer.alloc(10)],
      ['ANIM', Buffer.alloc(6)],
    ]);

    expect(isAnimated(await prepareBuffer(webp))).toBe(false);
  });
});
