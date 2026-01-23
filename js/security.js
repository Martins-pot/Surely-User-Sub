/**
 * Security Utilities for Surely
 * Handles secure token storage, XSS prevention, and input sanitization
 */

class SecurityManager {
  constructor() {
    this.csrfToken = this.generateCSRFToken();
  }

  /**
   * Generate a CSRF token
   */
  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Store authentication token securely
   * Uses sessionStorage by default for better security
   * Only uses localStorage if "Remember Me" is checked
   */
  storeToken(token, expiresIn, rememberMe = false) {
    try {
      const storage = rememberMe ? localStorage : sessionStorage;
      const expiryTime = Date.now() + (expiresIn * 1000);
      
      // Store token with expiry
      storage.setItem(CONFIG.TOKEN_KEY, token);
      storage.setItem(CONFIG.TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      return true;
    } catch (error) {
      console.error('Token storage failed:', error);
      return false;
    }
  }

  /**
   * Retrieve authentication token
   * Checks both sessionStorage and localStorage
   */
  getToken() {
    try {
      // Check sessionStorage first (more secure)
      let token = sessionStorage.getItem(CONFIG.TOKEN_KEY);
      let expiry = sessionStorage.getItem(CONFIG.TOKEN_EXPIRY_KEY);
      
      // Fall back to localStorage if not in session
      if (!token) {
        token = localStorage.getItem(CONFIG.TOKEN_KEY);
        expiry = localStorage.getItem(CONFIG.TOKEN_EXPIRY_KEY);
      }
      
      // Validate token expiry
      if (token && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          return token;
        } else {
          // Token expired, clear it
          this.clearToken();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Token retrieval failed:', error);
      return null;
    }
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh() {
    try {
      const expiry = sessionStorage.getItem(CONFIG.TOKEN_EXPIRY_KEY) || 
                     localStorage.getItem(CONFIG.TOKEN_EXPIRY_KEY);
      
      if (expiry) {
        const expiryTime = parseInt(expiry, 10);
        const timeRemaining = expiryTime - Date.now();
        return timeRemaining < CONFIG.TOKEN_REFRESH_THRESHOLD;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    try {
      sessionStorage.removeItem(CONFIG.TOKEN_KEY);
      sessionStorage.removeItem(CONFIG.TOKEN_EXPIRY_KEY);
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      localStorage.removeItem(CONFIG.TOKEN_EXPIRY_KEY);
      return true;
    } catch (error) {
      console.error('Token clearing failed:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.getToken() !== null;
  }

  /**
   * Sanitize HTML input to prevent XSS
   */
  sanitizeHTML(input) {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Sanitize object for API submission
   */
  sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeHTML(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return {
      valid: minLength && hasUpper && hasLower && hasNumber,
      minLength,
      hasUpper,
      hasLower,
      hasNumber
    };
  }

  /**
   * Get CSRF token for headers
   */
  getCSRFToken() {
    return this.csrfToken;
  }

  /**
   * Hash sensitive data (for comparison, not storage)
   */
  async hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Export singleton instance
const securityManager = new SecurityManager();