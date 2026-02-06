/**
 * Login Page JavaScript
 * UPDATED: Improved error handling to prevent 404 redirects
 */

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const btnText = document.getElementById('btn-text');
const btnLoading = document.getElementById('btn-loading');

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleLogin();
});

/**
 * Handle login process with improved error handling
 */
async function handleLogin() {
  // Clear previous errors
  clearErrors();
  clearAlerts();
  
  // Get form data
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me').checked;
  
  // Validate inputs
  if (!email || !password) {
    showAlert('Please fill in all fields', 'error');
    return;
  }
  
  // Set loading state
  setLoading(true);
  
  try {
    console.log('Attempting login with email:', email);
    
    // Attempt login
    const response = await authService.login(email, password, rememberMe);
    
    console.log('Login response:', response);
    
    if (response.success) {
      showAlert('Login successful! Redirecting...', 'success');
      
      // Redirect after short delay
      setTimeout(() => {
        console.log('Redirecting to profile...');
        
        // Use relative path since we're in /pages/login.html
        const redirectPath = './profile.html';
        
        console.log('Redirect path:', redirectPath);
        console.log('Current location:', window.location.href);
        
        window.location.href = redirectPath;
      }, 1000);
    } else {
      // Handle unsuccessful response without navigation
      const errorMessage = response?.data?.message || 
                          response?.message || 
                          'Login failed. Please check your credentials.';
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Improved error message handling
    let errorMessage = 'Login failed. Please check your credentials and try again.';
    
    if (error.message) {
      // Extract meaningful error message
      if (error.message.includes('Invalid') || error.message.includes('incorrect')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        errorMessage = 'Account not found. Please check your email or register.';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('server') || error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (!error.message.includes('status') && error.message.length < 100) {
        // Use the actual error message if it's meaningful and not too long
        errorMessage = error.message;
      }
    }
    
    // Display error message without navigation
    showAlert(errorMessage, 'error');
    setLoading(false);
  }
}

/**
 * Toggle password visibility
 */
function togglePassword() {
  const passwordInput = document.getElementById('password');
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
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
 * Set loading state
 */
function setLoading(loading) {
  loginBtn.disabled = loading;
  btnText.classList.toggle('hidden', loading);
  btnLoading.classList.toggle('hidden', !loading);
}

// Debug: Log when page loads
console.log('Login page loaded');
console.log('Current location:', window.location.href);
console.log('Is authenticated:', securityManager.isAuthenticated());