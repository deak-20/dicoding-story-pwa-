import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', isOpen);
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Keyboard navigation for drawer button
    this.#drawerButton.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.#drawerButton.click();
      }
    });

    // Keyboard navigation for close on Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.#navigationDrawer.classList.contains('open')) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
        this.#drawerButton.focus();
      }
    });
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    if (!page) {
      this.#content.innerHTML = '<h1>404 - Page Not Found</h1>';
      return;
    }

    // Check if View Transitions API is supported
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        await this._updatePage(page);
      });
    } else {
      // Fallback for browsers that don't support View Transitions
      await this._updatePage(page);
    }
  }

  async _updatePage(page) {
    this.#content.innerHTML = await page.render();
    await page.afterRender();
    
    // Scroll to top after page change
    window.scrollTo(0, 0);
    
    // Update active navigation link
    this._updateActiveNavLink();
  }

  _updateActiveNavLink() {
    const currentHash = window.location.hash || '#/';
    const navLinks = this.#navigationDrawer.querySelectorAll('a');
    
    navLinks.forEach(link => {
      if (link.getAttribute('href') === currentHash) {
        link.setAttribute('aria-current', 'page');
        link.style.fontWeight = 'bold';
      } else {
        link.removeAttribute('aria-current');
        link.style.fontWeight = '';
      }
    });
  }
}

export default App;