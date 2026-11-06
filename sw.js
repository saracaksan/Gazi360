/* Gazi Ortaokulu Davranış Takip · service worker
   Yalnızca uygulama dosyalarını (aynı kaynaktaki GET istekleri) önbelleğe alır.
   Apps Script API istekleri (POST, başka alan adı) hiçbir zaman önbelleğe alınmaz. */
const SURUM = 'davranis-takip-v1';
const DOSYALAR = [
  './', 'index.html', 'config.js', 'pwa.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SURUM)
      .then(c => Promise.all(DOSYALAR.map(d => c.add(d).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(anahtarlar => Promise.all(anahtarlar.filter(k => k !== SURUM).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Önce önbellek, arkada güncelleme: yeni sürüm bir sonraki açılışta görünür
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(onbellek => {
      const ag = fetch(r)
        .then(y => {
          if (y && y.ok) {
            const kopya = y.clone();
            caches.open(SURUM).then(c => c.put(r, kopya));
          }
          return y;
        })
        .catch(() => onbellek || caches.match('index.html'));
      return onbellek || ag;
    })
  );
});
