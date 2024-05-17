<p align="center">
  <a href="https://www.npmjs.com/package/@frsource/is-animated">
    <img src="https://img.shields.io/npm/v/@frsource/is-animated" alt="NPM version badge">
  </a>
  <a href="https://bundlejs.com/?q=%40frsource%2Fis-animated">
    <img src="https://deno.bundlejs.com/badge?q=@frsource/is-animated" alt="GZIP size calculated by bundlejs.com">
  </a>
  <a href="https://github.com/semantic-release/semantic-release">
    <img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg" alt="semantic-release badge">
  </a>
  <a href="https://github.com/FRSOURCE/is-animated/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/FRSOURCE/is-animated" alt="license MIT badge">
  </a>
</p>

<h1 align="center">is-animated - checks if the image is animated 🎞</h1>

<p align="center">
  <a href="#quick-start">Getting Started</a>
  ·
  <a href="https://www.frsource.org/is-animated" target="_blank">Demo</a>
  ·
  <a href="https://github.com/FRSOURCE/is-animated/issues">File an Issue</a>
  ·
  <a href="#questions">Have a question or an idea?</a>
  <br>
</p>

<p align="center">
  <br>
  <i>A simple library for detecting animated images.
    <br>Works under Node and Browser environments!
    <br>Performant & with small bundle size
    <br>Supports GIF, APNG and WebP
    <br>Written completely in <a href="https://www.typescriptlang.org">typescript</a>
    <br>Published under <a href="https://opensource.org/licenses/MIT" target="_blank">MIT</a> license</i>
  <br>
  <br>
</p>

## Quick start

### Installation

```bash
npm install @frsource/is-animated

yarn add @frsource/is-animated

pnpm add @frsource/is-animated
```

### Usage in browser

```html
<input type="file" accept="image/*" />
```

```ts
const input = document.querySelector('input[type="file"]');

input.addEventListener('change', async function () {
  const arrayBuffer = await this.files[0].arrayBuffer();
  const answer = isAnimated(arrayBuffer) ? 'Yes' : 'No';
  alert(`Is "${this.files[0].name}" animated? ${answer}.`);
});
```

### Usage in Node.js

```ts
import { readFileSync } from 'fs';
import isAnimated from '@frsource/is-animated';

readFileSync('my-test-file.png', (err, buffer) => {
  const answer = isAnimated(buffer) ? 'Yes' : 'No';
  console.log(`Is "my-test-file.png" animated? ${answer}.`);
});
```

For a working example, check out [our demo](https://www.frsource.org/is-animated#demo).

## Questions

Don’t hesitate to ask a question directly on the [discussion board](https://github.com/FRSOURCE/is-animated/discussions)!

## Changelog

Changes for every release are documented in the [release notes](https://github.com/FRSOURCE/is-animated/releases) and [CHANGELOG file](https://github.com/FRSOURCE/is-animated/tree/main/CHANGELOG.md).

## Development

1. Check out the repository.
2. Install dependencies using `pnpm i`.
3. Run `pnpm test` to run the test suite.
4. Run `pnpm start` and visit `http://localhost:3000` to see the documentation page. You can test the library using the demo section.

## License

[MIT](https://opensource.org/licenses/MIT) @ 2024-present, [Jakub FRS Freisler](https://www.linkedin.com/in/jakub-freisler-03a32138/), [FRSOURCE](https://www.frsource.org/)

Forked from [qzb](https://github.com/qzb)'s great library: [is-animated](https://github.com/qzb/is-animated).
