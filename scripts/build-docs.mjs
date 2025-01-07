/* eslint no-console: "off" */

import { argv } from 'process';
import fastGlob from 'fast-glob';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as chokidar from 'chokidar';
import { Browser } from 'happy-dom';
import { codeToHtml } from 'shiki';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const browser = new Browser();
const page = browser.newPage();
page.url = 'https://example.com';
const document = page.mainFrame.document;
if (argv.pop() === '--watch') {
  build();
  chokidar
    .watch(fastGlob.globSync(['scripts/*.tpl.*', './src/**']), {
      ignoreInitial: true,
    })
    .on('all', (e, path) => {
      console.log(`File ${e}`, path);
      build();
    });
} else {
  await build();
  await browser.close();
}

///

async function build() {
  console.log('building docs');
  await applyShikiToDocs();
  cp(['index.tpl.js'], ['..', 'docs', 'index.js']);
}

async function applyShikiToDocs() {
  page.content = readFile(['index.tpl.html']);

  await Promise.all(
    Array.from(document.body.querySelectorAll('code')).map(async (el) => {
      const div = document.createElement('div');
      const lang = el.dataset.lang ?? 'js';
      div.innerHTML = await codeToHtml(el.textContent, {
        lang,
        theme: 'ayu-dark',
      });
      div.children[0].dataset.lang = lang;

      el.parentElement.replaceWith(div);
    }),
  );

  writeFile(['..', 'docs', 'index.html'], page.content);
}

function cp(source, target) {
  return cpSync(join(__dirname, ...source), join(__dirname, ...target));
}

function readFile(path) {
  return readFileSync(join(__dirname, ...path)).toString();
}

function writeFile(path, data) {
  path = join(__dirname, ...path);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}
