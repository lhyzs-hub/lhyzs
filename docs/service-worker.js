const CACHE_VERSION = "lhyzs-404-v1";
const CACHE_NAME = `lhyzs-offline-${CACHE_VERSION}`;
const SCOPE_URL = new URL(self.registration.scope);
const OFFLINE_PAGE = new URL("404.html", SCOPE_URL).href;
const CORE_ASSETS = [
  OFFLINE_PAGE,
  new URL("assets/stylesheets/extra.css", SCOPE_URL).href,
  new URL("assets/javascripts/site.js", SCOPE_URL).href,
  new URL("assets/javascripts/not-found-game.js", SCOPE_URL).href,
  new URL("assets/images/game/daisy-run-spritesheet-v2.png", SCOPE_URL).href,
];

const isLocalAsset = (url) =>
  url.origin === SCOPE_URL.origin && url.pathname.startsWith(SCOPE_URL.pathname);

async function cacheResponse(cache, url) {
  const response = await fetch(url, { cache: "reload" });
  if (response.ok) await cache.put(url, response.clone());
  return response;
}

async function precache404() {
  const cache = await caches.open(CACHE_NAME);
  const pageResponse = await cacheResponse(cache, OFFLINE_PAGE);
  const pageSource = await pageResponse.clone().text();
  const discoveredAssets = [...pageSource.matchAll(/(?:src|href|data-sprite)=["']([^"'#]+)["']/g)]
    .map((match) => new URL(match[1], OFFLINE_PAGE))
    .filter(isLocalAsset)
    .map((url) => url.href);

  const assets = [...new Set([...CORE_ASSETS, ...discoveredAssets])].filter(
    (url) => url !== OFFLINE_PAGE,
  );
  await Promise.allSettled(assets.map((url) => cacheResponse(cache, url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache404().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith("lhyzs-offline-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedPage = await caches.match(OFFLINE_PAGE);
        return cachedPage || Response.error();
      }),
    );
    return;
  }

  if (!isLocalAsset(requestUrl)) return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    }),
  );
});
