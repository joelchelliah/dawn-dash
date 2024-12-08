const CACHE_NAME = 'dawn-dash-cache-v2'
const IMAGE_URLS = [
  'https://blightbane.io/images/classes/Arcanist_I_M.webp',
  'https://blightbane.io/images/classes/Hunter_I_F.webp',
  'https://blightbane.io/images/classes/Knight_I_M.webp',
  'https://blightbane.io/images/classes/Rogue_I_F.webp',
  'https://blightbane.io/images/classes/Seeker_I_M.webp',
  'https://blightbane.io/images/classes/Warrior_I_M.webp',
  'https://blightbane.io/images/icons/cardart_4_53.webp',
  'https://blightbane.io/images/icons/cardart_5_50.webp',
  'https://blightbane.io/images/bolgar.png',
]

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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(IMAGE_URLS)
    })
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})