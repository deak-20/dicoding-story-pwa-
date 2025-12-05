const CACHE_NAME = 'dicoding-story-v1';
const DATA_CACHE_NAME = 'dicoding-story-data-v1';

// Hanya file yang benar-benar ada!
const urlsToCache = [
  '/',
  '/index.html',
  '/app.bundle.js',
  '/app.css',
  '/images/icon-512x512.png'
];

// Install Event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Caching app shell safely…');
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
          console.log('[SW] Cached:', url);
        } catch (err) {
          console.warn('[SW] Failed to cache:', url, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating…');

  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch Event - FIXED: Clone response before using it
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  // API: Network First
  if (url.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        try {
          const netResponse = await fetch(request);
          // PERBAIKAN: Clone dulu sebelum digunakan
          if (request.method === 'GET' && netResponse.ok) {
            const responseToCache = netResponse.clone();
            cache.put(request, responseToCache);
          }
          return netResponse;
        } catch (_) {
          const cached = await cache.match(request);
          if (cached) return cached;

          return new Response(
            JSON.stringify({
              error: true,
              message: 'Offline & no cached data',
              listStory: []
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      })
    );
    return;
  }

  // Assets: Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // PERBAIKAN: Clone dulu sebelum caching
          if (request.method === 'GET' && response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, responseToCache)
            );
          }
          return response;
        })
        .catch(() => {
          if (request.destination === 'image') {
            return new Response('', { status: 404 });
          }
        });
    })
  );
});

// Push Notification Event - FIXED VERSION
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let payload = {
    title: 'Dicoding Story',
    body: 'New story available!',
    icon: '/images/icon-512x512.png',
    data: { url: '/' }
  };

  // PERBAIKAN: Handle both JSON and plain text
  if (event.data) {
    try {
      // Coba parse sebagai JSON dulu
      const data = event.data.json();
      console.log('[SW] Push data parsed as JSON:', data);
      
      payload.title = data.title || payload.title;
      payload.body = data.body || payload.body;
      payload.icon = data.icon || payload.icon;
      payload.data = data.data || payload.data;
    } catch (err) {
      // Jika gagal parse JSON, gunakan sebagai plain text
      console.log('[SW] Push data is plain text, not JSON');
      
      try {
        const textData = event.data.text();
        console.log('[SW] Push text data:', textData);
        
        // Gunakan text sebagai body notifikasi
        if (textData && textData.trim()) {
          payload.body = textData;
        }
      } catch (textErr) {
        console.error('[SW] Failed to read push data as text:', textErr);
      }
    }
  }

  // PERBAIKAN: Check notification permission dulu
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.icon,
      data: payload.data
    }).catch((error) => {
      console.error('[SW] Failed to show notification:', error);
      // Silently fail jika permission tidak ada
      // Ini normal saat testing di DevTools tanpa permission
    })
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsList) => {
        for (const client of clientsList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncOfflineStories());
  }
});

async function syncOfflineStories() {
  console.log('[SW] Syncing offline stories…');

  try {
    const db = await openDB();
    const tx = db.transaction('pending-stories', 'readonly');
    const store = tx.objectStore('pending-stories');
    const all = store.getAll();

    const pending = await new Promise((resolve) => {
      all.onsuccess = () => resolve(all.result);
    });

    for (const story of pending) {
      try {
        const formData = new FormData();
        formData.append('description', story.description);
        formData.append('photo', story.photo);
        if (story.lat) formData.append('lat', story.lat);
        if (story.lon) formData.append('lon', story.lon);

        const res = await fetch('https://story-api.dicoding.dev/v1/stories', {
          method: 'POST',
          headers: { Authorization: `Bearer ${story.token}` },
          body: formData
        });

        if (res.ok) {
          const dtx = db.transaction('pending-stories', 'readwrite');
          dtx.objectStore('pending-stories').delete(story.id);
        }
      } catch (err) {
        console.error('[SW] Sync story failed:', err);
      }
    }

    const clientsList = await clients.matchAll();
    clientsList.forEach((client) => {
      client.postMessage({ type: 'SYNC_COMPLETE', success: true });
    });
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dicoding-story-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-stories')) {
        db.createObjectStore('pending-stories', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('favorite-stories')) {
        db.createObjectStore('favorite-stories', { keyPath: 'id' });
      }
    };
  });
}