/**
 * Configuration file for Surely Frontend
 * Contains API endpoints, security settings, and app constants
 */

const CONFIG = {
  // API Configuration
  API_BASE_URL: 'https://srv442638.hstgr.cloud',
  API_TIMEOUT: 30000, // 30 seconds
  
  // Security Settings
  TOKEN_KEY: '__surely_auth__', // Prefixed to avoid conflicts
  TOKEN_EXPIRY_KEY: '__surely_auth_exp__',
  TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes before expiry
  
  // Session Configuration
  SESSION_TIMEOUT: 3600000, // 1 hour
  REMEMBER_ME_DURATION: 2592000000, // 30 days
  
  // Payment Configuration (TEST MODE)
  // NOTE: Plans and pricing are fetched dynamically from backend based on user country
  // Do NOT hardcode prices or currency symbols
  
  // Country Detection
  DEFAULT_COUNTRY: 'NG', // Default to Nigeria if detection fails
  
  // Route Configuration
  ROUTES: {
    PUBLIC: ['/', '/login', '/register', '/home'],
    PROTECTED: ['/profile', '/subscription', '/dashboard']
  },
  
  // API Endpoints
  // Based on working mobile app endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/user/login',
      REGISTER: '/user/register',
      LOGOUT: '/user/logout',        
      REFRESH: '/user/refresh-token' 
    },
    USER: {
      PROFILE: '/user/me',                // Get current user
      UPDATE: '/user/update',             // Update user (requires userId appended)
      CHANGE_PASSWORD: '/user/update',    // Change password (requires userId appended)
      DELETE: '/user/delete',             // Delete account (requires userId appended)
      GET_DETAILS: '/user/get',           // Get user details by email/username
      EXISTS: '/user/exists',             // Check if email/username exists
      VERIFY_PASSWORD: '/user/verify/password' // Verify password (requires userId appended)
    },
    // PAYMENT ENDPOINTS - Following backend contract exactly
    PAYMENTS: {
      PRICING: '/payments/pricing',        // GET - Fetch pricing by country (no auth)
      INITIATE: '/payments/initiate',      // POST - Start payment (requires auth)
      STATUS: '/payments/status',          // GET - Verify payment status (requires auth) - append /{reference}
      ME: '/payments/me',                  // GET - Check current subscription (requires auth)
      HISTORY: '/payments/history'         // GET - Payment history (requires auth)
    },
    // Legacy subscription endpoints (may be deprecated)
    SUBSCRIPTION: {
      PLANS: '/subscription/plans',
      SUBSCRIBE: '/subscription/subscribe',
      STATUS: '/subscription/status',
      CANCEL: '/subscription/cancel'
    },
    CODES: {
      FREE: '/codes',                     // Get all codes (same as mobile)
      PREMIUM: '/codes/premium',
      BY_ID: '/codes'                     // Get code by ID (append /{id})
    },
    DEVICE: {
      REGISTER: '/device/register',
      LINK: '/device/link_user',
      UNLINK: '/device/unlink_user'
    },
    OTP: {
      SEND: '/otp/send',
      VERIFY: '/user/verify'
    },
    ANALYTICS: {
      TRACK: '/analytics/track'
    },
    BET_BUILDER: {
      GENERATE: '/bet-builder'            // Append /{matchId}/generate
    }
  }
};

// Freeze configuration to prevent tampering
Object.freeze(CONFIG);
Object.freeze(CONFIG.ROUTES);
Object.freeze(CONFIG.ENDPOINTS);