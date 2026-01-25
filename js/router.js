/**
 * Router Service for Surely
 * Handles navigation and protected route access control
 */

class RouterService {
  constructor() {
    this.init();
  }

  /**
   * Initialize router
   */
  init() {
    // Check authentication on page load
    this.checkRouteAccess();

    // Set up token refresh check
    if (securityManager.isAuthenticated()) {
      this.startTokenRefreshCheck();
    }

    // Listen for auth state changes
    window.addEventListener('authStateChanged', (event) => {
      if (event.detail.authenticated) {
        this.startTokenRefreshCheck();
      } else {
        this.stopTokenRefreshCheck();
      }
    });
  }

  /**
   * Check if current route requires authentication
   */
  checkRouteAccess() {
    const currentPath = window.location.pathname;
    const isProtectedRoute = this.isProtectedRoute(currentPath);

    if (isProtectedRoute && !securityManager.isAuthenticated()) {
      // Store intended destination
      sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
      
      // Redirect to login
      this.navigate('./login.html', true);
      return false;
    }

    // If authenticated and on login/register page, redirect to profile
    if (securityManager.isAuthenticated() && this.isAuthPage(currentPath)) {
      this.navigate('./profile.html', true);
      return false;
    }

    return true;
  }

  /**
   * Check if route is protected
   */
  isProtectedRoute(path) {
    const protectedPaths = [
      'profile.html',
      'subscription.html',
      'dashboard.html'
    ];

    return protectedPaths.some(protectedPath => path.includes(protectedPath));
  }

  /**
   * Check if route is an auth page
   */
  isAuthPage(path) {
    const authPaths = ['login.html', 'register.html'];
    return authPaths.some(authPath => path.includes(authPath));
  }

  /**
   * Navigate to a route
   * Handles both relative and absolute paths intelligently
   */
  navigate(path, replace = false) {
    // If path doesn't start with . or /, make it relative
    if (!path.startsWith('.') && !path.startsWith('/') && !path.startsWith('http')) {
      path = './' + path;
    }
    
    if (replace) {
      window.location.replace(path);
    } else {
      window.location.href = path;
    }
  }

  /**
   * Navigate back
   */
  goBack() {
    window.history.back();
  }

  /**
   * Get redirect path after login
   * Returns relative path from pages directory
   */
  getRedirectPath() {
    const redirect = sessionStorage.getItem('redirectAfterLogin');
    sessionStorage.removeItem('redirectAfterLogin');
    
    // If there's a stored redirect, check if it's in pages
    if (redirect && redirect.includes('profile.html')) {
      return './profile.html';
    } else if (redirect && redirect.includes('subscription.html')) {
      return './subscription.html';
    } else if (redirect && redirect.includes('dashboard.html')) {
      return './dashboard.html';
    }
    
    // Default to profile page (relative path)
    return './profile.html';
  }

  /**
   * Start token refresh check interval
   */
  startTokenRefreshCheck() {
    // Clear any existing interval
    this.stopTokenRefreshCheck();

    // Check every minute
    this.refreshInterval = setInterval(async () => {
      if (securityManager.needsRefresh()) {
        try {
          const refreshed = await authService.refreshToken();
          if (!refreshed) {
            // Refresh failed, logout user
            await authService.logout();
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          await authService.logout();
        }
      }
    }, 60000); // 1 minute
  }

  /**
   * Stop token refresh check
   */
  stopTokenRefreshCheck() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Add navigation handlers to elements
   */
  setupNavigation() {
    // Handle all internal links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-nav]');
      if (link) {
        e.preventDefault();
        const path = link.getAttribute('href');
        this.navigate(path);
      }
    });

    // Handle logout buttons
    document.addEventListener('click', (e) => {
      const logoutBtn = e.target.closest('[data-logout]');
      if (logoutBtn) {
        e.preventDefault();
        this.handleLogout();
      }
    });
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      await authService.logout();
    }
  }
}

// Export singleton instance
const routerService = new RouterService();

// Set up navigation on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    routerService.setupNavigation();
  });
} else {
  routerService.setupNavigation();
}