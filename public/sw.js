const CACHE_NAME = 'business-app-v1';
const URLS_TO_CACHE = ['/', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// নেটওয়ার্ক-ফার্স্ট স্ট্র্যাটেজি: ইন্টারনেট থাকলে সবসময় সর্বশেষ ডেটা আনবে,
// ইন্টারনেট না থাকলে (সাময়িক অফলাইন) ক্যাশে যা আছে তা দেখাবে
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});