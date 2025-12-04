const SW_PATH = '/sw.js';

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/'
    });

    console.log('Service Worker registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('Service Worker update found');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('New Service Worker available');
          
          // Show update notification to user
          if (confirm('New version available! Reload to update?')) {
            window.location.reload();
          }
        }
      });
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Message from Service Worker:', event.data);
      
      if (event.data.type === 'SYNC_COMPLETE') {
        // Notify user that sync is complete
        showSyncNotification(event.data.success);
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

const unregisterServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      const success = await registration.unregister();
      console.log('Service Worker unregistered:', success);
      return success;
    }
    
    return false;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
};

const requestBackgroundSync = async (tag) => {
  if (!('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype)) {
    console.warn('Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    console.log('Background sync registered:', tag);
    return true;
  } catch (error) {
    console.error('Background sync registration failed:', error);
    return false;
  }
};

function showSyncNotification(success) {
  const message = success 
    ? 'Your offline stories have been synced successfully!' 
    : 'Failed to sync offline stories. Will retry later.';
  
  // You can implement custom notification UI here
  console.log(message);
  
  // Dispatch custom event for UI to handle
  window.dispatchEvent(new CustomEvent('sync-status', {
    detail: { success, message }
  }));
}

export {
  registerServiceWorker,
  unregisterServiceWorker,
  requestBackgroundSync
};