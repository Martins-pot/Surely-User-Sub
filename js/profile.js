/**
 * Profile Page JavaScript
 * Handles user profile display and account management
 * UPDATED: Removed personal info editing, added expandable sections, auto-refresh username
 */

let originalProfileData = {};

// Load profile data on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  await loadSubscriptionInfo();
  setupEventListeners();
  
  // Initialize sections as collapsed by default
  collapseAllSections();
});

/**
 * Load user profile data with automatic refresh if username is empty
 */
async function loadProfile() {
  try {
    // Check if authenticated
    if (!securityManager.isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      window.location.href = './login.html';
      return;
    }

    // Get user from auth service
    let user = authService.getCurrentUser();
    
    // If no cached user OR username is empty, try to load from API
    if (!user || !user.userName || user.userName.trim() === '') {
      console.log('Username empty or no cached user, attempting refresh...');
      user = await authService.loadCurrentUser();
      
      // If still no username after refresh, try one more time after a delay
      if (user && (!user.userName || user.userName.trim() === '')) {
        console.log('Username still empty, waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        user = await authService.loadCurrentUser();
      }
    }
    
    if (!user) {
      throw new Error('Unable to load user data');
    }
    
    displayProfileData(user);
    
  } catch (error) {
    console.error('Failed to load profile:', error);
    
    // Show error but don't redirect if we have cached user
    const cachedUser = authService.getCurrentUser();
    if (cachedUser) {
      displayProfileData(cachedUser);
      showAlert('Using cached profile data. Some features may be limited.', 'info');
    } else {
      showAlert('Failed to load profile data. Please try logging in again.', 'error');
      setTimeout(() => {
        authService.logout();
      }, 3000);
    }
  }
}

/**
 * Display profile data in the UI
 */
function displayProfileData(user) {
  // Store original data
  originalProfileData = { ...user };
  
  // Handle both camelCase and snake_case from API
  const userName = user.userName || user.username || user.user_name || '';
  const userId = user.userId || user.user_id || '';
  const userEmail = user.email || '';
  
  // Split username into first and last name if needed
  const nameParts = userName.split(' ');
  const firstName = user.firstName || user.first_name || nameParts[0] || '';
  const lastName = user.lastName || user.last_name || nameParts.slice(1).join(' ') || '';
  
  // Update header
  const fullName = `${firstName} ${lastName}`.trim() || userName || 'User';
  document.getElementById('user-full-name').textContent = fullName;
  document.getElementById('user-email').textContent = userEmail;
  
  // Update avatar initials
  const initials = getInitials(firstName, lastName, userName);
  document.getElementById('avatar-initials').textContent = initials;
  
  // Store normalized data
  originalProfileData = {
    ...originalProfileData,
    firstName,
    lastName,
    userName,
    userId,
    email: userEmail
  };
}

/**
 * Get initials from name
 */
function getInitials(firstName, lastName, userName) {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  
  if (userName) {
    const parts = userName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  }
  
  return '??';
}

/**
 * Load subscription information
 */
async function loadSubscriptionInfo() {
  const container = document.getElementById('subscription-info');
  
  try {
    // Use payment endpoint: GET /payments/me
    const response = await apiService.get(CONFIG.ENDPOINTS.PAYMENTS.ME);
    
    if (response.success && response.data) {
      displaySubscriptionInfo(response.data);
    } else {
      displayFreeSubscription();
    }
    
  } catch (error) {
    console.error('Failed to load subscription:', error);
    displayFreeSubscription();
  }
}

/**
 * Display subscription information with animations
 */
function displaySubscriptionInfo(subscription) {
  const container = document.getElementById('subscription-info');
  const statusBadge = document.getElementById('subscription-status');
  
  // Check if subscription is active
  const isActive = subscription.active === true;
  const planName = subscription.plan ? 
    (subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)) : 
    'Pro';
  
  // Update status badge in header
  statusBadge.textContent = isActive ? `${planName} Plan` : 'Free Plan';
  statusBadge.parentElement.classList.toggle('status-pro', isActive);
  
  if (isActive) {
    // Parse expiry date
    const expiresAt = subscription.expires_at ? 
      new Date(subscription.expires_at).toLocaleDateString() : 
      'N/A';
    
    const daysRemaining = subscription.days_remaining || 0;
    const autoRenew = subscription.auto_renew_enabled ? 'Enabled' : 'Disabled';
    const subscriptionType = subscription.subscription_type === 'auto_recurring' ? 
      'Auto-Renewing' : 'One-Time Payment';
    const inGracePeriod = subscription.in_grace_period || false;
    
    container.innerHTML = `
      <div class="subscription-details-grid">
        <div class="subscription-stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">Status</div>
            <div class="stat-value status-active">Active</div>
          </div>
        </div>

        <div class="subscription-stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <path d="M9 21V9"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">Current Plan</div>
            <div class="stat-value">${planName}</div>
          </div>
        </div>

        <div class="subscription-stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">Expires</div>
            <div class="stat-value">${expiresAt}</div>
          </div>
        </div>

        <div class="subscription-stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">Days Remaining</div>
            <div class="stat-value">${daysRemaining}</div>
          </div>
        </div>

        <div class="subscription-stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">Type</div>
            <div class="stat-value">${subscriptionType}</div>
          </div>
        </div>

        <div class="subscription-stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">Auto-Renew</div>
            <div class="stat-value">${autoRenew}</div>
          </div>
        </div>
      </div>
      
      ${inGracePeriod ? `
      <div class="grace-period-notice">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>Your subscription is in grace period</span>
      </div>
      ` : ''}
      
      <div class="subscription-actions">
        <a href="./subscription.html" class="btn btn-outline btn-block">Manage Subscription</a>
      </div>
    `;
    
    // Add animation class
    setTimeout(() => {
      const cards = container.querySelectorAll('.subscription-stat-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.style.animation = 'slideInUp 0.5s ease forwards';
        }, index * 100);
      });
    }, 100);
  } else {
    displayFreeSubscription();
  }
}

/**
 * Display free subscription state
 */
function displayFreeSubscription() {
  const container = document.getElementById('subscription-info');
  const statusBadge = document.getElementById('subscription-status');
  
  statusBadge.textContent = 'Free Plan';
  statusBadge.parentElement.classList.remove('status-pro');
  
  container.innerHTML = `
    <div class="subscription-details">
      <div class="free-plan-card">
        <div class="free-plan-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a51d2a" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
        </div>
        <h3>You're on the Free Plan</h3>
        <p>Upgrade to Pro to unlock premium features:</p>
        <ul class="feature-list">
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Premium bet codes</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>AI-powered predictions</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Ad-free experience</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Priority support</span>
          </li>
        </ul>
      </div>
    </div>
    <div class="subscription-actions">
      <a href="./subscription.html" class="btn btn-primary btn-block">Upgrade to Pro</a>
    </div>
  `;
}

/**
 * Toggle expandable section
 */
function toggleSection(sectionId) {
  const content = document.getElementById(`${sectionId}-content`);
  const icon = document.getElementById(`${sectionId}-icon`);
  const card = content.closest('.expandable-card');
  
  const isExpanded = content.classList.contains('expanded');
  
  if (isExpanded) {
    content.classList.remove('expanded');
    card.classList.remove('expanded');
    icon.style.transform = 'rotate(0deg)';
  } else {
    content.classList.add('expanded');
    card.classList.add('expanded');
    icon.style.transform = 'rotate(180deg)';
  }
}

/**
 * Collapse all sections initially
 */
function collapseAllSections() {
  const sections = ['subscription', 'security'];
  sections.forEach(sectionId => {
    const content = document.getElementById(`${sectionId}-content`);
    const icon = document.getElementById(`${sectionId}-icon`);
    if (content && icon) {
      content.classList.remove('expanded');
      icon.style.transform = 'rotate(0deg)';
    }
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Password form submission
  const passwordForm = document.getElementById('password-form');
  passwordForm.addEventListener('submit', handlePasswordChange);
}

/**
 * Handle password change
 */
async function handlePasswordChange(e) {
  e.preventDefault();
  
  // Clear previous errors
  clearErrors();
  clearAlerts();
  
  // Get form data
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // Validate
  if (!currentPassword || !newPassword || !confirmPassword) {
    showAlert('All password fields are required', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showAlert('New passwords do not match', 'error');
    document.getElementById('confirmPassword-error').textContent = 'Passwords do not match';
    return;
  }
  
  // Validate password strength
  const passwordValidation = securityManager.validatePassword(newPassword);
  if (!passwordValidation.valid) {
    const errors = [];
    if (!passwordValidation.minLength) errors.push('at least 8 characters');
    if (!passwordValidation.hasUpper) errors.push('one uppercase letter');
    if (!passwordValidation.hasLower) errors.push('one lowercase letter');
    if (!passwordValidation.hasNumber) errors.push('one number');
    showAlert(`Password must contain: ${errors.join(', ')}`, 'error');
    return;
  }
  
  // Set loading state
  setLoadingState('change-password-btn', 'password-btn-text', 'password-btn-loading', true);
  
  try {
    const response = await authService.changePassword(currentPassword, newPassword);
    
    if (response.success) {
      showAlert('Password changed successfully', 'success');
      
      // Clear form
      document.getElementById('password-form').reset();
    }
    
  } catch (error) {
    console.error('Password change error:', error);
    showAlert(error.message || 'Failed to change password', 'error');
  } finally {
    setLoadingState('change-password-btn', 'password-btn-text', 'password-btn-loading', false);
  }
}

/**
 * Toggle password field visibility
 */
function togglePasswordField(fieldId) {
  const field = document.getElementById(fieldId);
  const type = field.getAttribute('type') === 'password' ? 'text' : 'password';
  field.setAttribute('type', type);
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  const container = document.getElementById('alert-container');
  container.innerHTML = `
    <div class="alert alert-${type}">
      ${securityManager.sanitizeHTML(message)}
    </div>
  `;
  
  // Auto-dismiss success messages
  if (type === 'success') {
    setTimeout(() => {
      container.innerHTML = '';
    }, 5000);
  }
  
  // Scroll to alert
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Clear alert messages
 */
function clearAlerts() {
  document.getElementById('alert-container').innerHTML = '';
}

/**
 * Clear form errors
 */
function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
}

/**
 * Set loading state for buttons
 */
function setLoadingState(btnId, textId, loadingId, loading) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  const loadingEl = document.getElementById(loadingId);
  
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loadingEl.classList.toggle('hidden', !loading);
}