import CONFIG from '../config';

class StoryAPI {
  static async register({ name, email, password }) {
    const response = await fetch(`${CONFIG.BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to register');
    }

    return data;
  }

  static async login({ email, password }) {
    const response = await fetch(`${CONFIG.BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to login');
    }

    return data;
  }

  static async getAllStories({ page = 1, size = 20, location = 1 } = {}) {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = new URL(`${CONFIG.BASE_URL}/stories`);
    url.searchParams.append('page', page);
    url.searchParams.append('size', size);
    url.searchParams.append('location', location);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch stories');
    }

    return data;
  }

  static async getStoryDetail(id) {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${CONFIG.BASE_URL}/stories/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch story detail');
    }

    return data;
  }

  static async createStory({ description, photo, lat, lon }) {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);
    
    if (lat !== undefined && lat !== null) {
      formData.append('lat', lat);
    }
    
    if (lon !== undefined && lon !== null) {
      formData.append('lon', lon);
    }

    const response = await fetch(`${CONFIG.BASE_URL}/stories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create story');
    }

    return data;
  }

  static async createGuestStory({ description, photo, lat, lon }) {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);
    
    if (lat !== undefined && lat !== null) {
      formData.append('lat', lat);
    }
    
    if (lon !== undefined && lon !== null) {
      formData.append('lon', lon);
    }

    const response = await fetch(`${CONFIG.BASE_URL}/stories/guest`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create story');
    }

    return data;
  }
}

export default StoryAPI;