import CONFIG from '../config';

class AuthHelper {
  static saveAuth(loginResult) {
    localStorage.setItem(CONFIG.TOKEN_KEY, loginResult.token);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify({
      userId: loginResult.userId,
      name: loginResult.name,
    }));
  }

  static getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  }

  static getUser() {
    const userString = localStorage.getItem(CONFIG.USER_KEY);
    return userString ? JSON.parse(userString) : null;
  }

  static isAuthenticated() {
    return !!this.getToken();
  }

  static clearAuth() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
  }

  static checkAuth() {
    if (!this.isAuthenticated()) {
      window.location.hash = '#/login';
      return false;
    }
    return true;
  }
}

export default AuthHelper;