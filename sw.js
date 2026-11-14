import {mediaFiles} from './data.js';

const prefix = `kata-harian:${self.registration.scope}:`;
const cacheName = prefix + 'v14';
const shell = [
  './', './index.html', './style.css', './app.js', './data.js', './puzzle.js', './app.webmanifest',
  './assets/icons/logo.webp', './assets/icons/kh-32.png', './assets/icons/kh-180.png',
  './assets/icons/kh-192.png', './assets/icons/kh-512.png', './assets/icons/kh-maskable.png',
];
const media = new Set(mediaFiles.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(shell.map(path => new Request(path, {cache: 'reload'})));
    await Promise.allSettled(mediaFiles.map(path => cache.add(new Request(path, {cache: 'reload'}))));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function serveRange(request, cached) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range'));
  const buffer = await cached.arrayBuffer();
  const length = buffer.byteLength;
  const start = match?.[1] ? Number(match[1]) : Math.max(0, length - Number(match?.[2]));
  const end = match?.[1] && match[2] ? Math.min(Number(match[2]), length - 1) : length - 1;
  if (!match || start > end || start >= length) {
    return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${length}`}});
  }
  return new Response(buffer.slice(start, end + 1), {status: 206, headers: {
    'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${length}`,
    'Content-Length': String(end - start + 1), 'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
  }});
}

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    if (request.mode === 'navigate') {
      const page = await cache.match('./');
      return page || fetch(request);
    }
    const cached = await cache.match(request.url);
    if (cached) return request.headers.has('range') ? serveRange(request, cached) : cached;
    if (!media.has(request.url)) return fetch(request);
    const full = await fetch(request.url);
    if (!full.ok) return full;
    await cache.put(request.url, full.clone()).catch(() => {});
    return request.headers.has('range') ? serveRange(request, full) : full;
  })());
});
