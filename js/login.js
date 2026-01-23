/**
 * Login Page JavaScript
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
 * Handle login process
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
    // Attempt login
    const response = await authService.login(email, password, rememberMe);
    
    if (response.success) {
      showAlert('Login successful! Redirecting...', 'success');
      
      // Redirect after short delay
      setTimeout(() => {
        const redirectPath = routerService.getRedirectPath();
        window.location.href = redirectPath;
      }, 1000);
    }
    
  } catch (error) {
    console.error('Login error:', error);
    showAlert(error.message || 'Login failed. Please check your credentials.', 'error');
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