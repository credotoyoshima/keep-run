const CACHE_NAME = 'keep-run-v5'
const urlsToCache = [
  '/',
  '/day',
  '/todo',
  '/routines',
  '/analytics',
  '/settings',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  // 一時的にキャッシュを無効化
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          // キャッシュが見つからない場合は、オフラインページを返すか、エラーレスポンスを返す
          return response || new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          })
        })
      })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})