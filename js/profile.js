/**
 * Profile Page JavaScript
 * Handles user profile display, editing, and account management
 * UPDATED: Now uses /payments/me endpoint for subscription status
 */

let isEditMode = false;
let originalProfileData = {};

// Load profile data on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  await loadSubscriptionInfo();
  setupEventListeners();
});

/**
 * Load user profile data
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
    
    // If no cached user, try to load from API
    if (!user) {
      user = await authService.loadCurrentUser();
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
  const userAvatar = user.avatar || user.avatarUrl || user.avatar_url || '';
  
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
  
  // Update form fields
  document.getElementById('firstName').value = firstName;
  document.getElementById('lastName').value = lastName;
  document.getElementById('email').value = userEmail;
  document.getElementById('phone').value = user.phone || user.phone_number || '';
  
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
 * UPDATED: Now uses /payments/me endpoint instead of /subscription/status
 */
async function loadSubscriptionInfo() {
  const container = document.getElementById('subscription-info');
  
  try {
    // Use new payment endpoint: GET /payments/me
    const response = await apiService.get(CONFIG.ENDPOINTS.PAYMENTS.ME);
    
    if (response.success && response.data) {
      displaySubscriptionInfo(response.data);
    } else {
      displayFreeSubscription();
    }
    
  } catch (error) {
    console.error('Failed to load subscription:', error);
    // Default to free subscription on error
    displayFreeSubscription();
  }
}

/**
 * Display subscription information from /payments/me response
 * Response format:
 * {
 *   "active": true,
 *   "plan": "monthly",
 *   "expires_at": "2026-02-23T00:00:00Z",
 *   "days_remaining": 30,
 *   "in_grace_period": false,
 *   "subscription_type": "auto_recurring",
 *   "auto_renew_enabled": true,
 *   "payment_provider": "flutterwave"
 * }
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
    const autoRenew = subscription.auto_renew_enabled ? 'Yes' : 'No';
    const inGracePeriod = subscription.in_grace_period || false;
    
    container.innerHTML = `
      <div class="subscription-details">
        <div class="subscription-row">
          <span class="label">Current Plan:</span>
          <span class="value">${planName}</span>
        </div>
        <div class="subscription-row">
          <span class="label">Status:</span>
          <span class="value status-active">Active</span>
        </div>
        <div class="subscription-row">
          <span class="label">Expires:</span>
          <span class="value">${expiresAt}</span>
        </div>
        <div class="subscription-row">
          <span class="label">Days Remaining:</span>
          <span class="value">${daysRemaining} days</span>
        </div>
        <div class="subscription-row">
          <span class="label">Auto-Renew:</span>
          <span class="value">${autoRenew}</span>
        </div>
        ${inGracePeriod ? `
        <div class="subscription-row">
          <span class="label" style="color: #f59e0b;">Grace Period:</span>
          <span class="value" style="color: #f59e0b;">Active</span>
        </div>
        ` : ''}
      </div>
      <div class="subscription-actions">
        <a href="./subscription.html" class="btn btn-outline btn-block">Manage Subscription</a>
      </div>
    `;
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
      <div class="subscription-row">
        <span class="label">Current Plan:</span>
        <span class="value">Free</span>
      </div>
      <div class="subscription-message">
        <p>You're currently on the Free plan. Upgrade to Pro to unlock:</p>
        <ul>
          <li>✓ Premium bet codes</li>
          <li>✓ AI-powered predictions</li>
          <li>✓ Ad-free experience</li>
          <li>✓ Priority support</li>
        </ul>
      </div>
    </div>
    <div class="subscription-actions">
      <a href="./subscription.html" class="btn btn-primary btn-block">Upgrade to Pro</a>
    </div>
  `;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Profile form submission
  const profileForm = document.getElementById('profile-form');
  profileForm.addEventListener('submit', handleProfileUpdate);
  
  // Password form submission
  const passwordForm = document.getElementById('password-form');
  passwordForm.addEventListener('submit', handlePasswordChange);
}

/**
 * Toggle edit mode for profile
 */
function toggleEditMode() {
  isEditMode = !isEditMode;
  
  const inputs = document.querySelectorAll('#profile-form input:not([type="email"])');
  const formActions = document.getElementById('profile-form-actions');
  const editBtn = document.getElementById('edit-profile-btn');
  
  inputs.forEach(input => {
    input.disabled = !isEditMode;
  });
  
  formActions.classList.toggle('hidden', !isEditMode);
  editBtn.innerHTML = isEditMode ? 'Cancel' : `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
    </svg>
    Edit
  `;
  
  if (isEditMode) {
    editBtn.onclick = cancelEditMode;
  } else {
    editBtn.onclick = toggleEditMode;
  }
}

/**
 * Cancel edit mode
 */
function cancelEditMode() {
  isEditMode = false;
  displayProfileData(originalProfileData);
  
  const formActions = document.getElementById('profile-form-actions');
  const editBtn = document.getElementById('edit-profile-btn');
  
  formActions.classList.add('hidden');
  editBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
    </svg>
    Edit
  `;
  editBtn.onclick = toggleEditMode;
  
  clearErrors();
}

/**
 * Handle profile update
 */
async function handleProfileUpdate(e) {
  e.preventDefault();
  
  // Clear previous errors
  clearErrors();
  clearAlerts();
  
  // Get form data
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  
  // Validate
  if (!firstName || !lastName) {
    showAlert('First name and last name are required', 'error');
    return;
  }
  
  // Set loading state
  setLoadingState('save-profile-btn', 'save-btn-text', 'save-btn-loading', true);
  
  try {
    const response = await authService.updateProfile({
      firstName,
      lastName,
      phone
    });
    
    if (response.success) {
      showAlert('Profile updated successfully', 'success');
      originalProfileData = { ...originalProfileData, firstName, lastName, phone };
      
      // Update display
      displayProfileData({ ...originalProfileData });
      
      // Exit edit mode
      setTimeout(() => {
        cancelEditMode();
      }, 1500);
    }
    
  } catch (error) {
    console.error('Profile update error:', error);
    showAlert(error.message || 'Failed to update profile', 'error');
  } finally {
    setLoadingState('save-profile-btn', 'save-btn-text', 'save-btn-loading', false);
  }
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