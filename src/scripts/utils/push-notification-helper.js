import CONFIG from '../config';

const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

class PushNotificationHelper {
  constructor() {
    this.isSubscribed = false;
    this.swRegistration = null;
  }

  // Convert VAPID key from base64 to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Initialize push notifications
  async initialize(registration) {
    this.swRegistration = registration;
    
    if (!('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('Notifications are not supported');
      return false;
    }

    // Check current subscription status
    await this.checkSubscription();
    
    return true;
  }

  // Check if user is currently subscribed
  async checkSubscription() {
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = subscription !== null;
      
      console.log('Push subscription status:', this.isSubscribed);
      
      return this.isSubscribed;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribe() {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Subscribe to push
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('Push subscription:', subscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      this.isSubscribed = true;
      
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        this.isSubscribed = false;
        return { success: true };
      }

      // Unsubscribe from push
      await subscription.unsubscribe();

      // Remove subscription from server
      await this.removeSubscriptionFromServer(subscription);

      this.isSubscribed = false;

      console.log('Unsubscribed from push notifications');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    
    if (!token) {
      throw new Error('No authentication token');
    }

    const subscriptionObject = JSON.parse(JSON.stringify(subscription));

    const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscriptionObject.endpoint,
        keys: {
          p256dh: subscriptionObject.keys.p256dh,
          auth: subscriptionObject.keys.auth
        }
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to subscribe to notifications');
    }

    const data = await response.json();
    console.log('Subscription sent to server:', data);
    
    return data;
  }

  // Remove subscription from server
  async removeSubscriptionFromServer(subscription) {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    
    if (!token) {
      console.warn('No authentication token, skipping server removal');
      return;
    }

    const subscriptionObject = JSON.parse(JSON.stringify(subscription));

    try {
      const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: subscriptionObject.endpoint
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Subscription removed from server:', data);
      }
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }

  // Get notification permission status
  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Check if push notifications are supported
  isSupported() {
    return 'PushManager' in window && 'Notification' in window;
  }
}

// Export singleton instance
const pushNotification = new PushNotificationHelper();
export default pushNotification;