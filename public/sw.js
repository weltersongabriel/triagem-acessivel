// Increment this name whenever the app shell or bundled app changes.
const CACHE = "triagem-accessivel-v7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./models/makehuman-base.obj",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shellUrl = new URL("./index.html", self.registration.scope);
      const shellResponse = await fetch(new Request(shellUrl, { cache: "reload" }));
      if (!shellResponse.ok) throw new Error("Unable to load the app shell.");

      const html = await shellResponse.clone().text();
      const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
        .map((match) => new URL(match[1], self.registration.scope))
        .filter((url) => url.origin === self.location.origin)
        .map((url) => url.href);
      const cache = await caches.open(CACHE);
      const requests = [...APP_SHELL.map((path) => new URL(path, self.registration.scope).href), ...assets]
        .map((url) => new Request(url, { cache: "reload" }));

      await cache.addAll(requests);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("triagem-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      if (request.mode === "navigate") {
        try {
          const response = await fetch(request);
          if (response.ok) event.waitUntil(cache.put(request, response.clone()));
          return response;
        } catch {
          return (await cache.match(request)) ?? (await cache.match("./index.html")) ?? Response.error();
        }
      }

      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic" && !request.headers.has("range")) {
          event.waitUntil(cache.put(request, response.clone()));
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
