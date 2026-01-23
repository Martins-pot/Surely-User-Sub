/**
 * Authentication Service for Surely
 * Handles user registration, login, logout, and session management
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.loadCurrentUser();
  }

  /**
   * Load current user from storage
   */
  async loadCurrentUser() {
    if (securityManager.isAuthenticated()) {
      try {
        const response = await apiService.get(CONFIG.ENDPOINTS.USER.PROFILE);
        if (response.success) {
          this.currentUser = response.data;
          return this.currentUser;
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        securityManager.clearToken();
      }
    }
    return null;
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      // Validate required fields
      if (!userData.email || !userData.password) {
        throw new Error('Email and password are required');
      }

      // Validate email format
      if (!securityManager.validateEmail(userData.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      const passwordValidation = securityManager.validatePassword(userData.password);
      if (!passwordValidation.valid) {
        const errors = [];
        if (!passwordValidation.minLength) errors.push('at least 8 characters');
        if (!passwordValidation.hasUpper) errors.push('one uppercase letter');
        if (!passwordValidation.hasLower) errors.push('one lowercase letter');
        if (!passwordValidation.hasNumber) errors.push('one number');
        throw new Error(`Password must contain: ${errors.join(', ')}`);
      }

      // Make registration request
      const response = await apiService.post(
        CONFIG.ENDPOINTS.AUTH.REGISTER,
        {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone
        },
        false // No auth needed for registration
      );

      if (response.success) {
        // Auto-login after successful registration
        if (response.data.token) {
          this.handleAuthSuccess(response.data, userData.rememberMe);
        }
        return response;
      }

      throw new Error('Registration failed');

    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password, rememberMe = false) {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!securityManager.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Make login request
      const response = await apiService.post(
        CONFIG.ENDPOINTS.AUTH.LOGIN,
        { email, password },
        false // No auth needed for login
      );

      if (response.success && response.data.token) {
        this.handleAuthSuccess(response.data, rememberMe);
        return response;
      }

      throw new Error('Login failed');

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle successful authentication
   */
  handleAuthSuccess(authData, rememberMe = false) {
    // Store token securely
    const expiresIn = authData.expiresIn || 3600; // Default 1 hour
    securityManager.storeToken(authData.token, expiresIn, rememberMe);

    // Store user data
    this.currentUser = authData.user || authData;

    // Dispatch custom event for auth state change
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { user: this.currentUser, authenticated: true }
    }));
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call logout endpoint if authenticated
      if (securityManager.isAuthenticated()) {
        try {
          await apiService.post(CONFIG.ENDPOINTS.AUTH.LOGOUT);
        } catch (error) {
          // Continue logout even if API call fails
          console.error('Logout API call failed:', error);
        }
      }

      // Clear local state
      securityManager.clearToken();
      this.currentUser = null;

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { user: null, authenticated: false }
      }));

      // Redirect to login
      window.location.href = '/pages/login.html';

    } catch (error) {
      console.error('Logout error:', error);
      // Force logout anyway
      securityManager.clearToken();
      this.currentUser = null;
      window.location.href = '/pages/login.html';
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return securityManager.isAuthenticated() && this.currentUser !== null;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const response = await apiService.post(CONFIG.ENDPOINTS.AUTH.REFRESH);
      
      if (response.success && response.data.token) {
        const expiresIn = response.data.expiresIn || 3600;
        const rememberMe = localStorage.getItem(CONFIG.TOKEN_KEY) !== null;
        securityManager.storeToken(response.data.token, expiresIn, rememberMe);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      const response = await apiService.put(
        CONFIG.ENDPOINTS.USER.UPDATE,
        profileData
      );

      if (response.success) {
        // Update current user
        this.currentUser = { ...this.currentUser, ...response.data };
        
        // Dispatch update event
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { user: this.currentUser }
        }));
        
        return response;
      }

      throw new Error('Profile update failed');

    } catch (error) {
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      // Validate new password
      const passwordValidation = securityManager.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new Error('New password does not meet requirements');
      }

      const response = await apiService.post(
        CONFIG.ENDPOINTS.USER.CHANGE_PASSWORD,
        {
          currentPassword,
          newPassword
        }
      );

      return response;

    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const authService = new AuthService();