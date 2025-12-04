const DB_NAME = 'dicoding-story-db';
const DB_VERSION = 1;

class IndexedDBHelper {
  constructor() {
    this.db = null;
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('favorite-stories')) {
          const favoriteStore = db.createObjectStore('favorite-stories', { keyPath: 'id' });
          favoriteStore.createIndex('createdAt', 'createdAt', { unique: false });
          favoriteStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('pending-stories')) {
          db.createObjectStore('pending-stories', { 
            keyPath: 'id',
            autoIncrement: true 
          });
        }

        console.log('IndexedDB upgraded to version', DB_VERSION);
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.openDB();
    }
    return this.db;
  }

  // ===== FAVORITE STORIES =====
  
  async addFavorite(story) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorite-stories'], 'readwrite');
      const store = transaction.objectStore('favorite-stories');
      
      const favoriteStory = {
        ...story,
        favoritedAt: new Date().toISOString()
      };
      
      const request = store.add(favoriteStory);

      request.onsuccess = () => {
        console.log('Story added to favorites:', story.id);
        resolve(favoriteStory);
      };

      request.onerror = () => {
        reject(new Error('Failed to add story to favorites'));
      };
    });
  }

  async removeFavorite(storyId) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorite-stories'], 'readwrite');
      const store = transaction.objectStore('favorite-stories');
      const request = store.delete(storyId);

      request.onsuccess = () => {
        console.log('Story removed from favorites:', storyId);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to remove story from favorites'));
      };
    });
  }

  async getAllFavorites() {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorite-stories'], 'readonly');
      const store = transaction.objectStore('favorite-stories');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get favorites'));
      };
    });
  }

  async isFavorite(storyId) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorite-stories'], 'readonly');
      const store = transaction.objectStore('favorite-stories');
      const request = store.get(storyId);

      request.onsuccess = () => {
        resolve(!!request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to check favorite status'));
      };
    });
  }

  async searchFavorites(query) {
    const favorites = await this.getAllFavorites();
    const lowercaseQuery = query.toLowerCase();

    return favorites.filter(story => {
      return (
        story.name.toLowerCase().includes(lowercaseQuery) ||
        story.description.toLowerCase().includes(lowercaseQuery)
      );
    });
  }

  async sortFavorites(sortBy = 'newest') {
    const favorites = await this.getAllFavorites();

    switch (sortBy) {
      case 'newest':
        return favorites.sort((a, b) => 
          new Date(b.favoritedAt) - new Date(a.favoritedAt)
        );
      case 'oldest':
        return favorites.sort((a, b) => 
          new Date(a.favoritedAt) - new Date(b.favoritedAt)
        );
      case 'name-asc':
        return favorites.sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      case 'name-desc':
        return favorites.sort((a, b) => 
          b.name.localeCompare(a.name)
        );
      default:
        return favorites;
    }
  }

  async clearAllFavorites() {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorite-stories'], 'readwrite');
      const store = transaction.objectStore('favorite-stories');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All favorites cleared');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear favorites'));
      };
    });
  }

  // ===== PENDING STORIES (for offline sync) =====
  
  async addPendingStory(storyData) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-stories'], 'readwrite');
      const store = transaction.objectStore('pending-stories');
      
      const pendingStory = {
        ...storyData,
        createdAt: new Date().toISOString(),
        synced: false
      };
      
      const request = store.add(pendingStory);

      request.onsuccess = () => {
        console.log('Story added to pending queue');
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to add pending story'));
      };
    });
  }

  async getAllPendingStories() {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-stories'], 'readonly');
      const store = transaction.objectStore('pending-stories');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get pending stories'));
      };
    });
  }

  async removePendingStory(storyId) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-stories'], 'readwrite');
      const store = transaction.objectStore('pending-stories');
      const request = store.delete(storyId);

      request.onsuccess = () => {
        console.log('Pending story removed:', storyId);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to remove pending story'));
      };
    });
  }

  async clearAllPendingStories() {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-stories'], 'readwrite');
      const store = transaction.objectStore('pending-stories');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All pending stories cleared');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear pending stories'));
      };
    });
  }
}

// Export singleton instance
const dbHelper = new IndexedDBHelper();
export default dbHelper;