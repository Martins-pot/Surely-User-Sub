/**
 * Subscription Page JavaScript
 * Complete payment flow with auto-renew and one-time payment options
 * UPDATED: Fixed 422 error with proper authentication and data validation
 */

let currentCountry = null;
let pricingData = null;
let selectedPlan = null;
let currentSubscription = null;

// Page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!securityManager.isAuthenticated()) {
    window.location.href = './login.html';
    return;
  }

  // Ensure user is loaded
  await authService.loadCurrentUser();

  // Load current subscription first
  await loadCurrentSubscription();

  // Check if we're returning from a payment redirect
  await handlePaymentRedirect();

  // Detect country and load pricing
  await initializeSubscriptionPage();
  
  // Load payment history
  await loadPaymentHistory();
});

/**
 * Step 1: Detect User Country
 */
async function detectUserCountry() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();

    if (data && data.country_code) {
      return data.country_code;
    }
  } catch (_) {
    console.log('Country detection failed, using default');
  }

  return CONFIG.DEFAULT_COUNTRY || 'NG';
}

/**
 * Initialize the subscription page
 */
async function initializeSubscriptionPage() {
  try {
    // Step 1: Detect country
    currentCountry = await detectUserCountry();
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
 */
async function fetchPricing(countryCode) {
  try {
    showLoading(true);

    const endpoint = `${CONFIG.ENDPOINTS.PAYMENTS.PRICING}?country_code=${countryCode}`;
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
    
    // Try fallback to default country
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
 * Hide active plan if user is already subscribed
 */
function displayPricingPlans() {
  if (!pricingData || !pricingData.plans) {
    showAlert('No pricing plans available', 'error');
    return;
  }

  const container = document.getElementById('plans-container');
  const plans = pricingData.plans;

  // Check if user has active subscription
  const hasActiveSubscription = currentSubscription && currentSubscription.active;
  const activePlan = hasActiveSubscription ? currentSubscription.plan : null;

  let plansHTML = '';

  // Monthly plan
  if (plans.monthly && (!hasActiveSubscription || activePlan !== 'monthly')) {
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
        
        <button class="btn btn-outline btn-block" onclick="showPaymentTypeModal('monthly')">
          Choose Monthly Plan
        </button>
      </div>
    `;
  }

  // Yearly plan
  if (plans.yearly && (!hasActiveSubscription || activePlan !== 'yearly')) {
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
        
        <button class="btn btn-outline btn-block" onclick="showPaymentTypeModal('yearly')">
          Choose Annual Plan
        </button>
      </div>
    `;
  }

  // If user has active subscription and it matches available plans
  if (hasActiveSubscription && plansHTML === '') {
    container.innerHTML = `
      <div class="active-plan-notice">
        <div class="active-plan-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3>Your Plan is Active!</h3>
        <p>You're currently subscribed to the <strong>${activePlan.charAt(0).toUpperCase() + activePlan.slice(1)}</strong> plan.</p>
        <p>Manage your subscription from your profile or return home to enjoy premium features.</p>
        <div class="active-plan-actions">
          <a href="./profile.html" class="btn btn-primary">Go to Profile</a>
          <a href="../index.html" class="btn btn-outline">Go to Home</a>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = plansHTML;
  }

  container.classList.remove('hidden');
  document.getElementById('pricing-loading').classList.add('hidden');
}

/**
 * Show payment type selection modal
 */
function showPaymentTypeModal(plan) {
  selectedPlan = plan;
  const modal = document.getElementById('payment-type-modal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Close payment type modal
 */
function closePaymentTypeModal() {
  const modal = document.getElementById('payment-type-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  selectedPlan = null;
}

/**
 * Select payment type and initiate payment
 */
function selectPaymentType(paymentType) {
  const enableAutoRenew = paymentType === 'auto-renew';
  const planToSubscribe = selectedPlan; // Save plan BEFORE closing modal
  closePaymentTypeModal(); // This sets selectedPlan = null
  initiatePayment(planToSubscribe, enableAutoRenew); // Use saved value
}

/**
 * Step 4: Initiate Payment
 * FIXED: Proper authentication check and data validation
 */
async function initiatePayment(plan, enableAutoRenew = true) {
  try {
    clearAlerts();

    // Ensure user is authenticated
    if (!securityManager.isAuthenticated()) {
      showAlert('Please login to subscribe', 'error');
      setTimeout(() => {
        window.location.href = './login.html';
      }, 1500);
      return;
    }

    // Ensure current user is loaded
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      showAlert('Loading user profile...', 'info');
      await authService.loadCurrentUser();
      const retryUser = authService.getCurrentUser();
      if (!retryUser) {
        throw new Error('Unable to load user profile. Please refresh the page.');
      }
    }

    // Validate we have pricing data
    if (!pricingData || !pricingData.plans || !pricingData.plans[plan]) {
      throw new Error('Pricing information not available. Please refresh the page.');
    }

    // Get plan details
    const planName = pricingData.plans[plan]?.name || plan;
    const amount = pricingData.plans[plan]?.display || pricingData.plans[plan]?.amount;
    const paymentType = enableAutoRenew ? 'Auto-Renewing' : 'One-Time Payment';
    
    // Confirm with user
    const confirmed = confirm(
      `Subscribe to ${planName} for ${amount}?\nPayment Type: ${paymentType}\n\nClick OK to proceed to payment.`
    );
    
    if (!confirmed) return;

    // Show loading
    showAlert('Initiating payment...', 'info');

    // Prepare request body - ensure correct data types and format
    const requestBody = {
      plan: plan.toLowerCase(), // Ensure lowercase: 'monthly' or 'yearly'
      country_code: currentCountry.toUpperCase(), // Ensure uppercase: 'NG', 'US', etc.
      enable_auto_renew: Boolean(enableAutoRenew) // Ensure boolean
    };

    console.log('Initiating payment with:', requestBody);
    console.log('Auth token present:', !!securityManager.getToken());

    // Make API call with explicit auth
    const response = await apiService.post(
      CONFIG.ENDPOINTS.PAYMENTS.INITIATE,
      requestBody,
      true // Include authentication
    );

    console.log('Payment initiation response:', response);

    if (response.success && response.data) {
      const paymentData = response.data;
      
      // Handle different response formats
      const authUrl = paymentData.authorization_url || paymentData.authorizationUrl;
      const reference = paymentData.reference || paymentData.payment_reference;
      
      if (!authUrl) {
        console.error('No authorization URL in response:', paymentData);
        throw new Error('No authorization URL received from payment provider');
      }

      if (!reference) {
        console.error('No reference in response:', paymentData);
        throw new Error('No payment reference received');
      }

      // Store reference for later verification
      sessionStorage.setItem('pending_payment_reference', reference);
      sessionStorage.setItem('pending_payment_plan', plan);

      // Redirect to payment provider
      showAlert('Redirecting to payment provider...', 'success');
      
      setTimeout(() => {
        window.location.href = authUrl;
      }, 1000);

    } else {
      // Log the full response for debugging
      console.error('Payment initiation failed - Full response:', response);
      
      // Try to extract error message from various possible formats
      const errorMessage = response?.data?.message || 
                          response?.message || 
                          response?.error?.message ||
                          response?.error ||
                          'Payment initiation failed';
      
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('Payment initiation error:', error);
    
    // Provide more detailed error message
    let errorMessage = 'Failed to initiate payment. ';
    
    if (error.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Please try again.';
    }
    
    // If it's a 401/403, suggest re-login
    if (error.message && (error.message.includes('401') || error.message.includes('403') || error.message.includes('Unauthorized'))) {
      errorMessage = 'Your session has expired. Please login again.';
      showAlert(errorMessage, 'error');
      setTimeout(() => {
        window.location.href = './login.html';
      }, 2000);
      return;
    }
    
    showAlert(errorMessage, 'error');
  }
}

/**
 * Handle Payment Redirect
 */
async function handlePaymentRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference') || 
                    urlParams.get('tx_ref') || 
                    urlParams.get('trxref') ||
                    sessionStorage.getItem('pending_payment_reference');

  if (!reference) {
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

  // Verify payment status
  await verifyPaymentStatus(reference);
}

/**
 * Verify Payment Status
 */
async function verifyPaymentStatus(reference) {
  try {
    // Add delay to allow backend to process webhook
    await new Promise(resolve => setTimeout(resolve, 2000));

    const endpoint = `${CONFIG.ENDPOINTS.PAYMENTS.STATUS}/${reference}`;
    const response = await apiService.get(endpoint, true);

    console.log('Payment verification response:', response);

    if (response.success && response.data) {
      const status = response.data.status;
      
      if (status === 'success') {
        displayPaymentSuccess(response.data);
        sessionStorage.removeItem('pending_payment_reference');
        sessionStorage.removeItem('pending_payment_plan');
        await loadCurrentSubscription();
        
      } else if (status === 'pending') {
        displayPaymentPending(response.data);
        setTimeout(() => verifyPaymentStatus(reference), 5000);
        
      } else {
        displayPaymentFailed(response.data);
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
 * Display Payment Results
 */
function displayPaymentSuccess(data) {
  const container = document.getElementById('payment-status-container');
  container.innerHTML = `
    <div class="payment-result-card payment-success">
      <div class="payment-result-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h2>Payment Successful!</h2>
      <p>${securityManager.sanitizeHTML(data.message || 'Your subscription has been activated.')}</p>
      <div class="payment-result-actions">
        <a href="./profile.html" class="btn btn-primary">Go to Profile</a>
        <button class="btn btn-outline" onclick="location.reload()">View Plans</button>
      </div>
    </div>
  `;
}

function displayPaymentPending(data) {
  const container = document.getElementById('payment-status-container');
  container.innerHTML = `
    <div class="payment-result-card payment-pending">
      <div class="loading" style="margin: 0 auto 2rem;"></div>
      <h3>Payment Processing...</h3>
      <p>${securityManager.sanitizeHTML(data.message || 'Waiting for payment confirmation...')}</p>
      <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.7;">This may take a few moments. Please don't close this page.</p>
    </div>
  `;
}

function displayPaymentFailed(data) {
  const container = document.getElementById('payment-status-container');
  container.innerHTML = `
    <div class="payment-result-card payment-failed">
      <div class="payment-result-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h2>Payment Failed</h2>
      <p>${securityManager.sanitizeHTML(data.message || 'Your payment could not be processed.')}</p>
      <div class="payment-result-actions">
        <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
        <a href="./profile.html" class="btn btn-outline">Back to Profile</a>
      </div>
    </div>
  `;
}

function displayPaymentError(error) {
  const container = document.getElementById('payment-status-container');
  container.innerHTML = `
    <div class="payment-result-card payment-error">
      <div class="payment-result-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h2>Verification Error</h2>
      <p>We couldn't verify your payment status. Please contact support if you were charged.</p>
      <div class="payment-result-actions">
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        <a href="./profile.html" class="btn btn-outline">Back to Profile</a>
      </div>
    </div>
  `;
}

/**
 * Load Current Subscription Status
 */
async function loadCurrentSubscription() {
  const container = document.getElementById('current-subscription-content');
  
  try {
    container.innerHTML = '<div class="skeleton" style="height: 200px;"></div>';

    const response = await apiService.get(CONFIG.ENDPOINTS.PAYMENTS.ME, true);

    if (response.success && response.data) {
      currentSubscription = response.data;
      displaySubscriptionStatus(response.data);
    } else {
      displayNoSubscription();
    }

  } catch (error) {
    console.error('Failed to load subscription status:', error);
    displayNoSubscription();
  }
}

/**
 * Display subscription status with animations
 */
function displaySubscriptionStatus(subscription) {
  const container = document.getElementById('current-subscription-content');
  
  if (!subscription.active) {
    displayNoSubscription();
    return;
  }

  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'N/A';
  const daysRemaining = subscription.days_remaining || 0;
  const planName = subscription.plan ? (subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)) : 'Pro';
  const subscriptionType = subscription.subscription_type === 'auto_recurring' ? 'Auto-Renewing' : 'One-Time Payment';
  const autoRenew = subscription.auto_renew_enabled;

  container.innerHTML = `
    <div class="current-subscription-header">
      <div class="subscription-status-badge">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>Active Subscription</span>
      </div>
      <h3>Current Plan</h3>
    </div>
    
    <div class="subscription-stats-grid">
      <div class="sub-stat-card">
        <div class="sub-stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18"/>
            <path d="M9 21V9"/>
          </svg>
        </div>
        <div class="sub-stat-info">
          <div class="sub-stat-label">Plan</div>
          <div class="sub-stat-value">${planName}</div>
        </div>
      </div>

      <div class="sub-stat-card">
        <div class="sub-stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div class="sub-stat-info">
          <div class="sub-stat-label">Expires</div>
          <div class="sub-stat-value">${expiresAt}</div>
        </div>
      </div>

      <div class="sub-stat-card">
        <div class="sub-stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="sub-stat-info">
          <div class="sub-stat-label">Days Left</div>
          <div class="sub-stat-value">${daysRemaining}</div>
        </div>
      </div>

      <div class="sub-stat-card">
        <div class="sub-stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M23 6l-9.5 9.5-5-5L1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div class="sub-stat-info">
          <div class="sub-stat-label">Type</div>
          <div class="sub-stat-value">${subscriptionType}</div>
        </div>
      </div>
    </div>
  `;

  // Add animation
  setTimeout(() => {
    const cards = container.querySelectorAll('.sub-stat-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.style.animation = 'slideInUp 0.5s ease forwards';
      }, index * 100);
    });
  }, 100);
}

function displayNoSubscription() {
  const container = document.getElementById('current-subscription-content');
  container.innerHTML = `
    <div class="no-subscription-notice">
      <div class="no-sub-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      </div>
      <h3>No Active Subscription</h3>
      <p>You don't have an active subscription. Choose a plan below to get started!</p>
    </div>
  `;
}

/**
 * Load Payment History
 * GET /payments/history
 * Auth: Yes
 */
async function loadPaymentHistory() {
  const container = document.getElementById('payment-history-content');
  
  try {
    // Show loading state
    container.innerHTML = '<div class="skeleton" style="height: 200px;"></div>';

    // Fetch payment history - requires authentication
    const response = await apiService.get(CONFIG.ENDPOINTS.PAYMENTS.HISTORY, true);

    if (response.success && response.data && response.data.length > 0) {
      displayPaymentHistory(response.data);
    } else {
      displayNoPaymentHistory();
    }

  } catch (error) {
    console.error('Failed to load payment history:', error);
    displayNoPaymentHistory();
  }
}

/**
 * Display payment history
 */
function displayPaymentHistory(payments) {
  const container = document.getElementById('payment-history-content');
  
  // Sort payments by date (newest first)
  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || 0);
    return dateB - dateA;
  });

  let paymentsHTML = '<div class="payment-history-list">';

  sortedPayments.forEach((payment, index) => {
    const date = new Date(payment.created_at || payment.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const status = payment.status || 'pending';
    const amount = payment.amount || 0;
    const currency = payment.currency || 'USD';
    const plan = payment.plan ? (payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)) : 'Plan';
    const reference = payment.reference || payment.payment_reference || 'N/A';
    const paymentType = payment.subscription_type === 'auto_recurring' ? 'Auto-Renewing' : 'One-Time Payment';
    const provider = payment.payment_provider || payment.provider || 'N/A';

    // Status badge color
    let statusClass = 'status-pending';
    let statusIcon = '⏳';
    if (status === 'success' || status === 'completed') {
      statusClass = 'status-success';
      statusIcon = '✓';
    } else if (status === 'failed' || status === 'declined') {
      statusClass = 'status-failed';
      statusIcon = '✗';
    }

    paymentsHTML += `
      <div class="payment-history-item" style="animation-delay: ${index * 0.1}s">
        <div class="payment-item-header">
          <div class="payment-item-main">
            <div class="payment-item-icon ${statusClass}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div class="payment-item-details">
              <div class="payment-item-title">
                <span class="payment-plan-name">${securityManager.sanitizeHTML(plan)} Plan</span>
                <span class="payment-status-badge ${statusClass}">
                  ${statusIcon} ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <div class="payment-item-meta">
                <span>${formattedDate}</span>
                <span class="payment-meta-divider">•</span>
                <span>${securityManager.sanitizeHTML(paymentType)}</span>
                <span class="payment-meta-divider">•</span>
                <span>${securityManager.sanitizeHTML(provider)}</span>
              </div>
            </div>
          </div>
          <div class="payment-item-amount">
            <span class="payment-amount-value">${securityManager.sanitizeHTML(currency)} ${amount.toFixed(2)}</span>
          </div>
        </div>
        <div class="payment-item-reference">
          <span class="reference-label">Reference:</span>
          <span class="reference-value">${securityManager.sanitizeHTML(reference)}</span>
        </div>
      </div>
    `;
  });

  paymentsHTML += '</div>';
  container.innerHTML = paymentsHTML;

  // Add animation
  setTimeout(() => {
    const items = container.querySelectorAll('.payment-history-item');
    items.forEach(item => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });
  }, 100);
}

/**
 * Display no payment history message
 */
function displayNoPaymentHistory() {
  const container = document.getElementById('payment-history-content');
  container.innerHTML = `
    <div class="no-payment-history">
      <div class="no-history-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      </div>
      <h4>No Payment History</h4>
      <p>You haven't made any payments yet. Subscribe to a plan to get started!</p>
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
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      container.innerHTML = '';
    }, 5000);
  }
  
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAlerts() {
  document.getElementById('alert-container').innerHTML = '';
}