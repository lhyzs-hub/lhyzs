const CACHE_VERSION = "lhyzs-site-v34";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CACHE_PREFIXES = ["lhyzs-site-v", "lhyzs-offline-"];
const SCOPE_URL = new URL(self.registration.scope);
const OFFLINE_PAGE = new URL("404.html", SCOPE_URL).href;
const CORE_ASSETS = [
  OFFLINE_PAGE,
  new URL("assets/stylesheets/not-found.css", SCOPE_URL).href,
  new URL("assets/javascripts/not-found-game.js", SCOPE_URL).href,
  new URL("assets/images/game/daisy-run-spritesheet-v2.png", SCOPE_URL).href,
];

const isLocalAsset = (url) =>
  url.origin === SCOPE_URL.origin && url.pathname.startsWith(SCOPE_URL.pathname);

const normalizedUrl = (url) => {
  const normalized = new URL(url);
  normalized.hash = "";
  normalized.search = "";
  return normalized.href;
};

const canCache = (response) =>
  response && response.ok && response.status === 200 && response.type !== "opaque";

async function putResponse(cacheName, key, response) {
  if (!canCache(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(key, response.clone());
}

async function installOfflineShell() {
  const cache = await caches.open(CORE_CACHE);
  await Promise.all(CORE_ASSETS.map(async (url) => {
    const response = await fetch(url, { cache: "reload" });
    if (!canCache(response)) throw new Error(`Unable to cache ${url}`);
    await cache.put(url, response);
  }));
}

async function networkFirstPage(request) {
  const key = normalizedUrl(request.url);
  try {
    const response = await fetch(request);
    await putResponse(RUNTIME_CACHE, key, response);
    return response;
  } catch {
    return (await caches.match(key)) || (await caches.match(OFFLINE_PAGE)) || Response.error();
  }
}

function staleWhileRevalidate(request, event) {
  const key = normalizedUrl(request.url);
  const cached = caches.match(key);
  const update = fetch(request)
    .then(async (response) => {
      await putResponse(RUNTIME_CACHE, key, response);
      return response;
    });

  event.waitUntil(update.catch(() => undefined));
  return cached.then((response) => response || update.catch(() => Response.error()));
}

self.addEventListener("install", (event) => {
  event.waitUntil(installOfflineShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => (
            CACHE_PREFIXES.some((prefix) => name.startsWith(prefix))
            && ![CORE_CACHE, RUNTIME_CACHE].includes(name)
          ))
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const requestUrl = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (!isLocalAsset(requestUrl)) return;
  event.respondWith(staleWhileRevalidate(request, event));
});
