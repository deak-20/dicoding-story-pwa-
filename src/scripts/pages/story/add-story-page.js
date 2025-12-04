import StoryAPI from '../../data/story-api';
import AuthHelper from '../../utils/auth-helper';
import dbHelper from '../../utils/indexeddb-helper';
import { requestBackgroundSync } from '../../utils/sw-register';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createLocationMarker } from '../../utils/custom-marker';

export default class AddStoryPage {
  constructor() {
    this._map = null;
    this._marker = null;
    this._selectedLocation = null;
    this._mediaStream = null;
    this._capturedBlob = null;
  }

  async render() {
    if (!AuthHelper.checkAuth()) {
      return '';
    }

    return `
      <section class="add-story-container container">
        <div class="add-story-header">
          <h1>Share Your Story</h1>
          <p>Tell the Dicoding community about your experience</p>
        </div>

        <div class="add-story-content">
          <form id="add-story-form" class="add-story-form">
            <div class="form-group">
              <label for="story-description">Story Description</label>
              <textarea 
                id="story-description" 
                name="description" 
                required
                minlength="10"
                rows="5"
                placeholder="Share your story here... (minimum 10 characters)"
                aria-required="true"
              ></textarea>
              <small class="form-hint" id="char-count">0 / 10 characters</small>
            </div>

            <div class="form-group">
              <label>Photo</label>
              <div class="photo-input-group">
                <div class="photo-tabs">
                  <button type="button" class="photo-tab active" data-tab="upload">
                    📁 Upload File
                  </button>
                  <button type="button" class="photo-tab" data-tab="camera">
                    📷 Take Photo
                  </button>
                </div>

                <div class="photo-tab-content active" id="upload-tab">
                  <div class="file-input-wrapper">
                    <input 
                      type="file" 
                      id="story-photo" 
                      name="photo" 
                      accept="image/*"
                      aria-label="Upload photo"
                    />
                    <label for="story-photo" class="file-input-label">
                      <span class="file-icon">📷</span>
                      <span class="file-text">Choose a photo (Max 1MB)</span>
                    </label>
                  </div>
                  <div id="upload-preview" class="photo-preview"></div>
                </div>

                <div class="photo-tab-content" id="camera-tab">
                  <div class="camera-container">
                    <video id="camera-video" autoplay playsinline></video>
                    <canvas id="camera-canvas" style="display: none;"></canvas>
                    <div class="camera-controls">
                      <button type="button" id="start-camera" class="btn btn-primary">
                        Start Camera
                      </button>
                      <button type="button" id="capture-photo" class="btn btn-secondary" style="display: none;">
                        📷 Capture
                      </button>
                      <button type="button" id="stop-camera" class="btn btn-danger" style="display: none;">
                        Stop Camera
                      </button>
                    </div>
                  </div>
                  <div id="camera-preview" class="photo-preview"></div>
                </div>
              </div>
              <small class="form-hint">Image must be in JPG, JPEG, or PNG format and less than 1MB</small>
            </div>

            <div class="form-group">
              <label>Location (Optional)</label>
              <p class="form-hint">Click on the map to select your story's location</p>
              <div id="location-map" class="location-map"></div>
              <div id="selected-location" class="selected-location"></div>
            </div>

            <div id="form-error" class="error-message" role="alert" aria-live="polite"></div>
            <div id="form-success" class="success-message" role="alert" aria-live="polite"></div>

            <div class="form-actions">
              <button type="button" id="cancel-button" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" id="submit-button">
                Share Story
              </button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this._initializeMap();
    this._setupEventListeners();
  }

  _initializeMap() {
    this._map = L.map('location-map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this._map);

    this._map.on('click', (e) => {
      this._selectLocation(e.latlng);
    });
  }

  _selectLocation(latlng) {
    if (this._marker) {
      this._marker.remove();
    }

    this._marker = L.marker(latlng, {
      icon: createLocationMarker()
    }).addTo(this._map);
    
    this._selectedLocation = latlng;

    const locationDiv = document.getElementById('selected-location');
    locationDiv.innerHTML = `
      <div class="location-info">
        <strong>Selected Location:</strong>
        <p>Latitude: ${latlng.lat.toFixed(6)}, Longitude: ${latlng.lng.toFixed(6)}</p>
        <button type="button" id="clear-location" class="btn btn-small">Clear Location</button>
      </div>
    `;

    document.getElementById('clear-location')?.addEventListener('click', () => {
      this._clearLocation();
    });
  }

  _clearLocation() {
    if (this._marker) {
      this._marker.remove();
      this._marker = null;
    }
    this._selectedLocation = null;
    document.getElementById('selected-location').innerHTML = '';
  }

  _setupEventListeners() {
    const form = document.getElementById('add-story-form');
    const descriptionArea = document.getElementById('story-description');
    const charCount = document.getElementById('char-count');
    const photoInput = document.getElementById('story-photo');
    const cancelButton = document.getElementById('cancel-button');
    const submitButton = document.getElementById('submit-button');
    const errorDiv = document.getElementById('form-error');
    const successDiv = document.getElementById('form-success');

    // Photo tabs
    const photoTabs = document.querySelectorAll('.photo-tab');
    photoTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this._switchPhotoTab(tabName);
      });
    });

    // Camera controls
    document.getElementById('start-camera')?.addEventListener('click', () => this._startCamera());
    document.getElementById('capture-photo')?.addEventListener('click', () => this._capturePhoto());
    document.getElementById('stop-camera')?.addEventListener('click', () => this._stopCamera());

    // Character count
    descriptionArea?.addEventListener('input', (e) => {
      const length = e.target.value.length;
      charCount.textContent = `${length} / 10 characters`;
      charCount.style.color = length >= 10 ? 'green' : 'red';
    });

    // Photo preview
    photoInput?.addEventListener('change', (e) => {
      this._previewUploadedPhoto(e.target.files[0]);
    });

    // Cancel button
    cancelButton?.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel? Your changes will be lost.')) {
        this._cleanup();
        window.location.hash = '#/';
      }
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleSubmit(form, submitButton, errorDiv, successDiv);
    });
  }

  _switchPhotoTab(tabName) {
    const tabs = document.querySelectorAll('.photo-tab');
    const contents = document.querySelectorAll('.photo-tab-content');

    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    contents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Clear the other input
    if (tabName === 'upload') {
      this._capturedBlob = null;
      document.getElementById('camera-preview').innerHTML = '';
    } else {
      document.getElementById('story-photo').value = '';
      document.getElementById('upload-preview').innerHTML = '';
    }
  }

  async _startCamera() {
    try {
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      const video = document.getElementById('camera-video');
      video.srcObject = this._mediaStream;
      video.style.display = 'block';

      document.getElementById('start-camera').style.display = 'none';
      document.getElementById('capture-photo').style.display = 'inline-block';
      document.getElementById('stop-camera').style.display = 'inline-block';
    } catch (error) {
      alert('Failed to access camera: ' + error.message);
    }
  }

  _capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      this._capturedBlob = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
      
      const previewDiv = document.getElementById('camera-preview');
      previewDiv.innerHTML = `
        <img src="${URL.createObjectURL(blob)}" alt="Captured photo" />
        <button type="button" id="retake-photo" class="btn btn-small">Retake</button>
      `;

      document.getElementById('retake-photo')?.addEventListener('click', () => {
        this._capturedBlob = null;
        previewDiv.innerHTML = '';
      });

      this._stopCamera();
    }, 'image/jpeg', 0.9);
  }

  _stopCamera() {
    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach(track => track.stop());
      this._mediaStream = null;
    }

    const video = document.getElementById('camera-video');
    video.srcObject = null;
    video.style.display = 'none';

    document.getElementById('start-camera').style.display = 'inline-block';
    document.getElementById('capture-photo').style.display = 'none';
    document.getElementById('stop-camera').style.display = 'none';
  }

  _previewUploadedPhoto(file) {
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('File size exceeds 1MB. Please choose a smaller file.');
      document.getElementById('story-photo').value = '';
      return;
    }

    const previewDiv = document.getElementById('upload-preview');
    const reader = new FileReader();

    reader.onload = (e) => {
      previewDiv.innerHTML = `
        <img src="${e.target.result}" alt="Photo preview" />
      `;
    };

    reader.readAsDataURL(file);
  }

  async _handleSubmit(form, submitButton, errorDiv, successDiv) {
    errorDiv.textContent = '';
    successDiv.textContent = '';

    const formData = new FormData(form);
    const description = formData.get('description');
    
    // Get photo from either upload or camera
    let photo = formData.get('photo');
    if (!photo || photo.size === 0) {
      photo = this._capturedBlob;
    }

    // Validation
    if (!description || description.trim().length < 10) {
      errorDiv.textContent = 'Description must be at least 10 characters long.';
      return;
    }

    if (!photo) {
      errorDiv.textContent = 'Please select or capture a photo.';
      return;
    }

    if (photo.size > 1024 * 1024) {
      errorDiv.textContent = 'Photo size must not exceed 1MB.';
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Sharing...';

    const storyData = {
      description: description.trim(),
      photo: photo,
    };

    if (this._selectedLocation) {
      storyData.lat = this._selectedLocation.lat;
      storyData.lon = this._selectedLocation.lng;
    }

    // Check if online
    if (!navigator.onLine) {
      try {
        // Save to IndexedDB for background sync
        const token = AuthHelper.getToken();
        await dbHelper.addPendingStory({
          ...storyData,
          token
        });

        // Request background sync
        await requestBackgroundSync('sync-stories');

        successDiv.textContent = 'You are offline. Story will be synced when online!';
        
        setTimeout(() => {
          this._cleanup();
          window.location.hash = '#/';
        }, 3000);
      } catch (error) {
        errorDiv.textContent = 'Failed to save story for offline sync. Please try again.';
        submitButton.disabled = false;
        submitButton.textContent = 'Share Story';
      }
      return;
    }

    // Try to post online
    try {
      await StoryAPI.createStory(storyData);

      successDiv.textContent = 'Story shared successfully! Redirecting...';
      
      this._cleanup();
      
      setTimeout(() => {
        window.location.hash = '#/';
      }, 2000);
    } catch (error) {
      // If online but failed, save for background sync
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        try {
          const token = AuthHelper.getToken();
          await dbHelper.addPendingStory({
            ...storyData,
            token
          });

          await requestBackgroundSync('sync-stories');

          successDiv.textContent = 'Network error. Story will be synced later!';
          
          setTimeout(() => {
            this._cleanup();
            window.location.hash = '#/';
          }, 3000);
        } catch (dbError) {
          errorDiv.textContent = 'Failed to save story. Please try again.';
          submitButton.disabled = false;
          submitButton.textContent = 'Share Story';
        }
      } else {
        errorDiv.textContent = error.message || 'Failed to share story. Please try again.';
        submitButton.disabled = false;
        submitButton.textContent = 'Share Story';
      }
    }
  }

  _cleanup() {
    if (this._mediaStream) {
      this._stopCamera();
    }
    if (this._map) {
      this._map.remove();
    }
  }
}