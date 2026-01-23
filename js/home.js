/**
 * Home Page JavaScript
 * Handles free codes display and page interactions
 */

// Load free codes on page load
document.addEventListener('DOMContentLoaded', () => {
  loadCodes();
  setupSmoothScrolling();
});

/**
 * Load free betting codes
 */
async function loadCodes() {
  const container = document.getElementById('codes-container');
  
  try {
    // Show loading state
    container.innerHTML = `
      <div class="code-card skeleton" style="height: 100px;"></div>
      <div class="code-card skeleton" style="height: 100px;"></div>
      <div class="code-card skeleton" style="height: 100px;"></div>
    `;
    
    // Fetch codes from API
    const response = await apiService.get(CONFIG.ENDPOINTS.CODES.FREE, false);
    
    if (response.success && response.data && response.data.length > 0) {
      displayCodes(response.data);
    } else {
      showNoCodes();
    }
    
  } catch (error) {
    console.error('Failed to load codes:', error);
    showError();
  }
}

/**
 * Display codes in the UI
 */
function displayCodes(codes) {
  const container = document.getElementById('codes-container');
  
  container.innerHTML = codes.slice(0, 6).map(code => `
    <div class="code-card">
      <div class="code-provider">
        <span class="provider-logo">${getProviderIcon(code.provider)}</span>
        <span>${code.provider}</span>
      </div>
      
      <div class="code-details">
        <div class="code-id">${securityManager.sanitizeHTML(code.code)}</div>
        <div class="code-meta">
          <span>⏱️ ${formatTimeAgo(code.createdAt)}</span>
          ${code.sport ? `<span>⚽ ${code.sport}</span>` : ''}
        </div>
      </div>
      
      <div class="code-odds">
        <div class="odds-value">${code.odds} odds</div>
        ${code.rating ? `<div class="rating">⭐ ${code.rating}</div>` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Show message when no codes available
 */
function showNoCodes() {
  const container = document.getElementById('codes-container');
  container.innerHTML = `
    <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <h3>No Free Codes Available</h3>
      <p style="margin-bottom: 1.5rem;">Free codes are updated regularly. Check back soon or upgrade to Pro for premium codes!</p>
      <a href="./pages/subscription.html" class="btn btn-primary">Upgrade to Pro</a>
    </div>
  `;
}

/**
 * Show error message
 */
function showError() {
  const container = document.getElementById('codes-container');
  container.innerHTML = `
    <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <h3>Unable to Load Codes</h3>
      <p style="margin-bottom: 1.5rem;">There was an error loading betting codes. Please try again.</p>
      <button class="btn btn-primary" onclick="loadCodes()">Retry</button>
    </div>
  `;
}

/**
 * Get provider icon/emoji
 */
function getProviderIcon(provider) {
  const icons = {
    'SportyBet': '🟢',
    '1XBET': '🟢',
    'BetKing': '🔴',
    'Bet9ja': '🟢',
    'NairaBet': '🟠',
    'default': '🎲'
  };
  
  return icons[provider] || icons.default;
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Recently';
  
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

/**
 * Setup smooth scrolling for anchor links
 */
function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        const offsetTop = target.offsetTop - 80; // Account for navbar
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Check authentication and update UI
 */
if (securityManager.isAuthenticated()) {
  // Update navbar for authenticated users
  const navActions = document.querySelector('.navbar-actions');
  if (navActions) {
    navActions.innerHTML = `
      <a href="./pages/profile.html" class="btn btn-secondary btn-sm">Profile</a>
      <button class="btn btn-primary btn-sm" data-logout>Logout</button>
    `;
  }
}