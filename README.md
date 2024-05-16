
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
  <a href="https://github.com/FRSOURCE/is-animated/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/FRSOURCE/is-animated" alt="license MIT badge">
  </a>
</p>

<h1 align="center">is-animated - Checks if image is animated 🎞</h1>

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
    <br>Performant & with small bundle size (less than 1.2kB!)
    <br>Supports GIF, APNG and WebP images
    <br>Written completely in <a href="https://www.typescriptlang.org">typescript</a></i>
    <br>Published under <a href="https://opensource.org/licenses/MIT" target="_blank">MIT</a> license</i>
  <br>
  <br>
</p>

## Quick start

### Installation

```bash
npm install @frsource/autoresize-textarea

yarn add @frsource/autoresize-textarea

pnpm add @frsource/autoresize-textarea
```

### Modern JS/Typescript

```ts
const fs = require('fs')
const isAnimated = require('is-animated')

const filename = process.argv[2]

fs.readFile(filename, (err, buffer) => {
  const answer = isAnimated(buffer) ? 'Yes' : 'No'
  console.log(`Is "${filename}" animated? ${answer}.`)
})
```

For a working example, check out [our demo](https://www.frsource.org/is-animated).

## Questions

Don’t hesitate to ask a question directly on the [discussion board](https://github.com/FRSOURCE/is-animated/discussions)!

## Changelog

Changes for every release are documented in the [release notes](https://github.com/FRSOURCE/is-animated/releases) and [CHANGELOG file](https://github.com/FRSOURCE/is-animated/tree/master/CHANGELOG.md).

## License

[MIT](https://opensource.org/licenses/MIT) @ 2024-present, [Jakub FRS Freisler](https://www.linkedin.com/in/jakub-freisler-03a32138/), [FRSOURCE](https://www.frsource.org/)

Forked from great [qzb](https://github.com/qzb)'s work: [is-animated](https://github.com/qzb/is-animated).
