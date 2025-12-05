import AuthHelper from '../../utils/auth-helper';
import dbHelper from '../../utils/indexeddb-helper';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createStoryMarker } from '../../utils/custom-marker';

export default class FavoritesPage {
  constructor() {
    this._favorites = [];
    this._filteredFavorites = [];
    this._map = null;
    this._markers = {};
    this._currentSort = 'newest';
    this._searchQuery = '';
  }

  async render() {
    if (!AuthHelper.checkAuth()) {
      return '';
    }

    return `
      <section class="favorites-container container">
        <div class="favorites-header">
          <h1>My Favorite Stories</h1>
          <p>Stories you've saved for later</p>
        </div>

        <div class="favorites-controls">
          <div class="search-box">
          <label for="search-favorites">Search:</label>
          <input
              type="search" 
              id="search-favorites" 
              placeholder="Search favorites..." 
              aria-label="Search favorites"
            />
          </div>

          <div class="sort-box">
            <label for="sort-favorites">Sort by:</label>
            <select id="sort-favorites" aria-label="Sort favorites">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>

          <button id="clear-favorites" class="btn btn-danger">
            Clear All
          </button>
        </div>

        <div id="favorites-loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading favorites...</p>
        </div>

        <div id="favorites-empty" class="empty-state" style="display: none;">
          <div class="empty-icon">💔</div>
          <h2>No favorites yet</h2>
          <p>Start adding stories to your favorites from the home page!</p>
          <a href="#/" class="btn btn-primary">Browse Stories</a>
        </div>

        <div id="favorites-content" class="favorites-content" style="display: none;">
          <div class="favorites-grid" id="favorites-list"></div>
          
          <div class="favorites-map-section">
            <h2>Favorites Map</h2>
            <div id="favorites-map" class="story-map"></div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this._loadFavorites();
    this._setupEventListeners();
  }

  async _loadFavorites() {
    const loadingDiv = document.getElementById('favorites-loading');
    const emptyDiv = document.getElementById('favorites-empty');
    const contentDiv = document.getElementById('favorites-content');

    try {
      this._favorites = await dbHelper.getAllFavorites();
      this._filteredFavorites = [...this._favorites];

      loadingDiv.style.display = 'none';

      if (this._favorites.length === 0) {
        emptyDiv.style.display = 'block';
        contentDiv.style.display = 'none';
      } else {
        emptyDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        
        this._initializeMap();
        this._renderFavorites();
        this._renderMarkers();
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      loadingDiv.style.display = 'none';
      emptyDiv.querySelector('h2').textContent = 'Error loading favorites';
      emptyDiv.querySelector('p').textContent = 'Please try refreshing the page.';
      emptyDiv.style.display = 'block';
    }
  }

  _initializeMap() {
    this._map = L.map('favorites-map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this._map);
  }

  _setupEventListeners() {
    const searchInput = document.getElementById('search-favorites');
    const sortSelect = document.getElementById('sort-favorites');
    const clearButton = document.getElementById('clear-favorites');

    // Search
    searchInput?.addEventListener('input', (e) => {
      this._searchQuery = e.target.value;
      this._applyFilters();
    });

    // Sort
    sortSelect?.addEventListener('change', (e) => {
      this._currentSort = e.target.value;
      this._applyFilters();
    });

    // Clear all
    clearButton?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to remove all favorites?')) {
        await this._clearAllFavorites();
      }
    });
  }

  async _applyFilters() {
    // Search
    if (this._searchQuery.trim()) {
      this._filteredFavorites = await dbHelper.searchFavorites(this._searchQuery);
    } else {
      this._filteredFavorites = [...this._favorites];
    }

    // Sort
    this._filteredFavorites = await this._sortFavorites(this._filteredFavorites);

    // Re-render
    this._renderFavorites();
    this._renderMarkers();
  }

  async _sortFavorites(favorites) {
    switch (this._currentSort) {
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

  _renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');

    if (this._filteredFavorites.length === 0) {
      favoritesList.innerHTML = '<p class="empty-state">No favorites found matching your search.</p>';
      return;
    }

    favoritesList.innerHTML = this._filteredFavorites.map((story) => `
      <article class="story-card">
        <img 
          src="${story.photoUrl}" 
          alt="${story.description}"
          class="story-image"
          loading="lazy"
        />
        <div class="story-content">
          <h3 class="story-author">${story.name}</h3>
          <p class="story-description">${story.description}</p>
          <div class="story-meta">
            <time datetime="${story.favoritedAt}">
              Saved: ${new Date(story.favoritedAt).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </time>
            ${story.lat && story.lon ? `
              <button class="story-location-btn" data-lat="${story.lat}" data-lon="${story.lon}">
                📍 View on Map
              </button>
            ` : ''}
          </div>
          <button class="btn btn-danger btn-small remove-favorite-btn" data-story-id="${story.id}">
            Remove from Favorites
          </button>
        </div>
      </article>
    `).join('');

    // Add event listeners
    favoritesList.querySelectorAll('.remove-favorite-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const storyId = e.target.dataset.storyId;
        await this._removeFavorite(storyId);
      });
    });

    favoritesList.querySelectorAll('.story-location-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lat = parseFloat(e.target.dataset.lat);
        const lon = parseFloat(e.target.dataset.lon);
        
        this._map.setView([lat, lon], 13);
      });
    });
  }

  _renderMarkers() {
    // Clear existing markers
    Object.values(this._markers).forEach(marker => marker.remove());
    this._markers = {};

    const storiesWithLocation = this._filteredFavorites.filter(story => story.lat && story.lon);

    storiesWithLocation.forEach(story => {
      const marker = L.marker([story.lat, story.lon], {
        icon: createStoryMarker()
      })
        .addTo(this._map)
        .bindPopup(`
          <div class="marker-popup">
            <img src="${story.photoUrl}" alt="${story.description}" />
            <h4>${story.name}</h4>
            <p>${story.description}</p>
          </div>
        `);

      this._markers[story.id] = marker;
    });

    // Fit map to show all markers
    if (storiesWithLocation.length > 0) {
      const group = L.featureGroup(Object.values(this._markers));
      this._map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  async _removeFavorite(storyId) {
    try {
      await dbHelper.removeFavorite(storyId);
      
      // Reload favorites
      await this._loadFavorites();
      
      // Show success message
      this._showMessage('Story removed from favorites', 'success');
    } catch (error) {
      console.error('Error removing favorite:', error);
      this._showMessage('Failed to remove favorite', 'error');
    }
  }

  async _clearAllFavorites() {
    try {
      await dbHelper.clearAllFavorites();
      
      // Reload page
      await this._loadFavorites();
      
      this._showMessage('All favorites cleared', 'success');
    } catch (error) {
      console.error('Error clearing favorites:', error);
      this._showMessage('Failed to clear favorites', 'error');
    }
  }

  _showMessage(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}