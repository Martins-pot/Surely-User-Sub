/**
 * Centralized API Service for Surely
 * Handles all HTTP requests with security, error handling, and retry logic
 * UPDATED: Improved error handling to prevent unwanted 404 redirects
 */

class APIService {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    this.timeout = CONFIG.API_TIMEOUT;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Build request headers
   */
  buildHeaders(includeAuth = true, customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-CSRF-Token': securityManager.getCSRFToken(),
      ...customHeaders
    };

    // Add authentication token if required
    if (includeAuth) {
      const token = securityManager.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Make HTTP request with timeout and retry logic
   * UPDATED: Better error handling without auto-redirects
   */
  async makeRequest(url, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Parse response first to get error details
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textData = await response.text();
        // Try to parse as JSON in case server didn't set correct content-type
        try {
          data = JSON.parse(textData);
        } catch {
          data = textData;
        }
      }

      // Handle different status codes
      if (response.status === 401) {
        // Unauthorized - token might be expired
        // Only clear token and redirect if we're on a protected page
        const isProtectedRoute = window.location.pathname.includes('profile') || 
                                 window.location.pathname.includes('subscription') ||
                                 window.location.pathname.includes('dashboard');
        
        if (isProtectedRoute) {
          securityManager.clearToken();
          window.location.href = './login.html';
        }
        
        throw new Error('Session expired. Please login again.');
      }

      if (response.status === 403) {
        throw new Error(data?.message || 'Access forbidden. You do not have permission.');
      }

      if (response.status === 404) {
        // Don't navigate to 404 page, just throw error
        throw new Error(data?.message || 'Resource not found.');
      }

      if (response.status === 400) {
        // Bad request - validation errors, etc.
        throw new Error(data?.message || 'Invalid request. Please check your input.');
      }

      if (response.status === 422) {
        // Unprocessable entity - validation errors
        const errorMessage = data?.message || 'Validation failed. Please check your input.';
        throw new Error(errorMessage);
      }

      if (response.status >= 500) {
        // Server error - retry if attempts remaining
        if (retryCount < this.retryAttempts) {
          await this.delay(this.retryDelay * (retryCount + 1));
          return this.makeRequest(url, options, retryCount + 1);
        }
        throw new Error(data?.message || 'Server error. Please try again later.');
      }

      if (!response.ok) {
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      return {
        success: true,
        data: data,
        status: response.status
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection.');
      }

      // Network error - retry if attempts remaining
      if (retryCount < this.retryAttempts && !error.message.includes('Session expired')) {
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.makeRequest(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Delay helper for retries
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get(endpoint, includeAuth = true) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.buildHeaders(includeAuth);

    return this.makeRequest(url, {
      method: 'GET',
      headers
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, includeAuth = true) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.buildHeaders(includeAuth);

    // Sanitize data before sending
    const sanitizedData = securityManager.sanitizeObject(data);

    return this.makeRequest(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(sanitizedData)
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, includeAuth = true) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.buildHeaders(includeAuth);

    const sanitizedData = securityManager.sanitizeObject(data);

    return this.makeRequest(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(sanitizedData)
    });
  }

  /**
   * PATCH request (JSON)
   */
  async patch(endpoint, data = {}, includeAuth = true) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.buildHeaders(includeAuth);

    const sanitizedData = securityManager.sanitizeObject(data);

    return this.makeRequest(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(sanitizedData)
    });
  }

  /**
   * PATCH request with form data (for password updates, etc.)
   * Matches mobile app's form-based PATCH requests
   */
  async patchForm(endpoint, data = {}, includeAuth = true) {
    const url = `${this.baseURL}${endpoint}`;
    const token = securityManager.getToken();
    
    const headers = {
      'X-CSRF-Token': securityManager.getCSRFToken()
    };

    if (includeAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build URL-encoded form data
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    }

    return this.makeRequest(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, includeAuth = true) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.buildHeaders(includeAuth);

    return this.makeRequest(url, {
      method: 'DELETE',
      headers
    });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload(endpoint, formData, includeAuth = true) {
    const url = `${this.baseURL}${endpoint}`;
    const token = securityManager.getToken();
    
    const headers = {
      'X-CSRF-Token': securityManager.getCSRFToken()
    };

    if (includeAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData - browser will set it with boundary

    return this.makeRequest(url, {
      method: 'POST',
      headers,
      body: formData
    });
  }
}

// Export singleton instance
const apiService = new APIService();