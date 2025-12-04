// CSS imports
import '../styles/styles.css';

import App from './pages/app';
import { registerServiceWorker } from './utils/sw-register';
import pushNotification from './utils/push-notification-helper';
import dbHelper from './utils/indexeddb-helper';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize App
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  // Initialize Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await registerServiceWorker();
      
      if (registration) {
        console.log('Service Worker registered successfully');
        
        // Initialize Push Notifications
        await pushNotification.initialize(registration);
        
        // Store registration globally for access from other modules
        window.swRegistration = registration;
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // Initialize IndexedDB
  try {
    await dbHelper.openDB();
    console.log('IndexedDB initialized successfully');
  } catch (error) {
    console.error('IndexedDB initialization failed:', error);
  }

  // Handle install prompt
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('Install prompt triggered');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install button if exists
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      
      installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response to install prompt: ${outcome}`);
          deferredPrompt = null;
          installButton.style.display = 'none';
        }
      });
    }
  });

  // Handle app installed
  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredPrompt = null;
  });

  // Check online/offline status
  window.addEventListener('online', () => {
    console.log('App is online');
    showConnectionStatus('online');
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
    showConnectionStatus('offline');
  });

  // Listen for sync status
  window.addEventListener('sync-status', (event) => {
    console.log('Sync status:', event.detail);
    showSyncStatus(event.detail);
  });
});

function showConnectionStatus(status) {
  const existingToast = document.getElementById('connection-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'connection-toast';
  toast.className = `connection-toast ${status}`;
  toast.innerHTML = status === 'online' 
    ? '🟢 You are back online!' 
    : '🔴 You are offline. Some features may be limited.';
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showSyncStatus(detail) {
  const existingToast = document.getElementById('sync-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'sync-toast';
  toast.className = `sync-toast ${detail.success ? 'success' : 'error'}`;
  toast.innerHTML = detail.success 
    ? '✅ ' + detail.message
    : '❌ ' + detail.message;
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}