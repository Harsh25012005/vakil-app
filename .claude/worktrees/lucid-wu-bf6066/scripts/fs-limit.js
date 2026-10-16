// Caps concurrent fs.promises file opens inside the Metro process and retries on EMFILE.
//
// Why: Metro's cache reads ~2,000 files at once (Promise.all). On Windows with Node 26 that
// exhausts the per-process file limit ("EMFILE: too many open files"), the bundle request fails
// and Expo Go silently keeps running its last cached bundle. Loaded from metro.config.js only;
// it never ships in the app. Harmless on Node LTS, where it simply never has to wait.
const fs = require('node:fs');

const MAX_OPEN = 128;
const RETRY_MS = 25;
const MAX_RETRIES = 40;

let active = 0;
const queue = [];

function acquire() {
  if (active < MAX_OPEN) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release() {
  const next = queue.shift();
  if (next) next();
  else active--;
}

function limited(fn) {
  return async function (...args) {
    await acquire();
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          return await fn.apply(this, args);
        } catch (err) {
          if (err && err.code === 'EMFILE' && attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_MS * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
    } finally {
      release();
    }
  };
}

if (!fs.promises.__vakilLimited) {
  for (const name of ['readFile', 'writeFile', 'open', 'readdir', 'stat']) {
    fs.promises[name] = limited(fs.promises[name]);
  }
  fs.promises.__vakilLimited = true;
}
