/**
 * Home Page JavaScript - Mobile Optimized
 * Handles mobile menu, free codes display, working carousel, and dynamic subscription plans
 */

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  loadCodes();
  initTestimonialCarousel();
  loadSubscriptionPlans();
  setupSmoothScrolling();
  updateAuthUI();
});

/**
 * Mobile Menu Functionality
 */
function initMobileMenu() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const drawerClose = document.getElementById('mobile-drawer-close');
  const drawerOverlay = document.getElementById('mobile-drawer-overlay');
  const drawerLinks = document.querySelectorAll('.drawer-link');
  
  if (!menuToggle || !drawer) return;
  
  // Open drawer
  menuToggle.addEventListener('click', () => {
    drawer.classList.add('active');
    menuToggle.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
  
  // Close drawer
  const closeDrawer = () => {
    drawer.classList.remove('active');
    menuToggle.classList.remove('active');
    document.body.style.overflow = '';
  };
  
  if (drawerClose) {
    drawerClose.addEventListener('click', closeDrawer);
  }
  
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }
  
  // Close drawer when clicking links
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) {
      closeDrawer();
    }
  });
}

/**
 * Check authentication and update UI
 */
function updateAuthUI() {
  const isAuthenticated = securityManager && securityManager.isAuthenticated();
  
  // Desktop UI
  const authButtons = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu');
  
  if (authButtons && userMenu) {
    if (isAuthenticated) {
      authButtons.style.display = 'none';
      userMenu.style.display = 'flex';
      userMenu.classList.remove('hidden');
    } else {
      authButtons.style.display = 'flex';
      authButtons.classList.remove('hidden');
      userMenu.style.display = 'none';
    }
  }
  
  // Mobile UI
  const mobileAuthButtons = document.getElementById('mobile-auth-buttons');
  const mobileUserMenu = document.getElementById('mobile-user-menu');
  
  if (mobileAuthButtons && mobileUserMenu) {
    if (isAuthenticated) {
      mobileAuthButtons.classList.add('hidden');
      mobileUserMenu.classList.remove('hidden');
    } else {
      mobileAuthButtons.classList.remove('hidden');
      mobileUserMenu.classList.add('hidden');
    }
  }
  
  // Update all CTA buttons
  const ctaButtons = [
    'cta-main-btn',
    'testimonials-cta-btn',
    'final-cta-btn'
  ];
  
  ctaButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      if (isAuthenticated) {
        btn.href = './pages/profile.html';
        btn.textContent = 'Go to Dashboard';
      } else {
        btn.href = './pages/login.html';
        btn.textContent = 'Get Started';
      }
    }
  });
}

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
 * Initialize Testimonial Carousel
 */
function initTestimonialCarousel() {
  let currentIndex = 0;
  const cards = document.querySelectorAll('.testimonial-card');
  const dots = document.querySelectorAll('.testimonial-dots .dot');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const track = document.getElementById('testimonial-track');
  
  if (!track || cards.length === 0) return;
  
  // Show specific slide
  function showSlide(index) {
    // Remove active class from all cards
    cards.forEach(card => card.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    // Add active class to current card
    if (cards[index]) {
      cards[index].classList.add('active');
    }
    if (dots[index]) {
      dots[index].classList.add('active');
    }
    
    // Move track
    track.style.transform = `translateX(-${index * 100}%)`;
  }
  
  // Next slide
  function nextSlide() {
    currentIndex = (currentIndex + 1) % cards.length;
    showSlide(currentIndex);
  }
  
  // Previous slide
  function prevSlide() {
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    showSlide(currentIndex);
  }
  
  // Event listeners
  if (nextBtn) {
    nextBtn.addEventListener('click', nextSlide);
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', prevSlide);
  }
  
  // Dot navigation
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      currentIndex = index;
      showSlide(currentIndex);
    });
  });
  
  // Auto-advance every 5 seconds
  setInterval(nextSlide, 5000);
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  });
  
  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;
  
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    if (touchEndX < touchStartX - 50) nextSlide();
    if (touchEndX > touchStartX + 50) prevSlide();
  }
  
  // Initialize first slide
  showSlide(0);
}

/**
 * Load Subscription Plans from API
 */
async function loadSubscriptionPlans() {
  const loadingContainer = document.getElementById('plans-loading');
  const plansGrid = document.getElementById('plans-grid');
  
  try {
    // Detect user country
    const country = await detectUserCountry();
    
    // Fetch pricing from API
    const response = await apiService.get(
      `${CONFIG.ENDPOINTS.PAYMENTS.PRICING}?country_code=${country}`,
      false
    );
    
    if (response.success && response.data && response.data.plans) {
      displaySubscriptionPlans(response.data);
      loadingContainer.classList.add('hidden');
      plansGrid.classList.remove('hidden');
    } else {
      // Fallback to default plans
      displayDefaultPlans();
      loadingContainer.classList.add('hidden');
      plansGrid.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Failed to load subscription plans:', error);
    // Show default plans on error
    displayDefaultPlans();
    loadingContainer.classList.add('hidden');
    plansGrid.classList.remove('hidden');
  }
}

/**
 * Detect user country for pricing
 */
async function detectUserCountry() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data && data.country_code) {
      return data.country_code;
    }
  } catch (error) {
    console.log('Country detection failed, using default');
  }
  return CONFIG.DEFAULT_COUNTRY || 'NG';
}

/**
 * Display subscription plans from API
 */
function displaySubscriptionPlans(pricingData) {
  const plansGrid = document.getElementById('plans-grid');
  const plans = pricingData.plans;
  const currency = pricingData.currency || '₦';
  const isAuthenticated = securityManager && securityManager.isAuthenticated();
  
  let plansHTML = '';
  
  // Free Plan
  plansHTML += `
    <div class="plan-card">
      <h3>Free</h3>
      <div class="plan-price">
        <span class="price">${currency}0</span>
        <span class="period">/month</span>
      </div>
      <p class="plan-desc">Perfect for casual users</p>
      
      <ul class="plan-features">
        <li>✓ Access to free daily codes</li>
        <li>✓ Watch ads to unlock premium codes</li>
        <li>✗ No access to AI Predictions</li>
        <li>✓ Basic community access</li>
      </ul>
      
      <a href="${isAuthenticated ? './pages/profile.html' : './pages/login.html'}" class="btn btn-outline btn-block">
        ${isAuthenticated ? 'Current Plan' : 'Get Started Free'}
      </a>
    </div>
  `;
  
  // Monthly Plan
  if (plans.monthly) {
    const monthly = plans.monthly;
    plansHTML += `
      <div class="plan-card plan-featured">
        <div class="plan-badge">BEST VALUE</div>
        <h3>${securityManager.sanitizeHTML(monthly.name || 'Pro Monthly')}</h3>
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
        
        <a href="${isAuthenticated ? './pages/subscription.html' : './pages/login.html'}" class="btn btn-outline btn-block">
          ${isAuthenticated ? 'Upgrade to Monthly Pro' : 'Login to Subscribe'}
        </a>
      </div>
    `;
  }
  
  // Yearly Plan
  if (plans.yearly) {
    const yearly = plans.yearly;
    const monthlyEquivalent = yearly.amount / 12;
    const formattedMonthly = `${currency}${monthlyEquivalent.toFixed(0)}`;
    
    plansHTML += `
      <div class="plan-card">
        <h3>${securityManager.sanitizeHTML(yearly.name || 'Pro Annual')}</h3>
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
        
        <a href="${isAuthenticated ? './pages/subscription.html' : './pages/login.html'}" class="btn btn-outline btn-block">
          ${isAuthenticated ? 'Upgrade to Annual Pro' : 'Login to Subscribe'}
        </a>
      </div>
    `;
  }
  
  plansGrid.innerHTML = plansHTML;
}

/**
 * Display default plans if API fails
 */
function displayDefaultPlans() {
  const plansGrid = document.getElementById('plans-grid');
  const isAuthenticated = securityManager && securityManager.isAuthenticated();
  
  plansGrid.innerHTML = `
    <div class="plan-card">
      <h3>Free</h3>
      <div class="plan-price">
        <span class="price">₦0</span>
        <span class="period">/month</span>
      </div>
      <p class="plan-desc">Perfect for casual users</p>
      
      <ul class="plan-features">
        <li>✓ Access to free daily codes</li>
        <li>✓ Watch ads to unlock premium codes</li>
        <li>✗ No access to AI Predictions</li>
        <li>✓ Basic community access</li>
      </ul>
      
      <a href="${isAuthenticated ? './pages/profile.html' : './pages/login.html'}" class="btn btn-outline btn-block">
        ${isAuthenticated ? 'Current Plan' : 'Get Started Free'}
      </a>
    </div>
    
    <div class="plan-card plan-featured">
      <div class="plan-badge">BEST VALUE</div>
      <h3>Pro Monthly</h3>
      <div class="plan-price">
        <span class="price">₦2,000</span>
        <span class="period">/month</span>
      </div>
      <p class="plan-desc">All features. Full power.</p>
      
      <ul class="plan-features">
        <li>✓ Access to premium codes</li>
        <li>✓ AI Punta – advanced AI predictions</li>
        <li>✓ Ad-free experience</li>
        <li>✓ Discussions with top puntas</li>
      </ul>
      
      <a href="${isAuthenticated ? './pages/subscription.html' : './pages/login.html'}" class="btn btn-outline btn-block">
        ${isAuthenticated ? 'Upgrade to Monthly Pro' : 'Login to Subscribe'}
      </a>
    </div>
    
    <div class="plan-card">
      <h3>Pro Annual</h3>
      <div class="plan-price">
        <span class="price">₦21,600</span>
        <span class="period">/year</span>
      </div>
      <p class="plan-desc">₦1,800/month — Save more</p>
      
      <ul class="plan-features">
        <li>✓ Everything in Monthly Plan</li>
        <li>✓ Save with yearly billing</li>
        <li>✓ Early access to new features</li>
        <li>✓ Priority customer support</li>
      </ul>
      
      <a href="${isAuthenticated ? './pages/subscription.html' : './pages/login.html'}" class="btn btn-outline btn-block">
        ${isAuthenticated ? 'Upgrade to Annual Pro' : 'Login to Subscribe'}
      </a>
    </div>
  `;
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
        const offsetTop = target.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}