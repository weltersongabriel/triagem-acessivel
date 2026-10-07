// Aumente o número da versão SEMPRE que alterar qualquer arquivo do app.
const CACHE = 'triagem-v1';

// Arquivos essenciais (precisam existir, senão a instalação falha).
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

// Áudios e vídeos de Libras: liste aqui os que existirem. Exemplos:
// 'audio/voce-esta-bem.mp3', 'libras/voce-esta-bem.mp4'
const MEDIA = [];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.all(MEDIA.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Safari exige suporte a "Range" para tocar vídeo/áudio vindo do cache.
async function rangeResponse(req, res) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range'));
  const s = +m[1], e = m[2] ? +m[2] : buf.byteLength - 1;
  return new Response(buf.slice(s, e + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': `bytes ${s}-${e}/${buf.byteLength}`,
      'Content-Length': e - s + 1
    }
  });
}

// Cache primeiro; se não tiver, busca na rede e guarda.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    let res = await c.match(r, { ignoreSearch: true });
    if (!res) {
      try {
        res = await fetch(r);
        if (res.status === 200) c.put(r, res.clone());
      } catch (_) {
        if (r.mode === 'navigate') res = await c.match('index.html');
        if (!res) return Response.error();
      }
    }
    if (r.headers.has('range') && res.status === 200) return rangeResponse(r, res);
    return res;
  })());
});