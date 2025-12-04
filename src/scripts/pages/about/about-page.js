export default class AboutPage {
  async render() {
    return `
      <article class="about-container container">
        <section class="about-hero">
          <h1>About Dicoding Story</h1>
          <p class="about-subtitle">Share your Dicoding journey with the community</p>
        </section>

        <section class="about-content">
          <div class="about-section">
            <h2>What is Dicoding Story?</h2>
            <p>
              Dicoding Story is a platform designed for the Dicoding community to share their 
              learning experiences, achievements, and memorable moments. Similar to Instagram 
              but specialized for Dicoding learners, this platform allows you to document and 
              share your coding journey with others.
            </p>
          </div>

          <div class="about-section">
            <h2>Features</h2>
            <ul class="features-list">
              <li>
                <strong>📝 Share Your Stories:</strong> Post photos and descriptions about 
                your Dicoding experience
              </li>
              <li>
                <strong>🗺️ Location Tagging:</strong> Tag your stories with geographical 
                locations and see them on an interactive map
              </li>
              <li>
                <strong>📸 Camera Integration:</strong> Take photos directly from your device 
                or upload from gallery
              </li>
              <li>
                <strong>🔍 Explore Stories:</strong> Browse stories from other learners in 
                the community
              </li>
              <li>
                <strong>🌍 Interactive Map:</strong> Visualize stories from around the world 
                on a beautiful map interface
              </li>
            </ul>
          </div>

          <div class="about-section">
            <h2>How to Use</h2>
            <ol class="steps-list">
              <li>Create an account or sign in to your existing account</li>
              <li>Click "Add New Story" to share your experience</li>
              <li>Write a description and upload or capture a photo</li>
              <li>Optionally, click on the map to tag your location</li>
              <li>Share your story with the community!</li>
            </ol>
          </div>

          <div class="about-section">
            <h2>Technology Stack</h2>
            <p>This application is built using modern web technologies:</p>
            <ul class="tech-list">
              <li>Single-Page Application (SPA) architecture</li>
              <li>Vanilla JavaScript with ES6+ features</li>
              <li>Webpack for module bundling</li>
              <li>Leaflet.js for interactive maps</li>
              <li>Story API from Dicoding</li>
              <li>Responsive design for all devices</li>
              <li>Accessibility-first approach (WCAG compliant)</li>
            </ul>
          </div>

          <div class="about-cta">
            <h2>Ready to Share Your Story?</h2>
            <p>Join the Dicoding community and start sharing your learning journey today!</p>
            <div class="cta-buttons">
              <a href="#/register" class="btn btn-primary">Get Started</a>
              <a href="#/" class="btn btn-secondary">Explore Stories</a>
            </div>
          </div>
        </section>
      </article>
    `;
  }

  async afterRender() {
    // No specific logic needed for about page
  }
}