const CACHE_NAME = 'dicoding-story-v1';
const DATA_CACHE_NAME = 'dicoding-story-data-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/app.bundle.js',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/favicon.png',
];

// Install Event - Cache App Shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch Event - Network First with Cache Fallback for API, Cache First for Assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests - Network First with Cache Fallback
  if (url.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((networkResponse) => {
            // Only cache GET requests
            if (request.method === 'GET') {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // If network fails, try to get from cache
            return cache.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If no cache, return offline page or error
              return new Response(
                JSON.stringify({
                  error: true,
                  message: 'You are offline. Please check your connection.',
                  listStory: []
                }),
                {
                  headers: { 'Content-Type': 'application/json' },
                  status: 503
                }
              );
            });
          });
      })
    );
    return;
  }

  // Handle asset requests - Cache First with Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Cache the new request for future use
        if (request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      });
    })
  );
});

// Push Notification Event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received', event);

  let notificationData = {
    title: 'Dicoding Story',
    options: {
      body: 'You have a new notification',
      icon: '/images/icon-192x192.png',
      badge: '/images/icon-72x72.png',
      data: {
        url: '/'
      }
    }
  };

  // Parse notification data from push event
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Service Worker] Push data:', payload);
      
      notificationData = {
        title: payload.title || 'Dicoding Story',
        options: {
          body: payload.options?.body || payload.body || 'New story available!',
          icon: payload.options?.icon || '/images/icon-192x192.png',
          badge: '/images/icon-72x72.png',
          tag: 'dicoding-story-notification',
          requireInteraction: false,
          actions: [
            {
              action: 'view',
              title: 'View Story',
              icon: '/images/icon-96x96.png'
            },
            {
              action: 'close',
              title: 'Close',
              icon: '/images/icon-96x96.png'
            }
          ],
          data: {
            url: payload.data?.url || '/',
            storyId: payload.data?.storyId || null
          }
        }
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData.options)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const action = event.action;

  if (action === 'close') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background Sync Event for offline data
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync', event.tag);

  if (event.tag === 'sync-stories') {
    event.waitUntil(syncOfflineStories());
  }
});

async function syncOfflineStories() {
  console.log('[Service Worker] Syncing offline stories...');
  
  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending-stories', 'readonly');
    const store = tx.objectStore('pending-stories');
    const pendingStories = await store.getAll();

    console.log('[Service Worker] Found pending stories:', pendingStories.length);

    // Sync each pending story
    for (const story of pendingStories) {
      try {
        const formData = new FormData();
        formData.append('description', story.description);
        formData.append('photo', story.photo);
        if (story.lat) formData.append('lat', story.lat);
        if (story.lon) formData.append('lon', story.lon);

        const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${story.token}`
          },
          body: formData
        });

        if (response.ok) {
          // Remove from pending if successful
          const deleteTx = db.transaction('pending-stories', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending-stories');
          await deleteStore.delete(story.id);
          console.log('[Service Worker] Story synced successfully:', story.id);
        }
      } catch (error) {
        console.error('[Service Worker] Error syncing story:', error);
      }
    }

    // Notify all clients that sync is complete
    const allClients = await clients.matchAll();
    allClients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: true
      });
    });
  } catch (error) {
    console.error('[Service Worker] Error in background sync:', error);
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
        db.createObjectStore('pending-stories', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('favorite-stories')) {
        db.createObjectStore('favorite-stories', { keyPath: 'id' });
      }
    };
  });
}