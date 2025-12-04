import StoryAPI from '../../data/story-api';

export default class RegisterPage {
  async render() {
    return `
      <section class="auth-container container">
        <div class="auth-card">
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Join Dicoding Story to share your moments</p>
          
          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label for="register-name">Full Name</label>
              <input 
                type="text" 
                id="register-name" 
                name="name" 
                required
                minlength="3"
                placeholder="Enter your full name"
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label for="register-email">Email Address</label>
              <input 
                type="email" 
                id="register-email" 
                name="email" 
                required
                placeholder="Enter your email"
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label for="register-password">Password</label>
              <input 
                type="password" 
                id="register-password" 
                name="password" 
                required
                minlength="8"
                placeholder="Minimum 8 characters"
                aria-required="true"
              />
              <small class="form-hint">Password must be at least 8 characters</small>
            </div>

            <div id="register-error" class="error-message" role="alert" aria-live="polite"></div>
            <div id="register-success" class="success-message" role="alert" aria-live="polite"></div>

            <button type="submit" class="btn btn-primary btn-block" id="register-button">
              Create Account
            </button>
          </form>

          <p class="auth-footer">
            Already have an account? 
            <a href="#/login">Sign in here</a>
          </p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('register-form');
    const button = document.getElementById('register-button');
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      errorDiv.textContent = '';
      successDiv.textContent = '';
      button.disabled = true;
      button.textContent = 'Creating Account...';

      const formData = new FormData(form);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
      };

      try {
        const result = await StoryAPI.register(data);
        
        successDiv.textContent = result.message || 'Account created successfully! Redirecting to login...';
        
        setTimeout(() => {
          window.location.hash = '#/login';
        }, 2000);
      } catch (error) {
        errorDiv.textContent = error.message || 'Failed to create account. Please try again.';
        button.disabled = false;
        button.textContent = 'Create Account';
      }
    });
  }
}