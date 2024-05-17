// @vitest-environment happy-dom

import { promises as fs } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { File } from 'happy-dom';
import { it, describe } from 'vitest';
import isAnimated from './index';

const types = ['gif', 'png', 'webp'];
const environmentTypes = ['browser', 'nodejs'];
const TEST_DIR = join(__dirname, '..', '__tests__');

const browserReadFile = async (path: string) => {
  const buffer = await fs.readFile(path);
  return new File([buffer], basename(path)).arrayBuffer();
};

describe.each(environmentTypes)('when under %s environment', (env) => {
  const readFile = env === 'browser' ? browserReadFile : fs.readFile;

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
});
