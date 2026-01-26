/**
 * Subscription Page JavaScript
 * Implements the complete payment flow following the backend contract exactly
 * 
 * Flow:
 * 1. Detect user country (no backend call)
 * 2. Fetch pricing: GET /payments/pricing?country_code=US
 * 3. Display plans dynamically
 * 4. Initiate payment: POST /payments/initiate
 * 5. Redirect to provider
 * 6. Handle redirect and verify: GET /payments/status/{reference}
 * 7. Grant premium access on success
 */

let currentCountry = null;
let pricingData = null;

// Page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!authService.isAuthenticated()) {
    window.location.href = './login.html';
    return;
  }

  // Check if we're returning from a payment redirect
  await handlePaymentRedirect();

  // Detect country and load pricing
  await initializeSubscriptionPage();

  // Load current subscription status
  await loadCurrentSubscription();
});

/**
 * Step 1: Detect User Country
 * No backend call - use IP detection or default
 */
async function detectCountryFrontend() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();

    if (data && data.country_code) {
      return data.country_code;
    }
  } catch (_) {}

  return 'NG';
}

// function detectUserCountry() {
//   // Try to get country from various sources:
//   // 1. From user profile if available
//   const user = authService.getCurrentUser();
//   if (user && user.country) {
//     return user.country;
//   }

//   // 2. From browser locale
//   const locale = navigator.language || navigator.userLanguage;
//   if (locale) {
//     const countryCode = locale.split('-')[1];
//     if (countryCode) {
//       return countryCode.toUpperCase();
//     }
//   }

//   // 3. Default to Nigeria (from config)
//   return CONFIG.DEFAULT_COUNTRY;
// }

/**
 * Initialize the subscription page
 */
async function initializeSubscriptionPage() {
  try {
    // Step 1: Detect country (no API call)
    currentCountry = detectUserCountry();
    // "NG"
    // 
    console.log('Detected country:', currentCountry);

    // Step 2: Fetch pricing based on country
    await fetchPricing(currentCountry);

    // Step 3: Display plans
    displayPricingPlans();

  } catch (error) {
    console.error('Failed to initialize subscription page:', error);
    showAlert('Failed to load pricing information. Please try again.', 'error');
  }
}

/**
 * Step 2: Fetch Pricing
 * GET /payments/pricing?country_code=US
 * Auth: No
 */
async function fetchPricing(countryCode) {
  try {
    showLoading(true);

    // Build URL with query parameter
    const endpoint = `${CONFIG.ENDPOINTS.PAYMENTS.PRICING}?country_code=${countryCode}`;
    
    // No authentication required for pricing endpoint
    const response = await apiService.get(endpoint, false);

    if (response.success && response.data) {
      pricingData = response.data;
      console.log('Pricing data received:', pricingData);
      return pricingData;
    } else {
      throw new Error('Failed to fetch pricing');
    }

  } catch (error) {
    console.error('Pricing fetch error:', error);
    
    // Try fallback to default country if different
    if (countryCode !== CONFIG.DEFAULT_COUNTRY) {
      console.log('Retrying with default country...');
      currentCountry = CONFIG.DEFAULT_COUNTRY;
      const endpoint = `${CONFIG.ENDPOINTS.PAYMENTS.PRICING}?country_code=${CONFIG.DEFAULT_COUNTRY}`;
      const response = await apiService.get(endpoint, false);
      
      if (response.success && response.data) {
        pricingData = response.data;
        return pricingData;
      }
    }
    
    throw error;
  } finally {
    showLoading(false);
  }
}

/**
 * Step 3: Display Pricing Plans
 * Render plans exactly as returned by API - DO NOT hardcode
 */
function displayPricingPlans() {
  if (!pricingData || !pricingData.plans) {
    showAlert('No pricing plans available', 'error');
    return;
  }

  const container = document.getElementById('plans-container');
  const plans = pricingData.plans;

  // Build HTML for each plan
  let plansHTML = '';

  // Monthly plan
  if (plans.monthly) {
    const monthly = plans.monthly;
    plansHTML += `
      <div class="plan-card">
        <h3>${securityManager.sanitizeHTML(monthly.name || 'Monthly Plan')}</h3>
        <div class="plan-price">
          <span class="price">${securityManager.sanitizeHTML(monthly.display || monthly.amount)}</span>
          <span class="period">/month</span>
        </div>
        <p class="plan-desc">All features. Full power.</p>
        
        <ul class="plan-features">
          <li>✓ Access to premium codes</li>
          <li>✓ AI Punta – advanced AI predictions</li>
          <li>✓ Ad-free experience</li>
          <li>✓ Discussions with top puntas</li>
        </ul>
        
        <button class="btn btn-primary btn-block" onclick="initiatePayment('monthly', true)">
          Upgrade to Monthly Pro
        </button>
      </div>
    `;
  }

  // Yearly plan
  if (plans.yearly) {
    const yearly = plans.yearly;
    const monthlyEquivalent = yearly.amount / 12;
    const formattedMonthly = `${pricingData.currency} ${monthlyEquivalent.toFixed(2)}`;
    
    plansHTML += `
      <div class="plan-card plan-featured">
        <div class="plan-badge">BEST VALUE</div>
        <h3>${securityManager.sanitizeHTML(yearly.name || 'Annual Plan')}</h3>
        <div class="plan-price">
          <span class="price">${securityManager.sanitizeHTML(yearly.display || yearly.amount)}</span>
          <span class="period">/year</span>
        </div>
        <p class="plan-desc">${formattedMonthly}/month — Save more</p>
        
        <ul class="plan-features">
          <li>✓ Everything in Monthly Plan</li>
          <li>✓ Save with yearly billing</li>
          <li>✓ Early access to new features</li>
          <li>✓ Priority customer support</li>
        </ul>
        
        <button class="btn btn-primary btn-block" onclick="initiatePayment('yearly', true)">
          Upgrade to Annual Pro
        </button>
      </div>
    `;
  }

  container.innerHTML = plansHTML;
  container.classList.remove('hidden');
  document.getElementById('pricing-loading').classList.add('hidden');
}

/**
 * Step 4: Initiate Payment
 * POST /payments/initiate
 * Auth: Yes (Bearer token)
 */
async function initiatePayment(plan, enableAutoRenew = true) {
  try {
    clearAlerts();

    // Confirm with user
    const planName = pricingData.plans[plan]?.name || plan;
    const amount = pricingData.plans[plan]?.display || pricingData.plans[plan]?.amount;
    
    const confirmed = confirm(
      `Subscribe to ${planName} for ${amount}?\n\nThis is TEST MODE - use test card to complete payment.`
    );
    
    if (!confirmed) return;

    // Show loading
    showAlert('Initiating payment...', 'info');

    // Prepare request body
    const requestBody = {
      plan: plan,
      country_code: currentCountry,
      enable_auto_renew: enableAutoRenew
    };

    console.log('Initiating payment with:', requestBody);

    // Make API call - requires authentication
    const response = await apiService.post(
      CONFIG.ENDPOINTS.PAYMENTS.INITIATE,
      requestBody,
      true // Authentication required
    );

    if (response.success && response.data) {
      const paymentData = response.data;
      console.log('Payment initiated:', paymentData);

      // Extract authorization URL
      const authUrl = paymentData.authorization_url;
      
      if (!authUrl) {
        throw new Error('No authorization URL received');
      }

      // Store reference for later verification
      sessionStorage.setItem('pending_payment_reference', paymentData.reference);
      sessionStorage.setItem('pending_payment_plan', plan);

      // Step 5: Redirect to payment provider
      showAlert('Redirecting to payment provider...', 'success');
      
      setTimeout(() => {
        window.location.href = authUrl;
      }, 1000);

    } else {
      throw new Error('Payment initiation failed');
    }

  } catch (error) {
    console.error('Payment initiation error:', error);
    showAlert(error.message || 'Failed to initiate payment. Please try again.', 'error');
  }
}

/**
 * Step 6 & 7: Handle Payment Redirect
 * Called when user returns from payment provider
 */
async function handlePaymentRedirect() {
  // Check URL parameters for payment reference
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference') || 
                    urlParams.get('tx_ref') || 
                    urlParams.get('trxref') ||
                    sessionStorage.getItem('pending_payment_reference');

  if (!reference) {
    // No payment redirect, normal page load
    return;
  }

  console.log('Handling payment redirect for reference:', reference);

  // Hide pricing section
  document.getElementById('pricing-section').classList.add('hidden');

  // Show payment status section
  const statusContainer = document.getElementById('payment-status-container');
  statusContainer.classList.remove('hidden');
  statusContainer.innerHTML = `
    <div class="profile-card" style="text-align: center; padding: 3rem;">
      <div class="loading" style="margin: 0 auto 1rem;"></div>
      <h3>Verifying Payment...</h3>
      <p>Please wait while we confirm your payment.</p>
    </div>
  `;

  // Step 8: Verify payment status
  await verifyPaymentStatus(reference);
}

/**
 * Step 8: Verify Payment Status
 * GET /payments/status/{reference}
 * Auth: Yes
 */
async function verifyPaymentStatus(reference) {
  try {
    // Add delay to allow backend to process webhook
    await new Promise(resolve => setTimeout(resolve, 2000));

    const endpoint = `${CONFIG.ENDPOINTS.PAYMENTS.STATUS}/${reference}`;
    
    // Requires authentication
    const response = await apiService.get(endpoint, true);

    console.log('Payment verification response:', response);

    if (response.success && response.data) {
      const status = response.data.status;
      
      // Step 9: Handle different statuses
      if (status === 'success') {
        // Payment successful!
        displayPaymentSuccess(response.data);
        
        // Clear stored reference
        sessionStorage.removeItem('pending_payment_reference');
        sessionStorage.removeItem('pending_payment_plan');
        
        // Reload subscription status
        await loadCurrentSubscription();
        
      } else if (status === 'pending') {
        // Payment is still processing
        displayPaymentPending(response.data);
        
        // Retry verification after delay
        setTimeout(() => verifyPaymentStatus(reference), 5000);
        
      } else {
        // Payment failed
        displayPaymentFailed(response.data);
        
        // Clear stored reference
        sessionStorage.removeItem('pending_payment_reference');
        sessionStorage.removeItem('pending_payment_plan');
      }
    } else {
      throw new Error('Failed to verify payment status');
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    displayPaymentError(error);
  }
}

/**
 * Step 9: Display Payment Results
 */
function displayPaymentSuccess(data) {
  const container = document.getElementById('payment-status-container');
  container.innerHTML = `
    <div class="profile-card" style="text-align: center; padding: 3rem; background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
      <h2 style="color: #10b981; margin-bottom: 1rem;">Payment Successful!</h2>
      <p style="margin-bottom: 2rem;">${securityManager.sanitizeHTML(data.message || 'Your subscription has been activated.')}</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <a href="./profile.html" class="btn btn-primary">Go to Profile</a>
        <button class="btn btn-secondary" onclick="location.reload()">View Plans</button>
      </div>
    </div>
  `;
}

function displayPaymentPending(data) {
  const container = document.getElementById('payment-status-container');
  container.innerHTML = `
    <div class="profile-card" style="text-align: center; padding: 3rem; background: rgba(251, 191, 36, 0.1); border: 2px solid #f59e0b;">
      <div class="loading" style="margin: 0 auto 1rem;"></div>
      <h3 style="color: #f59e0b; margin-bottom: 1rem;">Payment Processing...</h3>
      <p>${securityManager.sanitizeHTML(data.message || 'Waiting for payment confirmation...')}</p>
      <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.7;">This may take a few moments. Please don't close this page.</p>
    </div>
  `;
}

function displayPaymentFailed(data) {
  const container = document.getElementById('payment-status-container');
  container.innerHTML = `
    <div class="profile-card" style="text-align: center; padding: 3rem; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
      <h2 style="color: #ef4444; margin-bottom: 1rem;">Payment Failed</h2>
      <p style="margin-bottom: 2rem;">${securityManager.sanitizeHTML(data.message || 'Your payment could not be processed.')}</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
        <a href="./profile.html" class="btn btn-outline">Back to Profile</a>
      </div>
    </div>
  `;
}

function displayPaymentError(error) {
  const container = document.getElementById('payment-status-container');
  container.innerHTML = `
    <div class="profile-card" style="text-align: center; padding: 3rem; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
      <h2 style="color: #ef4444; margin-bottom: 1rem;">Verification Error</h2>
      <p style="margin-bottom: 2rem;">We couldn't verify your payment status. Please contact support if you were charged.</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        <a href="./profile.html" class="btn btn-outline">Back to Profile</a>
      </div>
    </div>
  `;
}

/**
 * Check Current Subscription Status
 * GET /payments/me
 * Auth: Yes
 */
async function loadCurrentSubscription() {
  const container = document.getElementById('current-subscription-content');
  
  try {
    // Show loading state
    container.innerHTML = '<div class="skeleton" style="height: 80px;"></div>';

    // Fetch subscription status - requires authentication
    const response = await apiService.get(CONFIG.ENDPOINTS.PAYMENTS.ME, true);

    if (response.success && response.data) {
      displaySubscriptionStatus(response.data);
    } else {
      // No active subscription
      displayNoSubscription();
    }

  } catch (error) {
    console.error('Failed to load subscription status:', error);
    displayNoSubscription();
  }
}

/**
 * Display subscription status
 */
function displaySubscriptionStatus(subscription) {
  const container = document.getElementById('current-subscription-content');
  
  if (!subscription.active) {
    displayNoSubscription();
    return;
  }

  // Parse expiry date
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
  const expiryDate = expiresAt ? expiresAt.toLocaleDateString() : 'N/A';
  const daysRemaining = subscription.days_remaining || 0;

  container.innerHTML = `
    <div class="subscription-details">
      <div class="subscription-row">
        <span class="label">Status:</span>
        <span class="value" style="color: #10b981;">✓ Active</span>
      </div>
      <div class="subscription-row">
        <span class="label">Plan:</span>
        <span class="value">${securityManager.sanitizeHTML(subscription.plan || 'Pro')}</span>
      </div>
      <div class="subscription-row">
        <span class="label">Expires:</span>
        <span class="value">${expiryDate}</span>
      </div>
      <div class="subscription-row">
        <span class="label">Days Remaining:</span>
        <span class="value">${daysRemaining} days</span>
      </div>
      <div class="subscription-row">
        <span class="label">Auto-Renew:</span>
        <span class="value">${subscription.auto_renew_enabled ? '✓ Enabled' : '✗ Disabled'}</span>
      </div>
      ${subscription.in_grace_period ? `
      <div class="subscription-row">
        <span class="label" style="color: #f59e0b;">Grace Period:</span>
        <span class="value" style="color: #f59e0b;">Active</span>
      </div>
      ` : ''}
    </div>
  `;
}

function displayNoSubscription() {
  const container = document.getElementById('current-subscription-content');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <p style="margin-bottom: 1rem; opacity: 0.7;">You don't have an active subscription.</p>
      <p>Choose a plan above to get started!</p>
    </div>
  `;
}

/**
 * Utility Functions
 */
function showLoading(show) {
  const loading = document.getElementById('pricing-loading');
  const container = document.getElementById('plans-container');
  
  if (show) {
    loading.classList.remove('hidden');
    container.classList.add('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

function showAlert(message, type = 'info') {
  const container = document.getElementById('alert-container');
  container.innerHTML = `
    <div class="alert alert-${type}">
      ${securityManager.sanitizeHTML(message)}
    </div>
  `;
  
  // Auto-dismiss after 5 seconds
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      container.innerHTML = '';
    }, 5000);
  }
  
  // Scroll to alert
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAlerts() {
  document.getElementById('alert-container').innerHTML = '';
}