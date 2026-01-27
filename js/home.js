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
      <div class="code-card-horizontal skeleton" style="min-width: 280px; height: 140px;"></div>
      <div class="code-card-horizontal skeleton" style="min-width: 280px; height: 140px;"></div>
      <div class="code-card-horizontal skeleton" style="min-width: 280px; height: 140px;"></div>
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
 * Display codes in the UI - Horizontal scroll design
 */
function displayCodes(codes) {
  const container = document.getElementById('codes-container');
  
  container.innerHTML = codes.slice(0, 10).map(code => `
    <div class="code-card-horizontal">
      <div class="code-header">
        <div class="provider-info">
          <span class="provider-name">${securityManager.sanitizeHTML(code.provider)}</span>
          <span class="provider-flag">${getProviderFlag(code.provider)}</span>
        </div>
        <button class="copy-btn" onclick="copyCode('${securityManager.sanitizeHTML(code.code)}')" title="Copy code">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2z"/>
            <path d="M2 6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1H6a3 3 0 0 1-3-3V6z"/>
          </svg>
        </button>
      </div>
      
      <div class="code-main">
        <div class="code-value">${securityManager.sanitizeHTML(code.code)}</div>
        <div class="code-rating">
          <span class="star">⭐</span>
          <span class="rating-value">${code.rating || '4.2'}</span>
        </div>
      </div>
      
      <div class="code-footer">
        <div class="code-odds-display">${code.odds} odds</div>
        <div class="code-time">${formatTimeAgo(code.createdAt)}</div>
      </div>
    </div>
  `).join('');
}

/**
 * Copy code to clipboard
 */
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    // Show brief success message
    const btn = event.target.closest('.copy-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span style="font-size: 12px;">✓</span>';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 1500);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

/**
 * Show message when no codes available
 */
function showNoCodes() {
  const container = document.getElementById('codes-container');
  container.innerHTML = `
    <div class="no-codes-message">
      <h3>No Free Codes Available</h3>
      <p>Free codes are updated regularly. Check back soon or upgrade to Pro for premium codes!</p>
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
    <div class="no-codes-message">
      <h3>Unable to Load Codes</h3>
      <p>There was an error loading betting codes. Please try again.</p>
      <button class="btn btn-primary" onclick="loadCodes()">Retry</button>
    </div>
  `;
}

/**
 * Get provider flag emoji
 */
function getProviderFlag(provider) {
  const flags = {
    'SportyBet': '🇳🇬',
    '1XBET': '🇷🇺',
    'BetKing': '🇳🇬',
    'Bet9ja': '🇳🇬',
    'NairaBet': '🇳🇬',
    'default': '🌍'
  };
  
  return flags[provider] || flags.default;
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