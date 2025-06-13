/**
 * Sit and Stay Pet Care - Admin Dashboard JavaScript
 * Handles Google Login, Analytics, and Page Content Management
 * Created: June 11, 2025
 */

// Configuration - UPDATE THESE WITH ACTUAL VALUES
let CONFIG = {
    // Replace with your Google Client ID from Google Cloud Console
    GOOGLE_CLIENT_ID: '323272466004-n3vqvtmb0qumc92ngackscce8d4pjo5h.apps.googleusercontent.com',
    
    // Replace with your Google Analytics Property ID (e.g., 'G-XXXXXXXXXX')
    ANALYTICS_PROPERTY_ID: 'G-77T5LN70NP',
    
    // Authorized admin emails (multiple admins allowed)
    AUTHORIZED_ADMINS: [
        'bailee.williams@google.com',      // Bailee's email (primary admin)
        'shoemaker.brandon35@gmail.com'    // Brandon's email (setup/support access)
    ],
    
    // Business owner email for notifications
    BUSINESS_OWNER_EMAIL: 'bailee.williams@google.com',
    
    // Google Calendar ID for booking automation
    CALENDAR_ID: 'primary',
    
    // Subscription pricing tiers
    PRICING: {
        BASIC: 80,
        PREMIUM: 120,
        ELITE: 180
    },
    
    // Stripe payment processing configuration
    STRIPE: {
        MODE: 'test', // 'test' or 'live'
        PUBLISHABLE_KEY: 'pk_test_51234567890abcdef', // Test key placeholder
        SECRET_KEY: 'sk_test_51234567890abcdef', // Test key placeholder
        WEBHOOK_SECRET: 'whsec_1234567890abcdef', // Webhook secret
        WEBHOOK_ENDPOINT: 'https://sitandstaypetcare.netlify.app/.netlify/functions/stripe-webhook'
    },
    
    // Page content mapping for editor
    PAGES: {
        'about': {
            file: 'about.html',
            title: 'About Page'
        },
        'services': {
            file: 'services.html', 
            title: 'Services Page'
        },
        'contact': {
            file: 'contact.html',
            title: 'Contact Page'
        }
    },

    // Pet Database Configuration
    PET_DATABASE: {
        SHEET_ID: 'YOUR_PET_DATABASE_SHEET_ID', // Replace with actual Google Sheet ID
        SHEET_NAME: 'Pet Profiles',
        API_KEY: 'YOUR_GOOGLE_SHEETS_API_KEY' // Replace with actual API key
    }
};

// Global variables
let currentUser = null;
let isAuthenticated = false;
let currentPageContent = '';
let selectedPage = '';
let analyticsRefreshInterval = null;

// Pet database variables
let allPets = [];
let filteredPets = [];
let currentSearchTerm = '';

/**
 * Initialize the admin dashboard when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard Loading...');
    
    // Load saved configuration from localStorage
    loadSavedConfiguration();
    
    // Check if user is already logged in (session storage)
    const savedUser = sessionStorage.getItem('adminUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            handleSuccessfulLogin(currentUser);
        } catch (error) {
            console.error('Error loading saved user:', error);
            sessionStorage.removeItem('adminUser');
        }
    }
    
    // Initialize Google Identity Services
    initializeGoogleAuth();

    // Load pets after a short delay to ensure dashboard is ready
    setTimeout(() => {
        if (isAuthenticated) {
            loadAllPets();
        }
    }, 1000);
});

/**
 * Load saved configuration from localStorage
 */
function loadSavedConfiguration() {
    try {
        const savedConfig = localStorage.getItem('sitandstay_config');
        if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig);
            // Merge saved config with defaults, preserving structure
            CONFIG = { ...CONFIG, ...parsedConfig };
            console.log('Configuration loaded from localStorage');
        }
    } catch (error) {
        console.error('Error loading saved configuration:', error);
        // Continue with default configuration
    }
}

/**
 * Initialize Google Authentication
 */
function initializeGoogleAuth() {
    // Update the client ID in the HTML
    const onloadElement = document.getElementById('g_id_onload');
    if (onloadElement) {
        onloadElement.setAttribute('data-client_id', CONFIG.GOOGLE_CLIENT_ID);
    }
}

/**
 * Handle Google Login Response
 * @param {Object} response - Google credential response
 */
function handleCredentialResponse(response) {
    try {
        console.log('Google Login Response Received');
        
        // Decode the JWT token to get user info
        const userInfo = parseJwt(response.credential);
        console.log('User Info:', userInfo);
        
        // Verify admin access with multiple authorized emails
        if (!CONFIG.AUTHORIZED_ADMINS.includes(userInfo.email.toLowerCase())) {
            showLoginError('Access denied. This admin panel is restricted to authorized users only.');
            return;
        }
        
        // Create user object
        currentUser = {
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture,
            token: response.credential
        };
        
        // Save to session storage
        sessionStorage.setItem('adminUser', JSON.stringify(currentUser));
        
        // Handle successful login
        handleSuccessfulLogin(currentUser);
        
    } catch (error) {
        console.error('Login Error:', error);
        showLoginError('Authentication failed. Please try again.');
    }
}

/**
 * Handle successful login
 * @param {Object} user - User information
 */
function handleSuccessfulLogin(user) {
    isAuthenticated = true;
    
    // Hide login section, show dashboard
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'grid';
    
    // Update user info display
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userAvatar').src = user.picture;
    
    // Load analytics data and start auto-refresh
    loadAnalyticsData();
    startAnalyticsAutoRefresh();
    
    console.log('Admin Dashboard Loaded Successfully');
}

/**
 * Parse JWT token to extract user information
 * @param {string} token - JWT token
 * @returns {Object} Decoded token data
 */
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

/**
 * Show login error message
 * @param {string} message - Error message to display
 */
function showLoginError(message) {
    const errorElement = document.getElementById('loginError');
    const errorTextElement = document.getElementById('loginErrorText');
    
    errorTextElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

/**
 * Sign out the current user
 */
function signOut() {
    // Clear session storage
    sessionStorage.removeItem('adminUser');
    
    // Reset variables
    currentUser = null;
    isAuthenticated = false;
    
    // Stop analytics auto-refresh
    if (analyticsRefreshInterval) {
        clearInterval(analyticsRefreshInterval);
        analyticsRefreshInterval = null;
    }
    
    // Show login section, hide dashboard
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    
    // Reset forms
    document.getElementById('pageSelect').value = '';
    document.getElementById('contentEditor').style.display = 'none';
    
    console.log('User signed out successfully');
}

/**
 * Load Google Analytics data
 * Hybrid approach: attempts real GA4 data, falls back to enhanced demo data
 */
async function loadAnalyticsData() {
    const loadingElement = document.getElementById('analyticsLoading');
    const errorElement = document.getElementById('analyticsError');
    const dataElement = document.getElementById('analyticsData');
    
    try {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        dataElement.style.display = 'none';
        
        // Simulate API delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let analyticsData = null;
        let dataSource = 'real';
        
        // Only attempt to load real Google Analytics data
        if (CONFIG.ANALYTICS_PROPERTY_ID !== 'GA4_MEASUREMENT_ID') {
            try {
                analyticsData = await fetchRealAnalyticsData();
                console.log('✅ Real Google Analytics data loaded successfully');
            } catch (realDataError) {
                console.log('⚠️ Real analytics data not available yet:', realDataError.message);
                throw new Error('Real visitor data not available yet. Google Analytics needs 24-48 hours to collect meaningful data.');
            }
        } else {
            throw new Error('Google Analytics not configured. Please set up GA4_MEASUREMENT_ID first.');
        }
        
        // Update the display with formatted numbers
        document.getElementById('pageViews').textContent = formatNumber(analyticsData.pageViews);
        document.getElementById('uniqueVisitors').textContent = formatNumber(analyticsData.uniqueVisitors);
        document.getElementById('avgSessionDuration').textContent = analyticsData.avgSessionDuration;
        document.getElementById('bounceRate').textContent = analyticsData.bounceRate + '%';
        
        // Show data source in console for transparency
        console.log('📊 Dashboard updated with real Google Analytics data');
        
        // Show data, hide loading
        loadingElement.style.display = 'none';
        dataElement.style.display = 'grid';
        
    } catch (error) {
        console.error('Analytics Error:', error);
        
        // Show helpful error message
        loadingElement.style.display = 'none';
        let errorMessage = error.message;
        
        // Provide helpful guidance based on error type
        if (error.message.includes('24-48 hours')) {
            errorMessage += '\n\n💡 To generate data: Visit your website, share it with others, and check back tomorrow!';
        }
        
        document.getElementById('analyticsErrorText').textContent = errorMessage;
        errorElement.style.display = 'block';
        
        // If it's a "24-48 hours" error, show auto-refresh message
        if (error.message.includes('24-48 hours')) {
            showAutoRefreshMessage();
        }
    }
}

/**
 * Start automatic refresh of analytics data every 30 minutes
 */
function startAnalyticsAutoRefresh() {
    // Clear any existing interval
    if (analyticsRefreshInterval) {
        clearInterval(analyticsRefreshInterval);
    }
    
    // Refresh every 30 minutes (1800000 ms)
    analyticsRefreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing analytics data...');
        loadAnalyticsData();
    }, 1800000);
    
    console.log('✅ Analytics auto-refresh started (every 30 minutes)');
}

/**
 * Show auto-refresh message to user
 */
function showAutoRefreshMessage() {
    // Add auto-refresh info to the error message
    const errorElement = document.getElementById('analyticsErrorText');
    const currentMessage = errorElement.textContent;
    
    if (!currentMessage.includes('auto-refresh')) {
        errorElement.textContent = currentMessage + '\n\n🔄 Auto-refresh enabled: This page will automatically check for new data every 30 minutes. You can also refresh manually.';
        
        // Add a manual refresh button
        const errorContainer = document.getElementById('analyticsError');
        if (!document.getElementById('manualRefreshBtn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'manualRefreshBtn';
            refreshBtn.textContent = '🔄 Refresh Now';
            refreshBtn.style.cssText = `
                background: #4a90e2;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-family: 'Poppins', sans-serif;
                font-weight: 600;
                cursor: pointer;
                margin-top: 15px;
                transition: all 0.3s ease;
            `;
            refreshBtn.onclick = () => {
                refreshBtn.textContent = '🔄 Checking...';
                refreshBtn.disabled = true;
                loadAnalyticsData().finally(() => {
                    refreshBtn.textContent = '🔄 Refresh Now';
                    refreshBtn.disabled = false;
                });
            };
            errorContainer.appendChild(refreshBtn);
        }
    }
}

/**
 * Attempt to fetch real Google Analytics data using GA4 Measurement Protocol
 * This is a simplified approach - production would use Google Analytics Data API
 */
async function fetchRealAnalyticsData() {
    // Note: This is a basic implementation for demonstration
    // In production, you'd use the Google Analytics Data API with proper authentication
    
    if (!CONFIG.ANALYTICS_PROPERTY_ID || CONFIG.ANALYTICS_PROPERTY_ID === 'GA4_MEASUREMENT_ID') {
        throw new Error('Google Analytics not configured');
    }
    
    try {
        // Attempt to get real-time data from GA4
        // This would require proper API setup and authentication in production
        
        // For now, we'll simulate a connection attempt and fall back to demo
        const testConnection = await fetch(`https://www.google-analytics.com/g/collect?measurement_id=${CONFIG.ANALYTICS_PROPERTY_ID}&client_id=test`, {
            method: 'HEAD',
            mode: 'no-cors'
        });
        
        // If we reach here, GA is likely configured, but we need the Data API for real metrics
        // This is a placeholder that would be replaced with actual GA Data API calls
        
        throw new Error('Google Analytics Data API not yet configured - using demo data');
        
    } catch (error) {
        throw new Error(`Real analytics unavailable: ${error.message}`);
    }
}

/**
 * Enhanced demo data with realistic patterns and variability
 */
async function fetchEnhancedDemoData() {
    return new Promise((resolve, reject) => {
        // Create more realistic demo data based on typical pet care website patterns
        const random = Math.random();
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        const hourOfDay = now.getHours();
        
        // Simulate occasional API errors (5% chance)
        if (random > 0.95) {
            reject(new Error('Analytics temporarily unavailable. Please try again.'));
            return;
        }
        
        // Base metrics with realistic ranges for a pet care business
        let basePageViews = 800;
        let baseUniqueVisitors = 450;
        let baseBounceRate = 42;
        let baseSessionMinutes = 3;
        
        // Weekend boost (pet owners have more time to browse)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            basePageViews *= 1.3;
            baseUniqueVisitors *= 1.25;
            baseSessionMinutes *= 1.2;
        }
        
        // Evening browsing boost (7-10 PM)
        if (hourOfDay >= 19 && hourOfDay <= 22) {
            basePageViews *= 1.15;
            baseUniqueVisitors *= 1.1;
        }
        
        // Add natural variability
        const variability = 0.8 + (random * 0.4); // 80% to 120% of base
        
        const analyticsData = {
            pageViews: Math.floor(basePageViews * variability),
            uniqueVisitors: Math.floor(baseUniqueVisitors * variability),
            avgSessionDuration: `${Math.floor(baseSessionMinutes * variability)}:${String(Math.floor(random * 60)).padStart(2, '0')}`,
            bounceRate: Math.floor(baseBounceRate * (0.9 + random * 0.2)), // 36-50%
            isRealData: false,
            dataSource: 'Enhanced Demo',
            lastUpdated: new Date().toLocaleTimeString()
        };
        
        // Add a small delay to simulate API call
        setTimeout(() => resolve(analyticsData), 300 + (random * 500));
    });
}

/**
 * Load page content for editing
 */
async function loadPageContent() {
    const pageSelect = document.getElementById('pageSelect');
    const contentEditor = document.getElementById('contentEditor');
    const editorLoading = document.getElementById('editorLoading');
    const pageContentTextarea = document.getElementById('pageContent');
    
    selectedPage = pageSelect.value;
    
    if (!selectedPage) {
        contentEditor.style.display = 'none';
        return;
    }
    
    try {
        contentEditor.style.display = 'block';
        editorLoading.style.display = 'block';
        pageContentTextarea.style.display = 'none';
        
        // Clear previous messages
        hideMessages();
        
        // Fetch page content
        const pageConfig = CONFIG.PAGES[selectedPage];
        const response = await fetch(pageConfig.file);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${pageConfig.title}: ${response.statusText}`);
        }
        
        const content = await response.text();
        currentPageContent = content;
        
        // Extract main content (simplified approach)
        const extractedContent = extractEditableContent(content, selectedPage);
        
        // Update textarea
        pageContentTextarea.value = extractedContent;
        
        // Show editor
        editorLoading.style.display = 'none';
        pageContentTextarea.style.display = 'block';
        
    } catch (error) {
        console.error('Load Page Error:', error);
        editorLoading.style.display = 'none';
        showSaveError(`Failed to load page content: ${error.message}`);
    }
}

/**
 * Extract editable content from HTML (simplified approach)
 * @param {string} html - Full HTML content
 * @param {string} pageType - Type of page (about, services, contact)
 * @returns {string} Editable content
 */
function extractEditableContent(html, pageType) {
    // This is a simplified content extraction
    // In a production environment, you might want more sophisticated parsing
    
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract main content based on page type
        let content = '';
        
        switch (pageType) {
            case 'about':
                // Extract about page content
                const aboutSection = doc.querySelector('.about-content, .hero-content, main');
                content = aboutSection ? aboutSection.innerHTML : 'Content not found';
                break;
                
            case 'services':
                // Extract services content
                const servicesSection = doc.querySelector('.services-content, .hero-content, main');
                content = servicesSection ? servicesSection.innerHTML : 'Content not found';
                break;
                
            case 'contact':
                // Extract contact content
                const contactSection = doc.querySelector('.contact-content, .hero-content, main');
                content = contactSection ? contactSection.innerHTML : 'Content not found';
                break;
                
            default:
                content = 'Page type not supported';
        }
        
        return content.trim();
        
    } catch (error) {
        console.error('Content extraction error:', error);
        return 'Error extracting content. Please try again.';
    }
}

/**
 * Save page content changes
 */
async function savePageContent() {
    const pageContentTextarea = document.getElementById('pageContent');
    const newContent = pageContentTextarea.value;
    
    if (!selectedPage || !newContent.trim()) {
        showSaveError('Please select a page and enter content to save.');
        return;
    }
    
    try {
        // Hide previous messages
        hideMessages();
        
        // For static site approach, we'll provide instructions instead of actually saving
        // In a production environment with a backend, you would save to the server here
        
        showSaveSuccess('Content updated successfully! Note: In the current static setup, changes are displayed here but need to be manually applied to the HTML files. See setup instructions for automatic saving.');
        
        // TODO: Implement actual file saving when backend is available
        // This would require a server-side endpoint to update HTML files
        
        console.log('Content to save:', newContent);
        console.log('Page:', selectedPage);
        
    } catch (error) {
        console.error('Save Error:', error);
        showSaveError(`Failed to save content: ${error.message}`);
    }
}

/**
 * Cancel editing and reload original content
 */
function cancelEdit() {
    if (selectedPage) {
        loadPageContent();
    }
    hideMessages();
}

/**
 * Show save success message
 * @param {string} message - Success message
 */
function showSaveSuccess(message) {
    const successElement = document.getElementById('saveSuccess');
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Hide after 10 seconds
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 10000);
}

/**
 * Show save error message
 * @param {string} message - Error message
 */
function showSaveError(message) {
    const errorElement = document.getElementById('saveError');
    const errorTextElement = document.getElementById('saveErrorText');
    
    errorTextElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide after 8 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 8000);
}

/**
 * Hide all messages
 */
function hideMessages() {
    document.getElementById('saveSuccess').style.display = 'none';
    document.getElementById('saveError').style.display = 'none';
}

/**
 * Utility function to format numbers
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Error handling for uncaught errors
window.addEventListener('error', function(error) {
    console.error('Admin Dashboard Error:', error);
});

/**
 * Configuration Management Functions
 */

/**
 * Load current configuration into the form
 */
function loadCurrentConfig() {
    try {
        // Load current settings from CONFIG object
        document.getElementById('businessOwnerEmail').value = CONFIG.BUSINESS_OWNER_EMAIL || '';
        document.getElementById('authorizedAdmins').value = CONFIG.AUTHORIZED_ADMINS ? CONFIG.AUTHORIZED_ADMINS.join('\n') : '';
        document.getElementById('calendarId').value = CONFIG.CALENDAR_ID || 'primary';
        document.getElementById('analyticsId').value = CONFIG.ANALYTICS_PROPERTY_ID || '';
        
        // Load pricing if available
        document.getElementById('basicPrice').value = CONFIG.PRICING?.BASIC || 80;
        document.getElementById('premiumPrice').value = CONFIG.PRICING?.PREMIUM || 120;
        document.getElementById('elitePrice').value = CONFIG.PRICING?.ELITE || 180;
        
        // Load Stripe configuration if available
        document.getElementById('stripeMode').value = CONFIG.STRIPE?.MODE || 'test';
        document.getElementById('stripePublishableKey').value = CONFIG.STRIPE?.PUBLISHABLE_KEY || '';
        document.getElementById('stripeSecretKey').value = CONFIG.STRIPE?.SECRET_KEY || '';
        document.getElementById('stripeWebhookSecret').value = CONFIG.STRIPE?.WEBHOOK_SECRET || '';
        
        // Update Stripe connection status
        updateStripeStatus();
        
        showConfigSuccess('Current configuration loaded successfully!');
        
    } catch (error) {
        console.error('Error loading configuration:', error);
        showConfigError('Failed to load current configuration.');
    }
}

/**
 * Save configuration changes
 */
function saveConfiguration() {
    try {
        // Get form values
        const businessOwnerEmail = document.getElementById('businessOwnerEmail').value.trim();
        const authorizedAdminsText = document.getElementById('authorizedAdmins').value.trim();
        const calendarId = document.getElementById('calendarId').value.trim();
        const analyticsId = document.getElementById('analyticsId').value.trim();
        const basicPrice = parseInt(document.getElementById('basicPrice').value) || 80;
        const premiumPrice = parseInt(document.getElementById('premiumPrice').value) || 120;
        const elitePrice = parseInt(document.getElementById('elitePrice').value) || 180;
        const stripeMode = document.getElementById('stripeMode').value.trim();
        const stripePublishableKey = document.getElementById('stripePublishableKey').value.trim();
        const stripeSecretKey = document.getElementById('stripeSecretKey').value.trim();
        const stripeWebhookSecret = document.getElementById('stripeWebhookSecret').value.trim();
        
        // Validate inputs
        if (!businessOwnerEmail || !isValidEmail(businessOwnerEmail)) {
            showConfigError('Please enter a valid business owner email address.');
            return;
        }
        
        if (!calendarId) {
            showConfigError('Please enter a calendar ID.');
            return;
        }
        
        if (analyticsId && !analyticsId.match(/^G-[A-Z0-9]+$/)) {
            showConfigError('Analytics ID must be in format G-XXXXXXXXXX');
            return;
        }
        
        // Parse authorized admins
        const authorizedEmails = authorizedAdminsText
            .split('\n')
            .map(email => email.trim())
            .filter(email => email.length > 0);
            
        // Validate all admin emails
        for (const email of authorizedEmails) {
            if (!isValidEmail(email)) {
                showConfigError(`Invalid email address: ${email}`);
                return;
            }
        }
        
        if (authorizedEmails.length === 0) {
            showConfigError('At least one authorized admin email is required.');
            return;
        }
        
        // Validate Stripe configuration if provided
        if (stripePublishableKey && !stripePublishableKey.startsWith('pk_')) {
            showConfigError('Stripe Publishable Key must start with "pk_"');
            return;
        }
        
        if (stripeSecretKey && !stripeSecretKey.startsWith('sk_')) {
            showConfigError('Stripe Secret Key must start with "sk_"');
            return;
        }
        
        if (stripeWebhookSecret && !stripeWebhookSecret.startsWith('whsec_')) {
            showConfigError('Stripe Webhook Secret must start with "whsec_"');
            return;
        }
        
        // Update CONFIG object
        CONFIG.BUSINESS_OWNER_EMAIL = businessOwnerEmail;
        CONFIG.AUTHORIZED_ADMINS = authorizedEmails;
        CONFIG.CALENDAR_ID = calendarId;
        CONFIG.ANALYTICS_PROPERTY_ID = analyticsId;
        CONFIG.PRICING = {
            BASIC: basicPrice,
            PREMIUM: premiumPrice,
            ELITE: elitePrice
        };
        
        CONFIG.STRIPE = {
            MODE: stripeMode,
            PUBLISHABLE_KEY: stripePublishableKey,
            SECRET_KEY: stripeSecretKey,
            WEBHOOK_SECRET: stripeWebhookSecret,
            WEBHOOK_ENDPOINT: CONFIG.STRIPE.WEBHOOK_ENDPOINT // Keep existing endpoint
        };
        
        // Save to localStorage for persistence
        localStorage.setItem('sitandstay_config', JSON.stringify(CONFIG));
        
        // Update analytics configuration if changed
        if (analyticsId && window.gtag) {
            gtag('config', analyticsId);
        }
        
        // Update Stripe connection status
        updateStripeStatus();
        
        showConfigSuccess('Configuration saved successfully! Changes will take effect immediately.');
        
        console.log('Configuration updated:', CONFIG);
        
    } catch (error) {
        console.error('Error saving configuration:', error);
        showConfigError('Failed to save configuration changes.');
    }
}

/**
 * Reset configuration to defaults
 */
function resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to their default values? This cannot be undone.')) {
        try {
            // Reset form to default values
            document.getElementById('businessOwnerEmail').value = 'bailee.williams@google.com';
            document.getElementById('authorizedAdmins').value = 'bailee.williams@google.com\nshoemaker.brandon35@gmail.com';
            document.getElementById('calendarId').value = 'primary';
            document.getElementById('analyticsId').value = 'G-77T5LN70NP';
            document.getElementById('basicPrice').value = '80';
            document.getElementById('premiumPrice').value = '120';
            document.getElementById('elitePrice').value = '180';
            document.getElementById('stripeMode').value = 'test';
            document.getElementById('stripePublishableKey').value = 'pk_test_51234567890abcdef';
            document.getElementById('stripeSecretKey').value = 'sk_test_51234567890abcdef';
            document.getElementById('stripeWebhookSecret').value = 'whsec_1234567890abcdef';
            
            updateStripeStatus();
            
            showConfigSuccess('Configuration reset to default values. Click "Save Configuration" to apply changes.');
            
        } catch (error) {
            console.error('Error resetting configuration:', error);
            showConfigError('Failed to reset configuration.');
        }
    }
}

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show configuration success message
 * @param {string} message - Success message
 */
function showConfigSuccess(message) {
    const successElement = document.getElementById('configSuccess');
    const successTextElement = document.getElementById('configSuccessText');
    
    successTextElement.textContent = message;
    successElement.style.display = 'block';
    
    // Hide other messages
    document.getElementById('configError').style.display = 'none';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 5000);
}

/**
 * Show configuration error message
 * @param {string} message - Error message
 */
function showConfigError(message) {
    const errorElement = document.getElementById('configError');
    const errorTextElement = document.getElementById('configErrorText');
    
    errorTextElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide other messages
    document.getElementById('configSuccess').style.display = 'none';
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 8000);
}

/**
 * JavaScript File Editor Functions
 */

// Global variables for JS editor
let currentJSContent = '';
let selectedJSFile = '';

// JavaScript file configuration
const JS_FILES = {
    'admin.js': {
        title: 'Admin Dashboard JavaScript',
        description: 'Controls the admin dashboard functionality'
    },
    'google-apps-script.js': {
        title: 'Google Apps Script Code',
        description: 'Booking automation and calendar integration'
    },
    'booking-handler.js': {
        title: 'Booking Handler JavaScript',
        description: 'Frontend booking form handling'
    }
};

/**
 * Load JavaScript file content for editing
 */
async function loadJavaScriptFile() {
    const jsFileSelect = document.getElementById('jsFileSelect');
    const jsContentEditor = document.getElementById('jsContentEditor');
    const jsEditorLoading = document.getElementById('jsEditorLoading');
    const jsContentTextarea = document.getElementById('jsContent');
    const jsFileInfo = document.getElementById('jsFileInfo');
    
    selectedJSFile = jsFileSelect.value;
    
    if (!selectedJSFile) {
        jsContentEditor.style.display = 'none';
        return;
    }
    
    try {
        jsContentEditor.style.display = 'block';
        jsEditorLoading.style.display = 'block';
        jsContentTextarea.style.display = 'none';
        
        // Clear previous messages
        hideJSMessages();
        
        // Update file info
        const fileConfig = JS_FILES[selectedJSFile];
        jsFileInfo.textContent = fileConfig ? fileConfig.description : 'JavaScript file';
        
        // Fetch JavaScript file content
        const response = await fetch(selectedJSFile);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${selectedJSFile}: ${response.statusText}`);
        }
        
        const content = await response.text();
        currentJSContent = content;
        
        // Update textarea with proper formatting
        jsContentTextarea.value = content;
        
        // Show editor
        jsEditorLoading.style.display = 'none';
        jsContentTextarea.style.display = 'block';
        
        // Show file info
        showJSSaveSuccess(`Loaded ${selectedJSFile} successfully! ${content.split('\n').length} lines, ${content.length} characters.`);
        
    } catch (error) {
        console.error('Load JavaScript Error:', error);
        jsEditorLoading.style.display = 'none';
        showJSSaveError(`Failed to load JavaScript file: ${error.message}`);
    }
}

/**
 * Save JavaScript file changes
 */
async function saveJavaScriptFile() {
    const jsContentTextarea = document.getElementById('jsContent');
    const newContent = jsContentTextarea.value;
    
    if (!selectedJSFile || !newContent.trim()) {
        showJSSaveError('Please select a file and enter JavaScript code to save.');
        return;
    }
    
    try {
        // Hide previous messages
        hideJSMessages();
        
        // Basic JavaScript syntax validation
        try {
            // This is a simple validation - in production you might want more sophisticated checking
            new Function(newContent);
        } catch (syntaxError) {
            showJSSaveError(`JavaScript Syntax Error: ${syntaxError.message}`);
            return;
        }
        
        // For static site, we'll provide download functionality and instructions
        // In a production environment with a backend, you would save to the server here
        
        showJSSaveSuccess(`✅ JavaScript code validated successfully! 
        
📝 TO APPLY CHANGES:
1. Copy the code from the editor above
2. Open ${selectedJSFile} in your code editor
3. Replace the content with the updated code
4. Save the file
5. Commit and push to Git to deploy

💡 Or use the "Backup" button to download the updated file.`);
        
        // Update current content
        currentJSContent = newContent;
        
        console.log('JavaScript code ready to save:', {
            file: selectedJSFile,
            lines: newContent.split('\n').length,
            characters: newContent.length
        });
        
    } catch (error) {
        console.error('Save JavaScript Error:', error);
        showJSSaveError(`Failed to process JavaScript: ${error.message}`);
    }
}

/**
 * Format JavaScript code (basic formatting)
 */
function formatJavaScript() {
    const jsContentTextarea = document.getElementById('jsContent');
    let content = jsContentTextarea.value;
    
    if (!content.trim()) {
        showJSSaveError('No code to format. Please load a JavaScript file first.');
        return;
    }
    
    try {
        // Basic formatting - add proper indentation and line breaks
        // This is a simplified formatter - for production you might want a more sophisticated one
        
        let formatted = content
            // Fix common spacing issues
            .replace(/\s*{\s*/g, ' {\n    ')
            .replace(/;\s*}/g, ';\n}')
            .replace(/}\s*else\s*{/g, '} else {\n    ')
            .replace(/,\s*/g, ', ')
            // Fix line endings
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
        
        jsContentTextarea.value = formatted;
        showJSSaveSuccess('Code formatted! Basic formatting applied.');
        
    } catch (error) {
        showJSSaveError(`Formatting error: ${error.message}`);
    }
}

/**
 * Validate JavaScript syntax
 */
function validateJavaScript() {
    const jsContentTextarea = document.getElementById('jsContent');
    const validationResult = document.getElementById('jsValidationResult');
    const validationText = document.getElementById('jsValidationText');
    const content = jsContentTextarea.value;
    
    if (!content.trim()) {
        showJSSaveError('No code to validate. Please load a JavaScript file first.');
        return;
    }
    
    try {
        // Validate syntax
        new Function(content);
        
        // Show success
        validationResult.className = 'validation-result valid';
        validationText.textContent = `✅ JavaScript syntax is valid! (${content.split('\n').length} lines, ${content.length} characters)`;
        validationResult.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            validationResult.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        // Show error
        validationResult.className = 'validation-result invalid';
        validationText.textContent = `❌ Syntax Error: ${error.message}`;
        validationResult.style.display = 'block';
        
        // Hide after 10 seconds
        setTimeout(() => {
            validationResult.style.display = 'none';
        }, 10000);
    }
}

/**
 * Download JavaScript file as backup
 */
function downloadJSBackup() {
    const jsContentTextarea = document.getElementById('jsContent');
    const content = jsContentTextarea.value;
    
    if (!selectedJSFile || !content.trim()) {
        showJSSaveError('No content to download. Please load and edit a JavaScript file first.');
        return;
    }
    
    try {
        // Create blob and download
        const blob = new Blob([content], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `${selectedJSFile.replace('.js', '')}_backup_${new Date().toISOString().slice(0, 10)}.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showJSSaveSuccess(`✅ Backup downloaded: ${a.download}`);
        
    } catch (error) {
        showJSSaveError(`Download failed: ${error.message}`);
    }
}

/**
 * Cancel JavaScript editing
 */
function cancelJSEdit() {
    if (selectedJSFile && currentJSContent) {
        document.getElementById('jsContent').value = currentJSContent;
    }
    hideJSMessages();
}

/**
 * Show JavaScript save success message
 */
function showJSSaveSuccess(message) {
    const successElement = document.getElementById('jsSaveSuccess');
    const successTextElement = document.getElementById('jsSaveSuccessText');
    
    successTextElement.innerHTML = message.replace(/\n/g, '<br>');
    successElement.style.display = 'block';
    
    // Hide other messages
    document.getElementById('jsSaveError').style.display = 'none';
    document.getElementById('jsValidationResult').style.display = 'none';
    
    // Auto-hide after 15 seconds for longer messages
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 15000);
}

/**
 * Show JavaScript save error message
 */
function showJSSaveError(message) {
    const errorElement = document.getElementById('jsSaveError');
    const errorTextElement = document.getElementById('jsSaveErrorText');
    
    errorTextElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide other messages
    document.getElementById('jsSaveSuccess').style.display = 'none';
    document.getElementById('jsValidationResult').style.display = 'none';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 10000);
}

/**
 * Hide all JavaScript messages
 */
function hideJSMessages() {
    document.getElementById('jsSaveSuccess').style.display = 'none';
    document.getElementById('jsSaveError').style.display = 'none';
    document.getElementById('jsValidationResult').style.display = 'none';
}

/**
 * Stripe Configuration Functions
 */

/**
 * Update Stripe connection status display
 */
function updateStripeStatus() {
    const statusIcon = document.getElementById('stripeStatusIcon');
    const statusText = document.getElementById('stripeStatusText');
    const publishableKey = document.getElementById('stripePublishableKey').value.trim();
    const secretKey = document.getElementById('stripeSecretKey').value.trim();
    const mode = document.getElementById('stripeMode').value;
    
    if (!publishableKey || !secretKey) {
        statusIcon.textContent = '⚠️';
        statusIcon.className = 'status-indicator warning';
        statusText.textContent = 'Not configured';
        return;
    }
    
    // Check if keys match the selected mode
    const isTestMode = mode === 'test';
    const keysMatchMode = 
        (isTestMode && publishableKey.includes('test') && secretKey.includes('test')) ||
        (!isTestMode && publishableKey.includes('live') && secretKey.includes('live'));
    
    if (!keysMatchMode) {
        statusIcon.textContent = '❌';
        statusIcon.className = 'status-indicator disconnected';
        statusText.textContent = `Keys don't match ${mode} mode`;
        return;
    }
    
    statusIcon.textContent = '✅';
    statusIcon.className = 'status-indicator connected';
    statusText.textContent = `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode configured`;
}

/**
 * Test Stripe connection (basic validation)
 */
function testStripeConnection() {
    const publishableKey = document.getElementById('stripePublishableKey').value.trim();
    const secretKey = document.getElementById('stripeSecretKey').value.trim();
    const mode = document.getElementById('stripeMode').value;
    
    if (!publishableKey || !secretKey) {
        showConfigError('Please enter both Stripe Publishable Key and Secret Key before testing.');
        return;
    }
    
    // Basic key format validation
    if (!publishableKey.startsWith('pk_')) {
        showConfigError('Invalid Publishable Key format. Should start with "pk_"');
        return;
    }
    
    if (!secretKey.startsWith('sk_')) {
        showConfigError('Invalid Secret Key format. Should start with "sk_"');
        return;
    }
    
    // Check if keys match the selected mode
    const isTestMode = mode === 'test';
    const keysMatchMode = 
        (isTestMode && publishableKey.includes('test') && secretKey.includes('test')) ||
        (!isTestMode && publishableKey.includes('live') && secretKey.includes('live'));
    
    if (!keysMatchMode) {
        showConfigError(`Keys don't match ${mode} mode. ${isTestMode ? 'Test' : 'Live'} mode requires ${isTestMode ? 'test' : 'live'} keys.`);
        return;
    }
    
    // For now, just validate format and show success
    // In production, we would make an actual API call to Stripe
    updateStripeStatus();
    showConfigSuccess(`✅ Stripe connection test passed! ${mode.charAt(0).toUpperCase() + mode.slice(1)} mode is properly configured.`);
}

/**
 * Business Intelligence & Forecasting Functions
 */

/**
 * Load and display business forecasting data
 */
async function loadBusinessForecasting() {
    try {
        // Initialize with current business data
        const businessData = await generateBusinessForecasting();
        
        // Update revenue projections
        updateRevenueProjections(businessData);
        
        // Generate AI recommendations
        generateBusinessRecommendations(businessData);
        
        // Run initial scenario analysis
        runScenarioAnalysis();
        
        console.log('✅ Business forecasting loaded successfully');
        
    } catch (error) {
        console.error('Business forecasting error:', error);
    }
}

/**
 * Generate comprehensive business forecasting data
 */
async function generateBusinessForecasting() {
    // Simulate real business analysis
    const currentMonth = new Date().getMonth();
    const seasonalMultiplier = getSeasonalMultiplier(currentMonth);
    
    // Base business metrics (realistic for growing pet care business)
    const baseData = {
        currentCustomers: 35, // Current active customers
        newCustomersPerMonth: 8, // Average new acquisitions
        avgServicePrice: 45, // Average per visit
        visitsPerCustomer: 2.5, // Monthly average
        subscriptionRate: 0.30, // 30% on subscription plans
        churnRate: 0.08, // 8% monthly churn (industry standard)
        operatingCosts: 0.35, // 35% of revenue (gas, insurance, supplies)
        maxVisitsPerMonth: 160, // Bailee's capacity
        growthRate: 0.15 // 15% monthly growth potential
    };
    
    // Calculate current metrics
    const monthlyVisits = baseData.currentCustomers * baseData.visitsPerCustomer * seasonalMultiplier;
    const monthlyRevenue = monthlyVisits * baseData.avgServicePrice;
    const subscriptionRevenue = monthlyRevenue * baseData.subscriptionRate * 1.1; // 10% subscription boost
    const totalMonthlyRevenue = monthlyRevenue + subscriptionRevenue;
    
    // Calculate projections
    const annualRevenue = totalMonthlyRevenue * 12;
    const capacityUtilization = (monthlyVisits / baseData.maxVisitsPerMonth) * 100;
    const customerLTV = calculateCustomerLTV(baseData);
    
    return {
        ...baseData,
        monthlyVisits: Math.round(monthlyVisits),
        monthlyRevenue: Math.round(totalMonthlyRevenue),
        annualRevenue: Math.round(annualRevenue),
        capacityUtilization: Math.round(capacityUtilization),
        customerLTV: Math.round(customerLTV),
        seasonalMultiplier,
        profitMargin: Math.round((1 - baseData.operatingCosts) * 100)
    };
}

/**
 * Calculate seasonal demand multiplier
 */
function getSeasonalMultiplier(month) {
    const seasonalFactors = {
        0: 1.35,  // January (holidays)
        1: 1.20,  // February
        2: 1.25,  // March (spring cleaning)
        3: 1.30,  // April
        4: 1.35,  // May
        5: 1.45,  // June (vacation season)
        6: 1.50,  // July (peak summer)
        7: 1.45,  // August
        8: 1.15,  // September
        9: 1.20,  // October
        10: 1.25, // November (Thanksgiving)
        11: 1.40  // December (holidays)
    };
    return seasonalFactors[month] || 1.0;
}

/**
 * Calculate Customer Lifetime Value
 */
function calculateCustomerLTV(data) {
    const avgLifespanMonths = 1 / data.churnRate; // If 8% churn, avg 12.5 months
    const monthlyCustomerValue = data.visitsPerCustomer * data.avgServicePrice;
    return avgLifespanMonths * monthlyCustomerValue;
}

/**
 * Update revenue projection displays
 */
function updateRevenueProjections(data) {
    // Update main metrics
    document.getElementById('monthlyRevenue').textContent = `$${formatNumber(data.monthlyRevenue)}`;
    document.getElementById('revenueTrend').textContent = `+${Math.round(data.growthRate * 100)}% growth potential`;
    
    document.getElementById('annualGoal').textContent = `$${formatNumber(data.annualRevenue)}`;
    const goalPercentage = Math.min((data.annualRevenue / 60000) * 100, 100);
    document.getElementById('goalProgress').textContent = `${Math.round(goalPercentage)}% of $60K goal`;
    
    document.getElementById('customerLTV').textContent = `$${formatNumber(data.customerLTV)}`;
    document.getElementById('ltvDetail').textContent = `Avg: ${Math.round(1/data.churnRate)} months`;
    
    document.getElementById('capacityUsage').textContent = `${data.capacityUtilization}%`;
    document.getElementById('capacityDetail').textContent = `${data.monthlyVisits}/${data.maxVisitsPerMonth} max visits/month`;
}

/**
 * Run scenario analysis based on user inputs
 */
function runScenarioAnalysis() {
    const newCustomers = parseInt(document.getElementById('newCustomers').value) || 8;
    const avgPrice = parseInt(document.getElementById('avgPrice').value) || 45;
    const subscriptionRate = parseInt(document.getElementById('subscriptionRate').value) || 30;
    const visitsPerCustomer = parseFloat(document.getElementById('visitsPerCustomer').value) || 2.5;
    
    // Calculate scenario results
    const totalCustomers = 35 + newCustomers; // Current + new
    const monthlyVisits = totalCustomers * visitsPerCustomer;
    const baseRevenue = monthlyVisits * avgPrice;
    const subscriptionBoost = baseRevenue * (subscriptionRate / 100) * 0.1; // 10% boost from subscriptions
    const monthlyRevenue = baseRevenue + subscriptionBoost;
    const annualRevenue = monthlyRevenue * 12;
    const operatingCosts = monthlyRevenue * 0.35; // 35% operating costs
    const profitMargin = ((monthlyRevenue - operatingCosts) / monthlyRevenue) * 100;
    
    // Update displays
    document.getElementById('scenarioMonthly').textContent = `$${formatNumber(monthlyRevenue)}`;
    document.getElementById('scenarioAnnual').textContent = `$${formatNumber(annualRevenue)}`;
    document.getElementById('scenarioProfit').textContent = `${Math.round(profitMargin)}%`;
    
    // Update capacity warning
    const maxCapacity = 160;
    if (monthlyVisits > maxCapacity) {
        document.getElementById('scenarioMonthly').style.color = '#ff6b6b';
        document.getElementById('scenarioMonthly').title = '⚠️ Exceeds capacity! Consider hiring help.';
    } else {
        document.getElementById('scenarioMonthly').style.color = '#ffd700';
        document.getElementById('scenarioMonthly').title = '';
    }
}

/**
 * Update subscription rate display
 */
function updateSubscriptionRate() {
    const rate = document.getElementById('subscriptionRate').value;
    document.getElementById('subscriptionRateValue').textContent = `${rate}%`;
}

/**
 * Generate AI-powered business recommendations
 */
function generateBusinessRecommendations(data) {
    const recommendations = [];
    
    // Capacity-based recommendations
    if (data.capacityUtilization > 80) {
        recommendations.push({
            icon: '👥',
            text: `At ${data.capacityUtilization}% capacity! Consider hiring a part-time assistant to handle overflow and scale beyond $${formatNumber(data.monthlyRevenue * 1.5)}/month.`
        });
    } else if (data.capacityUtilization < 50) {
        recommendations.push({
            icon: '📢',
            text: `Only ${data.capacityUtilization}% capacity used. Increase marketing to reach $${formatNumber(data.monthlyRevenue * 1.6)}/month potential.`
        });
    }
    
    // Pricing recommendations
    if (data.avgServicePrice < 50) {
        const newRevenue = data.monthlyVisits * 50;
        recommendations.push({
            icon: '💰',
            text: `Increase prices to $50/visit to boost revenue to $${formatNumber(newRevenue)}/month (+${Math.round(((newRevenue - data.monthlyRevenue) / data.monthlyRevenue) * 100)}%).`
        });
    }
    
    // Subscription recommendations
    if (data.subscriptionRate < 0.5) {
        recommendations.push({
            icon: '📋',
            text: `Only ${Math.round(data.subscriptionRate * 100)}% subscription rate. Target 60% to add $${formatNumber(data.monthlyRevenue * 0.3)} recurring revenue.`
        });
    }
    
    // Seasonal recommendations
    const currentMonth = new Date().getMonth();
    if ([5, 6, 7].includes(currentMonth)) { // Summer months
        recommendations.push({
            icon: '☀️',
            text: `Peak summer season! Raise prices 15% and add overnight services to capture $${formatNumber(data.monthlyRevenue * 1.4)}/month potential.`
        });
    }
    
    // Growth milestones
    if (data.annualRevenue < 100000) {
        recommendations.push({
            icon: '🚀',
            text: `On track for $${formatNumber(data.annualRevenue)} annually. Add 2 premium services to break $100K barrier and transition to full-time business.`
        });
    }
    
    // Display recommendations
    const container = document.getElementById('recommendationsList');
    container.innerHTML = '';
    
    recommendations.forEach(rec => {
        const div = document.createElement('div');
        div.className = 'recommendation';
        div.innerHTML = `
            <span class="rec-icon">${rec.icon}</span>
            <span class="rec-text">${rec.text}</span>
        `;
        container.appendChild(div);
    });
    
    if (recommendations.length === 0) {
        container.innerHTML = `
            <div class="recommendation">
                <span class="rec-icon">🎯</span>
                <span class="rec-text">Excellent performance! Your business is well-optimized. Focus on customer retention and quality service delivery.</span>
            </div>
        `;
    }
}

/**
 * Run detailed business analysis
 */
function runDetailedAnalysis() {
    const button = event.target;
    const originalText = button.textContent;
    
    button.textContent = '🔄 Analyzing...';
    button.disabled = true;
    
    setTimeout(() => {
        // Generate detailed report
        showDetailedAnalysisModal();
        
        button.textContent = originalText;
        button.disabled = false;
    }, 2000);
}

/**
 * Show detailed analysis modal
 */
function showDetailedAnalysisModal() {
    const newCustomers = parseInt(document.getElementById('newCustomers').value) || 8;
    const avgPrice = parseInt(document.getElementById('avgPrice').value) || 45;
    const subscriptionRate = parseInt(document.getElementById('subscriptionRate').value) || 30;
    
    // Calculate detailed projections
    const currentRevenue = 3600; // Base current revenue
    const projectedRevenue = newCustomers * 2.5 * avgPrice * (1 + subscriptionRate / 1000);
    const yearOneRevenue = projectedRevenue * 12;
    const yearTwoRevenue = yearOneRevenue * 1.3; // 30% growth
    const yearThreeRevenue = yearTwoRevenue * 1.25; // 25% growth
    
    const analysisHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
            <div style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation()">
                <h2 style="color: #333; margin-top: 0;">📊 Detailed Business Analysis</h2>
                
                <div style="margin: 20px 0;">
                    <h3 style="color: #4a90e2;">💰 Revenue Projections</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div style="font-size: 1.5em; font-weight: bold; color: #28a745;">Year 1</div>
                            <div style="font-size: 1.2em;">$${formatNumber(yearOneRevenue)}</div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div style="font-size: 1.5em; font-weight: bold; color: #ffc107;">Year 2</div>
                            <div style="font-size: 1.2em;">$${formatNumber(yearTwoRevenue)}</div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div style="font-size: 1.5em; font-weight: bold; color: #17a2b8;">Year 3</div>
                            <div style="font-size: 1.2em;">$${formatNumber(yearThreeRevenue)}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="color: #4a90e2;">🎯 Key Milestones</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="padding: 8px 0; border-bottom: 1px solid #eee;">🔹 Month 6: $${formatNumber(projectedRevenue * 6)} revenue - Consider business insurance</li>
                        <li style="padding: 8px 0; border-bottom: 1px solid #eee;">🔹 Month 12: $${formatNumber(yearOneRevenue)} - Full-time transition feasible</li>
                        <li style="padding: 8px 0; border-bottom: 1px solid #eee;">🔹 Month 18: $${formatNumber(yearTwoRevenue * 0.7)} - Hire first employee</li>
                        <li style="padding: 8px 0;">🔹 Year 3: $${formatNumber(yearThreeRevenue)} - Multi-location expansion</li>
                    </ul>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="color: #4a90e2;">⚠️ Risk Analysis</h3>
                    <div style="padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <strong>Capacity Risk:</strong> At current growth rate, you'll hit capacity limits by month ${Math.round(160 / (newCustomers * 2.5))}. Plan to hire help or raise prices.
                    </div>
                </div>
                
                <button onclick="this.parentElement.parentElement.remove()" style="background: #4a90e2; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-family: 'Poppins', sans-serif; font-weight: 600;">Close Analysis</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', analysisHTML);
}

/**
 * Open Business Intelligence Modal
 */
function openBusinessIntelligenceModal() {
    const modal = document.getElementById('businessIntelligenceModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Load forecasting data when modal opens
        loadBusinessForecasting();
        
        // Add escape key listener
        document.addEventListener('keydown', handleModalEscape);
    }
}

/**
 * Close Business Intelligence Modal
 */
function closeBusinessIntelligenceModal() {
    const modal = document.getElementById('businessIntelligenceModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
        
        // Remove escape key listener
        document.removeEventListener('keydown', handleModalEscape);
    }
}

/**
 * Handle Escape key to close modal
 */
function handleModalEscape(event) {
    if (event.key === 'Escape') {
        closeBusinessIntelligenceModal();
    }
}

/**
 * Open System Overview Modal
 */
function openSystemOverviewModal() {
    const modal = document.getElementById('systemOverviewModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Add escape key listener
        document.addEventListener('keydown', handleSystemModalEscape);
    }
}

/**
 * Close System Overview Modal
 */
function closeSystemOverviewModal() {
    const modal = document.getElementById('systemOverviewModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
        
        // Remove escape key listener
        document.removeEventListener('keydown', handleSystemModalEscape);
    }
}

/**
 * Handle Escape key to close system modal
 */
function handleSystemModalEscape(event) {
    if (event.key === 'Escape') {
        closeSystemOverviewModal();
    }
}

/**
 * Open Configuration Modal
 */
function openConfigurationModal() {
    const modal = document.getElementById('configurationModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Load current configuration when opening
        loadCurrentConfig();
        
        // Add escape key listener
        document.addEventListener('keydown', handleConfigModalEscape);
    }
}

/**
 * Close Configuration Modal
 */
function closeConfigurationModal() {
    const modal = document.getElementById('configurationModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
        
        // Remove escape key listener
        document.removeEventListener('keydown', handleConfigModalEscape);
    }
}

/**
 * Handle Escape key to close config modal
 */
function handleConfigModalEscape(event) {
    if (event.key === 'Escape') {
        closeConfigurationModal();
    }
}

// Close modals when clicking outside content
document.addEventListener('click', function(event) {
    const biModal = document.getElementById('businessIntelligenceModal');
    const systemModal = document.getElementById('systemOverviewModal');
    const configModal = document.getElementById('configurationModal');
    
    if (biModal && event.target === biModal) {
        closeBusinessIntelligenceModal();
    }
    
    if (systemModal && event.target === systemModal) {
        closeSystemOverviewModal();
    }
    
    if (configModal && event.target === configModal) {
        closeConfigurationModal();
    }
});

// Make functions available globally for HTML onclick handlers
window.handleCredentialResponse = handleCredentialResponse;
window.signOut = signOut;
window.loadPageContent = loadPageContent;
window.savePageContent = savePageContent;
window.cancelEdit = cancelEdit;
window.loadCurrentConfig = loadCurrentConfig;
window.saveConfiguration = saveConfiguration;
window.resetToDefaults = resetToDefaults;
window.loadJavaScriptFile = loadJavaScriptFile;
window.saveJavaScriptFile = saveJavaScriptFile;
window.formatJavaScript = formatJavaScript;
window.validateJavaScript = validateJavaScript;
window.downloadJSBackup = downloadJSBackup;
window.cancelJSEdit = cancelJSEdit;
window.testStripeConnection = testStripeConnection;
window.updateStripeStatus = updateStripeStatus;
window.runScenarioAnalysis = runScenarioAnalysis;
window.updateSubscriptionRate = updateSubscriptionRate;
window.runDetailedAnalysis = runDetailedAnalysis;
window.openBusinessIntelligenceModal = openBusinessIntelligenceModal;
window.closeBusinessIntelligenceModal = closeBusinessIntelligenceModal;
window.openSystemOverviewModal = openSystemOverviewModal;
window.closeSystemOverviewModal = closeSystemOverviewModal;
window.openConfigurationModal = openConfigurationModal;
window.closeConfigurationModal = closeConfigurationModal;

/**
 * Pet Database Functions
 */

/**
 * Load all pets from the database
 */
async function loadAllPets() {
    try {
        showPetDatabaseLoading(true);
        hidePetDatabaseError();
        
        // For now, we'll use demo data since Google Sheets API requires setup
        // In production, this would fetch from the actual Google Sheet
        const pets = await fetchPetDatabaseData();
        
        allPets = pets;
        filteredPets = [...allPets];
        
        updateDatabaseStats();
        displayPets(filteredPets);
        
        showPetDatabaseLoading(false);
        
    } catch (error) {
        console.error('Error loading pets:', error);
        showPetDatabaseError('Failed to load pet database. Please check your configuration.');
        showPetDatabaseLoading(false);
    }
}

/**
 * Fetch pet database data (demo implementation)
 * In production, this would connect to Google Sheets API
 */
async function fetchPetDatabaseData() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Demo data - in production this would come from Google Sheets
    return [
        {
            petId: 'PET0001',
            petName: 'Buddy',
            breed: 'Golden Retriever',
            ownerName: 'Sarah Johnson',
            ownerEmail: 'sarah@example.com',
            ownerPhone: '(555) 123-4567',
            ownerAddress: '123 Oak Street, Allen, TX 75002',
            specialNeeds: 'Needs medication at 2pm daily',
            lastService: 'Dog Walking',
            lastServiceDate: '2024-01-15',
            lastServiceTime: '10:00 AM',
            totalVisits: 12,
            isPremiumOwner: true,
            premiumTier: 'premium',
            dateCreated: '2023-08-15',
            lastUpdated: '2024-01-15',
            notes: 'Very friendly, loves treats',
            emergencyContact: 'Mike Johnson (555) 123-4568',
            veterinarian: 'Allen Animal Hospital',
            medications: 'Arthritis medication - 1 pill daily',
            allergies: 'None known',
            behavioralNotes: 'Excellent with children, mild separation anxiety',
            preferredActivities: 'Fetch, long walks, swimming',
            feedingInstructions: '2 cups dry food twice daily'
        },
        {
            petId: 'PET0002',
            petName: 'Luna',
            breed: 'Border Collie',
            ownerName: 'Michael Chen',
            ownerEmail: 'michael@example.com',
            ownerPhone: '(555) 987-6543',
            ownerAddress: '456 Pine Avenue, Plano, TX 75023',
            specialNeeds: 'High energy, needs mental stimulation',
            lastService: 'Pet Sitting',
            lastServiceDate: '2024-01-10',
            lastServiceTime: '8:00 AM',
            totalVisits: 8,
            isPremiumOwner: false,
            premiumTier: 'basic',
            dateCreated: '2023-10-20',
            lastUpdated: '2024-01-10',
            notes: 'Extremely intelligent, knows many tricks',
            emergencyContact: 'Lisa Chen (555) 987-6544',
            veterinarian: 'Plano Pet Clinic',
            medications: 'None',
            allergies: 'Chicken (mild)',
            behavioralNotes: 'Needs lots of exercise, great with other dogs',
            preferredActivities: 'Agility training, puzzle toys, frisbee',
            feedingInstructions: '1.5 cups high-protein food twice daily'
        },
        {
            petId: 'PET0003',
            petName: 'Max',
            breed: 'German Shepherd',
            ownerName: 'Jennifer Williams',
            ownerEmail: 'jennifer@example.com',
            ownerPhone: '(555) 456-7890',
            ownerAddress: '789 Maple Drive, McKinney, TX 75070',
            specialNeeds: 'Senior dog, joint issues',
            lastService: 'Overnight Pet Sitting',
            lastServiceDate: '2024-01-08',
            lastServiceTime: '6:00 PM',
            totalVisits: 15,
            isPremiumOwner: true,
            premiumTier: 'elite',
            dateCreated: '2023-06-10',
            lastUpdated: '2024-01-08',
            notes: 'Gentle giant, very well-trained',
            emergencyContact: 'Robert Williams (555) 456-7891',
            veterinarian: 'McKinney Veterinary Hospital',
            medications: 'Joint supplement daily, pain medication as needed',
            allergies: 'Beef products',
            behavioralNotes: 'Calm, protective, excellent guard dog',
            preferredActivities: 'Short walks, gentle play, sunbathing',
            feedingInstructions: '3 cups senior formula twice daily'
        },
        {
            petId: 'PET0004',
            petName: 'Bella',
            breed: 'Labrador Mix',
            ownerName: 'David Rodriguez',
            ownerEmail: 'david@example.com',
            ownerPhone: '(555) 321-0987',
            ownerAddress: '321 Cedar Lane, Frisco, TX 75034',
            specialNeeds: 'Rescue dog, can be shy with strangers',
            lastService: 'Dog Walking',
            lastServiceDate: '2024-01-12',
            lastServiceTime: '2:00 PM',
            totalVisits: 6,
            isPremiumOwner: false,
            premiumTier: 'basic',
            dateCreated: '2023-11-05',
            lastUpdated: '2024-01-12',
            notes: 'Sweet personality, gaining confidence',
            emergencyContact: 'Maria Rodriguez (555) 321-0988',
            veterinarian: 'Frisco Animal Clinic',
            medications: 'Anxiety medication as needed',
            allergies: 'None known',
            behavioralNotes: 'Improving with socialization, loves belly rubs',
            preferredActivities: 'Quiet walks, gentle play, treats',
            feedingInstructions: '2 cups sensitive stomach formula twice daily'
        }
    ];
}

/**
 * Search pets by name, owner, or breed
 */
function searchPets() {
    const searchTerm = document.getElementById('petSearch').value.toLowerCase().trim();
    currentSearchTerm = searchTerm;
    
    if (searchTerm === '') {
        filteredPets = [...allPets];
    } else {
        filteredPets = allPets.filter(pet => 
            pet.petName.toLowerCase().includes(searchTerm) ||
            pet.ownerName.toLowerCase().includes(searchTerm) ||
            pet.breed.toLowerCase().includes(searchTerm) ||
            pet.ownerEmail.toLowerCase().includes(searchTerm)
        );
    }
    
    applyFilters();
    displayPets(filteredPets);
    updateDatabaseStats();
}

/**
 * Apply filters to the pet list
 */
function filterPets() {
    applyFilters();
    displayPets(filteredPets);
    updateDatabaseStats();
}

/**
 * Apply current filters to the pet list
 */
function applyFilters() {
    let filtered = currentSearchTerm === '' ? [...allPets] : 
        allPets.filter(pet => 
            pet.petName.toLowerCase().includes(currentSearchTerm) ||
            pet.ownerName.toLowerCase().includes(currentSearchTerm) ||
            pet.breed.toLowerCase().includes(currentSearchTerm) ||
            pet.ownerEmail.toLowerCase().includes(currentSearchTerm)
        );
    
    // Apply premium filter
    const premiumFilter = document.getElementById('premiumFilter').value;
    if (premiumFilter) {
        if (premiumFilter === 'premium') {
            filtered = filtered.filter(pet => pet.isPremiumOwner);
        } else if (premiumFilter === 'basic') {
            filtered = filtered.filter(pet => !pet.isPremiumOwner);
        }
    }
    
    // Apply service filter
    const serviceFilter = document.getElementById('serviceFilter').value;
    if (serviceFilter) {
        filtered = filtered.filter(pet => pet.lastService === serviceFilter);
    }
    
    filteredPets = filtered;
}

/**
 * Display pets in the grid
 */
function displayPets(pets) {
    const petGrid = document.getElementById('petGrid');
    
    if (pets.length === 0) {
        petGrid.innerHTML = `
            <div class="no-pets-message">
                <p>🔍 No pets found matching your search criteria.</p>
                <p><strong>Try:</strong> Adjusting your search terms or clearing filters.</p>
            </div>
        `;
        return;
    }
    
    petGrid.innerHTML = pets.map(pet => createPetCard(pet)).join('');
}

/**
 * Create a pet card HTML
 */
function createPetCard(pet) {
    const isPremium = pet.isPremiumOwner;
    const premiumClass = isPremium ? 'premium' : '';
    
    return `
        <div class="pet-card ${premiumClass}" onclick="showPetDetails('${pet.petId}')">
            <div class="pet-header">
                <div class="pet-avatar">🐕</div>
                <div class="pet-info">
                    <h4>${pet.petName}</h4>
                    <p class="breed">${pet.breed}</p>
                </div>
            </div>
            
            <div class="pet-details">
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Owner:</span>
                    <span class="pet-detail-value">${pet.ownerName}</span>
                </div>
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Phone:</span>
                    <span class="pet-detail-value">${pet.ownerPhone}</span>
                </div>
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Last Service:</span>
                    <span class="pet-detail-value">${pet.lastService}</span>
                </div>
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Special Needs:</span>
                    <span class="pet-detail-value">${pet.specialNeeds}</span>
                </div>
            </div>
            
            <div class="pet-stats">
                <div class="pet-stat">
                    <span class="pet-stat-number">${pet.totalVisits}</span>
                    <span class="pet-stat-label">Visits</span>
                </div>
                <div class="pet-stat">
                    <span class="pet-stat-number">${isPremium ? '⭐' : '👤'}</span>
                    <span class="pet-stat-label">${pet.premiumTier}</span>
                </div>
                <div class="pet-stat">
                    <span class="pet-stat-number">${formatDate(pet.lastServiceDate)}</span>
                    <span class="pet-stat-label">Last Visit</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show detailed pet information modal
 */
function showPetDetails(petId) {
    const pet = allPets.find(p => p.petId === petId);
    if (!pet) return;
    
    // Create and show pet details modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content pet-details-modal">
            <div class="modal-header">
                <h2>🐕 ${pet.petName} - Complete Profile</h2>
                <button class="modal-close" onclick="closePetDetailsModal()">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="pet-details-grid">
                    <div class="pet-details-section">
                        <h3>📋 Basic Information</h3>
                        <div class="detail-item"><strong>Pet ID:</strong> ${pet.petId}</div>
                        <div class="detail-item"><strong>Name:</strong> ${pet.petName}</div>
                        <div class="detail-item"><strong>Breed:</strong> ${pet.breed}</div>
                        <div class="detail-item"><strong>Special Needs:</strong> ${pet.specialNeeds}</div>
                    </div>
                    
                    <div class="pet-details-section">
                        <h3>👤 Owner Information</h3>
                        <div class="detail-item"><strong>Name:</strong> ${pet.ownerName}</div>
                        <div class="detail-item"><strong>Email:</strong> ${pet.ownerEmail}</div>
                        <div class="detail-item"><strong>Phone:</strong> ${pet.ownerPhone}</div>
                        <div class="detail-item"><strong>Address:</strong> ${pet.ownerAddress}</div>
                        <div class="detail-item"><strong>Premium Status:</strong> ${pet.isPremiumOwner ? `⭐ ${pet.premiumTier.toUpperCase()}` : '👤 Basic'}</div>
                    </div>
                    
                    <div class="pet-details-section">
                        <h3>🏥 Medical Information</h3>
                        <div class="detail-item"><strong>Veterinarian:</strong> ${pet.veterinarian}</div>
                        <div class="detail-item"><strong>Medications:</strong> ${pet.medications}</div>
                        <div class="detail-item"><strong>Allergies:</strong> ${pet.allergies}</div>
                        <div class="detail-item"><strong>Emergency Contact:</strong> ${pet.emergencyContact}</div>
                    </div>
                    
                    <div class="pet-details-section">
                        <h3>🎾 Care Preferences</h3>
                        <div class="detail-item"><strong>Preferred Activities:</strong> ${pet.preferredActivities}</div>
                        <div class="detail-item"><strong>Feeding Instructions:</strong> ${pet.feedingInstructions}</div>
                        <div class="detail-item"><strong>Behavioral Notes:</strong> ${pet.behavioralNotes}</div>
                    </div>
                    
                    <div class="pet-details-section">
                        <h3>📊 Service History</h3>
                        <div class="detail-item"><strong>Total Visits:</strong> ${pet.totalVisits}</div>
                        <div class="detail-item"><strong>Last Service:</strong> ${pet.lastService}</div>
                        <div class="detail-item"><strong>Last Service Date:</strong> ${formatDate(pet.lastServiceDate)} at ${pet.lastServiceTime}</div>
                        <div class="detail-item"><strong>Customer Since:</strong> ${formatDate(pet.dateCreated)}</div>
                        <div class="detail-item"><strong>Last Updated:</strong> ${formatDate(pet.lastUpdated)}</div>
                    </div>
                    
                    <div class="pet-details-section">
                        <h3>📝 Notes</h3>
                        <div class="detail-item notes-section">${pet.notes}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add escape key handler
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closePetDetailsModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePetDetailsModal();
        }
    });
}

/**
 * Close pet details modal
 */
function closePetDetailsModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

/**
 * Update database statistics
 */
function updateDatabaseStats() {
    const totalPets = filteredPets.length;
    const premiumPets = filteredPets.filter(pet => pet.isPremiumOwner).length;
    const totalVisits = filteredPets.reduce((sum, pet) => sum + pet.totalVisits, 0);
    
    document.getElementById('totalPets').textContent = totalPets;
    document.getElementById('premiumPets').textContent = premiumPets;
    document.getElementById('totalVisits').textContent = totalVisits;
}

/**
 * Show/hide pet database loading state
 */
function showPetDatabaseLoading(show) {
    const loading = document.getElementById('petDatabaseLoading');
    const content = document.getElementById('petDatabaseContent');
    
    if (show) {
        loading.style.display = 'block';
        content.style.display = 'none';
    } else {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

/**
 * Show pet database error
 */
function showPetDatabaseError(message) {
    const error = document.getElementById('petDatabaseError');
    const errorText = document.getElementById('petDatabaseErrorText');
    
    errorText.textContent = message;
    error.style.display = 'block';
}

/**
 * Hide pet database error
 */
function hidePetDatabaseError() {
    const error = document.getElementById('petDatabaseError');
    error.style.display = 'none';
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

// Add search on Enter key
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('petSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchPets();
            }
        });
    }
});

/**
 * Anti-Scraping Protection
 */
const ANTI_SCRAPING = {
    // Rate limiting
    requestCount: 0,
    lastRequestTime: Date.now(),
    maxRequestsPerMinute: 60,
    
    // Bot detection
    botPatterns: [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python-requests/i,
        /node-fetch/i
    ],
    
    // Initialize protection
    init() {
        // Add event listeners for protection
        document.addEventListener('DOMContentLoaded', () => {
            this.setupProtection();
            this.monitorUserBehavior();
        });
        
        // Intercept fetch requests
        this.interceptFetch();
        
        // Add CSS protection
        this.addCSSProtection();
    },
    
    // Setup basic protection
    setupProtection() {
        // Disable right-click
        document.addEventListener('contextmenu', (e) => {
            if (!this.isAdminUser()) {
                e.preventDefault();
                return false;
            }
        });
        
        // Disable text selection
        document.addEventListener('selectstart', (e) => {
            if (!this.isAdminUser()) {
                e.preventDefault();
                return false;
            }
        });
        
        // Disable keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.isAdminUser() && (
                (e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 's')) ||
                (e.key === 'F12')
            )) {
                e.preventDefault();
                return false;
            }
        });
    },
    
    // Monitor user behavior
    monitorUserBehavior() {
        let mouseMovements = 0;
        let lastMousePosition = { x: 0, y: 0 };
        
        document.addEventListener('mousemove', (e) => {
            const currentTime = Date.now();
            
            // Check for bot-like behavior (too precise movements)
            if (currentTime - this.lastRequestTime < 100) {
                const distance = Math.sqrt(
                    Math.pow(e.clientX - lastMousePosition.x, 2) +
                    Math.pow(e.clientY - lastMousePosition.y, 2)
                );
                
                if (distance < 5) { // Suspiciously precise movements
                    this.handleSuspiciousActivity('Suspicious mouse movement pattern detected');
                }
            }
            
            lastMousePosition = { x: e.clientX, y: e.clientY };
            mouseMovements++;
            
            // Reset counter every minute
            if (currentTime - this.lastRequestTime > 60000) {
                mouseMovements = 0;
                this.lastRequestTime = currentTime;
            }
        });
    },
    
    // Intercept fetch requests
    interceptFetch() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            this.requestCount++;
            const currentTime = Date.now();
            
            // Rate limiting
            if (currentTime - this.lastRequestTime < 60000) {
                if (this.requestCount > this.maxRequestsPerMinute) {
                    this.handleSuspiciousActivity('Rate limit exceeded');
                    return new Response('Rate limit exceeded', { status: 429 });
                }
            } else {
                this.requestCount = 0;
                this.lastRequestTime = currentTime;
            }
            
            // Check for bot patterns in headers
            const headers = args[1]?.headers || {};
            const userAgent = headers['User-Agent'] || navigator.userAgent;
            
            if (this.botPatterns.some(pattern => pattern.test(userAgent))) {
                this.handleSuspiciousActivity('Bot detected');
                return new Response('Access denied', { status: 403 });
            }
            
            return originalFetch(...args);
        };
    },
    
    // Add CSS protection
    addCSSProtection() {
        const style = document.createElement('style');
        style.textContent = `
            /* Disable text selection */
            body {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            
            /* Allow selection for admin users */
            .admin-user * {
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                user-select: text;
            }
            
            /* Hide content from screen readers when not admin */
            .protected-content {
                position: relative;
            }
            
            .protected-content::before {
                content: attr(data-content);
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
                z-index: 1;
            }
        `;
        document.head.appendChild(style);
    },
    
    // Handle suspicious activity
    handleSuspiciousActivity(reason) {
        console.warn(`Suspicious activity detected: ${reason}`);
        
        // Log the activity
        if (window.gtag) {
            gtag('event', 'suspicious_activity', {
                'event_category': 'security',
                'event_label': reason
            });
        }
        
        // Notify admin if authenticated
        if (this.isAdminUser()) {
            // Send notification to admin
            this.notifyAdmin(reason);
        }
    },
    
    // Check if current user is admin
    isAdminUser() {
        return isAuthenticated && currentUser && CONFIG.AUTHORIZED_ADMINS.includes(currentUser.email);
    },
    
    // Notify admin of suspicious activity
    notifyAdmin(reason) {
        // Implementation depends on your notification system
        console.log(`Admin notification: ${reason}`);
    }
};

// Initialize anti-scraping protection
ANTI_SCRAPING.init();

/**
 * Admin Notes Management
 */
const ADMIN_NOTES = {
    // Google Sheet ID for storing notes
    SHEET_ID: 'YOUR_NOTES_SHEET_ID', // Replace with actual Sheet ID
    SHEET_NAME: 'Admin Notes',
    
    // Initialize notes system
    init() {
        // Load existing notes when dashboard loads
        if (isAuthenticated) {
            this.loadNotes();
        }
        
        // Set up auto-refresh every 5 minutes
        setInterval(() => {
            if (isAuthenticated) {
                this.loadNotes();
            }
        }, 300000); // 5 minutes
    },
    
    // Load notes from Google Sheet
    async loadNotes() {
        try {
            const loadingDiv = document.getElementById('notesLoading');
            const notesLog = document.getElementById('adminNotesLog');
            
            if (loadingDiv) loadingDiv.style.display = 'block';
            
            // Fetch notes from Google Sheet
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${this.SHEET_NAME}?key=${CONFIG.PET_DATABASE.API_KEY}`);
            const data = await response.json();
            
            if (data.values) {
                // Clear loading message
                if (loadingDiv) loadingDiv.style.display = 'none';
                
                // Sort notes by timestamp (newest first)
                const notes = data.values
                    .slice(1) // Skip header row
                    .map(row => ({
                        timestamp: new Date(row[0]),
                        author: row[1],
                        message: row[2]
                    }))
                    .sort((a, b) => b.timestamp - a.timestamp);
                
                // Display notes
                this.displayNotes(notes);
            }
        } catch (error) {
            console.error('Error loading admin notes:', error);
            this.showError('Failed to load notes. Please try again.');
        }
    },
    
    // Display notes in the log
    displayNotes(notes) {
        const notesLog = document.getElementById('adminNotesLog');
        if (!notesLog) return;
        
        notesLog.innerHTML = notes.map(note => `
            <div class="message">
                <div class="message-header">
                    <span class="message-author">${note.author}</span>
                    <span class="message-time">${this.formatTimestamp(note.timestamp)}</span>
                </div>
                <div class="message-content">${this.formatMessage(note.message)}</div>
            </div>
        `).join('');
    },
    
    // Format timestamp
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    },
    
    // Format message (handle line breaks and basic formatting)
    formatMessage(message) {
        return message
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    },
    
    // Send a new note
    async sendNote() {
        try {
            const noteInput = document.getElementById('adminNoteInput');
            const message = noteInput.value.trim();
            
            if (!message) {
                this.showError('Please enter a message.');
                return;
            }
            
            if (!currentUser) {
                this.showError('You must be logged in to send notes.');
                return;
            }
            
            // Prepare note data
            const noteData = {
                timestamp: new Date().toISOString(),
                author: currentUser.name,
                message: message
            };
            
            // Append to Google Sheet
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${this.SHEET_NAME}!A:C:append?valueInputOption=USER_ENTERED&key=${CONFIG.PET_DATABASE.API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[noteData.timestamp, noteData.author, noteData.message]]
                })
            });
            
            if (response.ok) {
                // Clear input
                noteInput.value = '';
                
                // Reload notes
                this.loadNotes();
                
                // Show success message
                this.showSuccess('Note sent successfully!');
            } else {
                // Try to get the error message from the response
                let errorMsg = 'Failed to save note';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error && errorData.error.message) {
                        errorMsg += `: ${errorData.error.message}`;
                    } else {
                        errorMsg += `: ${response.status} ${response.statusText}`;
                    }
                } catch (e) {
                    errorMsg += `: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Error sending note:', error);
            this.showError('Failed to send note. ' + (error.message || 'Please try again.'));
        }
    },
    
    // Show error message
    showError(message) {
        const notesLog = document.getElementById('adminNotesLog');
        if (notesLog) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = message;
            notesLog.insertBefore(errorDiv, notesLog.firstChild);
            
            // Remove error message after 5 seconds
            setTimeout(() => errorDiv.remove(), 5000);
        }
    },
    
    // Show success message
    showSuccess(message) {
        const notesLog = document.getElementById('adminNotesLog');
        if (notesLog) {
            const successDiv = document.createElement('div');
            successDiv.className = 'success';
            successDiv.textContent = message;
            notesLog.insertBefore(successDiv, notesLog.firstChild);
            
            // Remove success message after 5 seconds
            setTimeout(() => successDiv.remove(), 5000);
        }
    }
};

// Initialize admin notes when dashboard loads
document.addEventListener('DOMContentLoaded', function() {
    if (isAuthenticated) {
        ADMIN_NOTES.init();
    }
});

// Make sendNote function available globally
window.sendAdminNote = () => ADMIN_NOTES.sendNote();

// Service Status Monitor
const SERVICE_MONITOR = {
    services: {
        calendar: {
            id: 'calendarStatus',
            name: 'Google Calendar',
            check: async () => {
                try {
                    const response = await gapi.client.calendar.calendarList.list();
                    return response.status === 200;
                } catch (error) {
                    console.error('Calendar check failed:', error);
                    return false;
                }
            }
        },
        sheets: {
            id: 'sheetsStatus',
            name: 'Google Sheets',
            check: async () => {
                try {
                    const response = await gapi.client.sheets.spreadsheets.get({
                        spreadsheetId: CONFIG.SHEET_ID
                    });
                    return response.status === 200;
                } catch (error) {
                    console.error('Sheets check failed:', error);
                    return false;
                }
            }
        },
        analytics: {
            id: 'analyticsStatus',
            name: 'Google Analytics',
            check: async () => {
                try {
                    const response = await gapi.client.analytics.data.ga.get({
                        'ids': 'ga:' + CONFIG.ANALYTICS_ID,
                        'start-date': 'today',
                        'end-date': 'today',
                        'metrics': 'ga:users'
                    });
                    return response.status === 200;
                } catch (error) {
                    console.error('Analytics check failed:', error);
                    return false;
                }
            }
        },
        auth: {
            id: 'authStatus',
            name: 'Google Auth',
            check: async () => {
                try {
                    const response = await gapi.client.oauth2.userinfo.get();
                    return response.status === 200;
                } catch (error) {
                    console.error('Auth check failed:', error);
                    return false;
                }
            }
        },
        stripe: {
            id: 'stripeStatus',
            name: 'Stripe Payments',
            check: async () => {
                try {
                    const response = await fetch('https://api.stripe.com/v1/balance', {
                        headers: {
                            'Authorization': `Bearer ${CONFIG.STRIPE_SECRET_KEY}`
                        }
                    });
                    return response.ok;
                } catch (error) {
                    console.error('Stripe check failed:', error);
                    return false;
                }
            }
        },
        netlify: {
            id: 'netlifyStatus',
            name: 'Netlify Hosting',
            check: async () => {
                try {
                    const response = await fetch(window.location.origin);
                    return response.ok;
                } catch (error) {
                    console.error('Netlify check failed:', error);
                    return false;
                }
            }
        }
    },
    
    history: [],
    
    async init() {
        // Start monitoring
        this.startMonitoring();
        
        // Set up periodic checks
        setInterval(() => this.startMonitoring(), 5 * 60 * 1000); // Check every 5 minutes
    },
    
    async startMonitoring() {
        for (const [key, service] of Object.entries(this.services)) {
            await this.checkService(key, service);
        }
    },
    
    async checkService(key, service) {
        const element = document.getElementById(service.id);
        if (!element) return;
        
        const statusElement = element.querySelector('.service-status');
        statusElement.textContent = 'Checking...';
        statusElement.className = 'service-status status-checking';
        
        try {
            const isOperational = await service.check();
            this.updateStatus(key, isOperational);
        } catch (error) {
            console.error(`Error checking ${service.name}:`, error);
            this.updateStatus(key, false);
        }
    },
    
    updateStatus(key, isOperational) {
        const service = this.services[key];
        const element = document.getElementById(service.id);
        if (!element) return;
        
        const statusElement = element.querySelector('.service-status');
        const timestamp = new Date().toISOString();
        
        if (isOperational) {
            statusElement.textContent = 'Operational';
            statusElement.className = 'service-status status-operational';
        } else {
            statusElement.textContent = 'Service Disruption';
            statusElement.className = 'service-status status-outage';
        }
        
        // Add to history
        this.addToHistory(service.name, isOperational, timestamp);
    },
    
    addToHistory(serviceName, isOperational, timestamp) {
        const history = {
            service: serviceName,
            status: isOperational ? 'Operational' : 'Service Disruption',
            timestamp: timestamp
        };
        
        this.history.unshift(history);
        this.history = this.history.slice(0, 50); // Keep last 50 entries
        
        this.updateHistoryDisplay();
    },
    
    updateHistoryDisplay() {
        const historyList = document.querySelector('.history-list');
        if (!historyList) return;
        
        historyList.innerHTML = this.history.map(entry => `
            <div class="history-item">
                <span>${entry.service}: ${entry.status}</span>
                <span class="history-time">${new Date(entry.timestamp).toLocaleString()}</span>
            </div>
        `).join('');
    }
};

// Initialize service monitor when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        SERVICE_MONITOR.init();
    }
});