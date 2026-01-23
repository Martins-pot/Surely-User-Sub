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
  
  // Flutterwave Configuration
  FLUTTERWAVE_PUBLIC_KEY: 'FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxx', // Replace with actual key
  
  // Subscription Plans
  SUBSCRIPTION_PLANS: {
    MONTHLY: {
      name: 'Pro Monthly',
      price: 2000,
      currency: 'NGN',
      interval: 'monthly',
      description: 'All features. Full power.'
    },
    ANNUAL: {
      name: 'Pro Annual',
      price: 21600,
      currency: 'NGN',
      interval: 'yearly',
      description: '₦1,800/month — Best Value',
      savings: '10%'
    }
  },
  
  // Route Configuration
  ROUTES: {
    PUBLIC: ['/', '/login', '/register', '/home'],
    PROTECTED: ['/profile', '/subscription', '/dashboard']
  },
  
  // API Endpoints (Based on standard REST conventions)
  // TODO: Verify these against actual Postman documentation
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/api/auth/register',
      LOGIN: '/api/auth/login',
      LOGOUT: '/api/auth/logout',
      REFRESH: '/api/auth/refresh',
      VERIFY: '/api/auth/verify'
    },
    USER: {
      PROFILE: '/api/user/profile',
      UPDATE: '/api/user/update',
      CHANGE_PASSWORD: '/api/user/change-password'
    },
    SUBSCRIPTION: {
      PLANS: '/api/subscription/plans',
      SUBSCRIBE: '/api/subscription/subscribe',
      STATUS: '/api/subscription/status',
      CANCEL: '/api/subscription/cancel'
    },
    CODES: {
      FREE: '/api/codes/free',
      PREMIUM: '/api/codes/premium'
    }
  }
};

// Freeze configuration to prevent tampering
Object.freeze(CONFIG);
Object.freeze(CONFIG.SUBSCRIPTION_PLANS);
Object.freeze(CONFIG.ROUTES);
Object.freeze(CONFIG.ENDPOINTS);