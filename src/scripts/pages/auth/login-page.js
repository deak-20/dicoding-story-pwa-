import StoryAPI from '../../data/story-api';
import AuthHelper from '../../utils/auth-helper';

export default class LoginPage {
  async render() {
    return `
      <section class="auth-container container">
        <div class="auth-card">
          <h1 class="auth-title">Welcome Back</h1>
          <p class="auth-subtitle">Sign in to continue to Dicoding Story</p>
          
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label for="login-email">Email Address</label>
              <input 
                type="email" 
                id="login-email" 
                name="email" 
                required
                placeholder="Enter your email"
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label for="login-password">Password</label>
              <input 
                type="password" 
                id="login-password" 
                name="password" 
                required
                placeholder="Enter your password"
                aria-required="true"
              />
            </div>

            <div id="login-error" class="error-message" role="alert" aria-live="polite"></div>

            <button type="submit" class="btn btn-primary btn-block" id="login-button">
              Sign In
            </button>
          </form>

          <p class="auth-footer">
            Don't have an account? 
            <a href="#/register">Create one here</a>
          </p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('login-form');
    const button = document.getElementById('login-button');
    const errorDiv = document.getElementById('login-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      errorDiv.textContent = '';
      button.disabled = true;
      button.textContent = 'Signing in...';

      const formData = new FormData(form);
      const data = {
        email: formData.get('email'),
        password: formData.get('password'),
      };

      try {
        const result = await StoryAPI.login(data);
        
        AuthHelper.saveAuth(result.loginResult);
        
        window.location.hash = '#/';
      } catch (error) {
        errorDiv.textContent = error.message || 'Failed to sign in. Please check your credentials.';
        button.disabled = false;
        button.textContent = 'Sign In';
      }
    });
  }
}