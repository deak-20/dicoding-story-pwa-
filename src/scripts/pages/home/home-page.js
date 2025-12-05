import StoryAPI from '../../data/story-api';
import AuthHelper from '../../utils/auth-helper';
import dbHelper from '../../utils/indexeddb-helper';
import pushNotification from '../../utils/push-notification-helper';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createStoryMarker, createActiveMarker } from '../../utils/custom-marker';

export default class HomePage {
  constructor() {
    this._stories = [];
    this._map = null;
    this._markers = {};
    this._activeMarkerId = null;
  }

  async render() {
    if (!AuthHelper.checkAuth()) {
      return '';
    }

    const user = AuthHelper.getUser();

    return `
      <section class="home-container">
        <div class="home-header container">
          <div class="home-header-content">
            <h1>Welcome, ${user?.name || 'User'}!</h1>
            <p>Explore stories from Dicoding community</p>
          </div>
          <div class="home-header-actions">
            <a href="#/add-story" class="btn btn-primary">
              <span>📝</span> Add New Story
            </a>
            <a href="#/favorites" class="btn btn-secondary">
              <span>💖</span> Favorites
            </a>
            <button id="notification-toggle" class="btn btn-secondary">
              <span>🔔</span> <span id="notification-status">Enable</span>
            </button>
            <button id="logout-button" class="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>

        <div class="home-content container">
          <div class="stories-section">
            <div class="stories-header">
              <h2>Recent Stories</h2>
              <div class="stories-filter">
                <label for="location-filter">Filter:</label>
                <select id="location-filter">
                  <option value="all">All Stories</option>
                  <option value="with-location" selected>With Location Only</option>
                </select>
              </div>
            </div>

            <div id="stories-loading" class="loading-state">
              <div class="spinner"></div>
              <p>Loading stories...</p>
            </div>

            <div id="stories-error" class="error-state" style="display: none;">
              <p>Failed to load stories. Please try again.</p>
              <button id="retry-button" class="btn btn-primary">Retry</button>
            </div>

            <div class="stories-grid" id="stories-list"></div>
          </div>

          <div class="map-section">
            <h2>Stories Map</h2>
            <div class="map-controls">
              <button id="reset-view" class="btn btn-small">Reset View</button>
            </div>
            <div id="map" class="story-map"></div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this._initializeMap();
    this._setupEventListeners();
    await this._loadStories();
  }

  _initializeMap() {
    this._map = L.map('map').setView([-2.5489, 118.0149], 5);

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© Esri',
        maxZoom: 19,
      }
    );

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap contributors',
      maxZoom: 17,
    });

    streetLayer.addTo(this._map);

    const baseMaps = {
      'Street Map': streetLayer,
      Satellite: satelliteLayer,
      Topographic: topoLayer,
    };

    L.control.layers(baseMaps).addTo(this._map);
  }

  _setupEventListeners() {
    const logoutButton = document.getElementById('logout-button');
    const filterSelect = document.getElementById('location-filter');
    const resetViewButton = document.getElementById('reset-view');
    const retryButton = document.getElementById('retry-button');
    const notificationToggle = document.getElementById('notification-toggle');

    logoutButton?.addEventListener('click', () => {
      AuthHelper.clearAuth();
      window.location.hash = '#/login';
    });

    filterSelect?.addEventListener('change', () => {
      this._loadStories();
    });

    resetViewButton?.addEventListener('click', () => {
      this._map.setView([-2.5489, 118.0149], 5);
    });

    retryButton?.addEventListener('click', () => {
      this._loadStories();
    });

    notificationToggle?.addEventListener('click', async () => {
      await this._toggleNotifications();
    });

    // Initialize notification button state
    this._updateNotificationButton();
  }

  async _loadStories() {
    const loadingDiv = document.getElementById('stories-loading');
    const errorDiv = document.getElementById('stories-error');
    const storiesList = document.getElementById('stories-list');
    const filterSelect = document.getElementById('location-filter');

    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    storiesList.innerHTML = '';

    // Clear existing markers
    Object.values(this._markers).forEach((marker) => marker.remove());
    this._markers = {};

    try {
      const locationFilter = filterSelect?.value === 'with-location' ? 1 : 0;

      console.log('Fetching stories with location filter:', locationFilter);

      const result = await StoryAPI.getAllStories({ location: locationFilter, size: 50 });

      console.log('Stories fetched:', result);

      this._stories = result.listStory || [];
      this._renderStories();
      this._renderMarkers();

      loadingDiv.style.display = 'none';
    } catch (error) {
      console.error('Error loading stories:', error);

      errorDiv.innerHTML = `
        <p>Failed to load stories.</p>
        <p style="color: #666; font-size: 0.875rem;">Error: ${error.message}</p>
        <button id="retry-button" class="btn btn-primary">Retry</button>
      `;
      errorDiv.style.display = 'block';
      loadingDiv.style.display = 'none';

      document.getElementById('retry-button')?.addEventListener('click', () => {
        this._loadStories();
      });
    }
  }

  _renderStories() {
    const storiesList = document.getElementById('stories-list');

    if (this._stories.length === 0) {
      storiesList.innerHTML = '<p class="empty-state">No stories found. Be the first to share!</p>';
      return;
    }

    storiesList.innerHTML = this._stories
      .map(
        (story) => `
      <article class="story-card" data-story-id="${story.id}">
        <img
          src="${story.photoUrl}"
          alt="${story.description}"
          class="story-image"
          loading="lazy"
        />
        <div class="story-content">
          <div class="story-header">
            <h3 class="story-author">${story.name}</h3>
            <button class="favorite-btn" data-story-id="${story.id}" aria-label="Add to favorites">
              <span class="favorite-icon">🤍</span>
            </button>
          </div>
          <p class="story-description">${story.description}</p>
          <div class="story-meta">
            <time datetime="${story.createdAt}">
              ${new Date(story.createdAt).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            ${
              story.lat && story.lon
                ? `
            <button class="story-location-btn" data-lat="${story.lat}" data-lon="${story.lon}" data-story-id="${story.id}">
              📍 View on Map
            </button>`
                : ''
            }
          </div>
        </div>
      </article>
    `
      )
      .join('');

    // Update favorite button states
    this._updateFavoriteButtons().catch((err) => {
      console.error('Error updating favorite buttons:', err);
    });

    // Add event listeners for location buttons
    storiesList.querySelectorAll('.story-location-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const lat = parseFloat(e.target.dataset.lat);
        const lon = parseFloat(e.target.dataset.lon);
        const storyId = e.target.dataset.storyId;

        this._map.setView([lat, lon], 13);
        this._highlightMarker(storyId);
      });
    });

    // Add event listeners for favorite buttons
    storiesList.querySelectorAll('.favorite-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = e.currentTarget.dataset.storyId;
        await this._toggleFavorite(storyId);
      });
    });

    // Add hover effects for story cards
    storiesList.querySelectorAll('.story-card').forEach((card) => {
      card.addEventListener('mouseenter', (e) => {
        const storyId = e.currentTarget.dataset.storyId;
        this._highlightMarker(storyId);
      });

      card.addEventListener('mouseleave', () => {
        this._unhighlightMarkers();
      });
    });
  }

  _renderMarkers() {
    const storiesWithLocation = this._stories.filter((story) => story.lat && story.lon);

    storiesWithLocation.forEach((story) => {
      const marker = L.marker([story.lat, story.lon], {
        icon: createStoryMarker(),
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

      marker.on('click', () => {
        const storyCard = document.querySelector(`[data-story-id="${story.id}"]`);
        if (storyCard) {
          storyCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          storyCard.classList.add('highlight');
          setTimeout(() => storyCard.classList.remove('highlight'), 2000);
        }
      });
    });

    if (storiesWithLocation.length > 0) {
      const group = L.featureGroup(Object.values(this._markers));
      this._map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  _highlightMarker(storyId) {
    this._unhighlightMarkers();

    const marker = this._markers[storyId];
    if (marker) {
      this._activeMarkerId = storyId;
      marker.setIcon(createActiveMarker());
      marker.setZIndexOffset(1000);
      marker.openPopup();
    }
  }

  _unhighlightMarkers() {
    if (this._activeMarkerId) {
      const marker = this._markers[this._activeMarkerId];
      if (marker) {
        marker.setIcon(createStoryMarker());
        marker.setZIndexOffset(0);
      }
      this._activeMarkerId = null;
    }
  }

  async _toggleFavorite(storyId) {
    const story = this._stories.find((s) => s.id === storyId);
    if (!story) return;

    try {
      const isFavorite = await dbHelper.isFavorite(storyId);

      if (isFavorite) {
        await dbHelper.removeFavorite(storyId);
        this._showToast('Removed from favorites', 'info');
      } else {
        await dbHelper.addFavorite(story);
        this._showToast('Added to favorites', 'success');
      }

      // Update button state
      await this._updateFavoriteButtons();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      this._showToast('Failed to update favorites', 'error');
    }
  }

  async _updateFavoriteButtons() {
    const favoriteButtons = document.querySelectorAll('.favorite-btn');

    for (const btn of favoriteButtons) {
      const storyId = btn.dataset.storyId;

      try {
        const isFavorite = await dbHelper.isFavorite(storyId);

        const icon = btn.querySelector('.favorite-icon');
        if (isFavorite) {
          icon.textContent = '❤️';
          btn.classList.add('favorited');
          btn.setAttribute('aria-label', 'Remove from favorites');
        } else {
          icon.textContent = '🤍';
          btn.classList.remove('favorited');
          btn.setAttribute('aria-label', 'Add to favorites');
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
        const icon = btn.querySelector('.favorite-icon');
        icon.textContent = '🤍';
      }
    }
  }

  async _toggleNotifications() {
    if (!window.swRegistration) {
      this._showToast('Service Worker not available', 'error');
      return;
    }

    try {
      const isSubscribed = await pushNotification.checkSubscription();

      if (isSubscribed) {
        const result = await pushNotification.unsubscribe();
        if (result.success) {
          this._showToast('Push notifications disabled', 'info');
          await this._updateNotificationButton();
        }
      } else {
        const result = await pushNotification.subscribe();
        if (result.success) {
          this._showToast('Push notifications enabled', 'success');
          await this._updateNotificationButton();
        } else {
          this._showToast(result.error || 'Failed to enable notifications', 'error');
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      this._showToast('Failed to toggle notifications', 'error');
    }
  }

  async _updateNotificationButton() {
    if (!window.swRegistration) return;

    const notificationToggle = document.getElementById('notification-toggle');
    const notificationStatus = document.getElementById('notification-status');

    if (!notificationToggle || !notificationStatus) return;

    try {
      const isSubscribed = await pushNotification.checkSubscription();

      if (isSubscribed) {
        notificationStatus.textContent = 'Enabled';
        notificationToggle.classList.add('notification-enabled');
      } else {
        notificationStatus.textContent = 'Enable';
        notificationToggle.classList.remove('notification-enabled');
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  }

  _showToast(message, type = 'info') {
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