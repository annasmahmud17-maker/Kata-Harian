import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {mediaFiles} from '../data.js';

test('service worker precaches scoped assets, removes obsolete caches, and serves offline range requests', async () => {
  const scope = 'https://example.test/kata-harian/';
  const asset = './assets/audio/fixture.mp3';
  const events = new Map();
  const stores = new Map([
    [`kata-harian:${scope}:v0`, new Map()],
    ['unrelated-cache', new Map()],
  ]);
  const absolute = path => new URL(path, scope).href;
  class ScopedRequest extends Request {
    constructor(path, options) { super(absolute(path), options); }
  }
  let online = true;
  let claimed = false;
  const fetch = async request => {
    if (!online) throw new Error('Offline');
    const url = typeof request === 'string' ? absolute(request) : request.url;
    if (url === absolute(asset)) return new Response('test-audio', {headers: {'Content-Type': 'audio/mpeg'}});
    const relative = url.slice(scope.length) || 'index.html';
    return new Response(await readFile(new URL(relative, new URL('../', import.meta.url))));
  };
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      const cache = {
        async add(request) { store.set(request.url, await fetch(request)); },
        async addAll(requests) { await Promise.all(requests.map(request => cache.add(request))); },
        async match(url) { return store.get(absolute(url))?.clone(); },
        async put(url, response) { store.set(absolute(url), response); },
      };
      return cache;
    },
  };
  const self = {
    registration: {scope},
    clients: {async claim() { claimed = true; }},
    addEventListener(type, handler) { events.set(type, handler); },
  };
  const code = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  runInNewContext(code.replace(/^import .*;\n/, ''), {
    self, caches, fetch, URL, Request: ScopedRequest, Response, mediaFiles: [...mediaFiles, asset],
  });
  const lifecycle = type => new Promise(resolve => events.get(type)({waitUntil: resolve}));
  await lifecycle('install');
  await lifecycle('activate');
  assert(claimed);
  assert.deepEqual([...stores.keys()], ['unrelated-cache', `kata-harian:${scope}:v1`]);

  online = false;
  const get = (path, options = {}) => new Promise(resolve => events.get('fetch')({
    request: {method: 'GET', url: absolute(path), mode: options.mode, headers: new Headers(options.headers)},
    respondWith: resolve,
  }));
  assert.match(await (await get('./', {mode: 'navigate'})).text(), /Kata Harian/);
  for (const image of mediaFiles) assert.equal((await get(image)).status, 200);
  const audio = await get(asset, {headers: {Range: 'bytes=0-3'}});
  assert.equal(audio.status, 206);
  assert.equal(audio.headers.get('Content-Range'), 'bytes 0-3/10');
  assert.equal(await audio.text(), 'test');
});
