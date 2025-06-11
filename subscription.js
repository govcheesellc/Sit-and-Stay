/**
 * Sit and Stay Pet Care - Subscription Management JavaScript
 * Handles Google Login for Premium Tiers and Subscriber Management  
 * Created: June 11, 2025
 */

// Configuration - UPDATE THESE WITH ACTUAL VALUES
const SUBSCRIPTION_CONFIG = {
    // Replace with your Google Client ID from Google Cloud Console
    GOOGLE_CLIENT_ID: '323272466004-n3vqvtmb0qumc92ngackscce8d4pjo5h.apps.googleusercontent.com',
    
    // Google Sheet ID for Premium Subscribers tracking
    PREMIUM_SUBSCRIBERS_SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
    
    // Business owner email
    BUSINESS_OWNER_EMAIL: 'bailee.williams@google.com',
    
    // Subscription tier pricing
    TIERS: {
        basic: {
            name: 'Basic Plan',
            price: 80,
            visits: 4,
            features: ['Standard booking', 'Email confirmations', 'Basic updates']
        },
        premium: {
            name: 'Premium Plan', 
            price: 120,
            visits: 6,
            discount: 10,
            features: ['Priority booking', '10% discount', '24/7 support', 'Photo updates']
        },
        elite: {
            name: 'Elite Plan',
            price: 180,
            visits: 'unlimited',
            discount: 15,
            features: ['Unlimited visits', 'Overnight stay included', 'Dedicated specialist']
        }
    }
};

// Global variables
let currentSubscriptionUser = null;
let isSubscriptionAuthenticated = false;
let userSubscriptionTier = null;

/**
 * Initialize subscription page when DOM loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Subscription Page Loading...');
    
    // Check if user is already logged in (session storage)
    const savedUser = sessionStorage.getItem('subscriptionUser');
    if (savedUser) {
        try {
            currentSubscriptionUser = JSON.parse(savedUser);
            handleSuccessfulSubscriptionLogin(currentSubscriptionUser);
        } catch (error) {
            console.error('Error loading saved subscription user:', error);
            sessionStorage.removeItem('subscriptionUser');
        }
    }
    
    // Initialize Google Identity Services
    initializeSubscriptionAuth();
    
    // Load user's current subscription status
    loadUserSubscriptionStatus();
});

/**
 * Initialize Google Authentication for subscriptions
 */
function initializeSubscriptionAuth() {
    // Update the client ID in the HTML
    const onloadElement = document.getElementById('g_id_onload');
    if (onloadElement) {
        onloadElement.setAttribute('data-client_id', SUBSCRIPTION_CONFIG.GOOGLE_CLIENT_ID);
    }
}

/**
 * Handle Google Login Response for subscriptions
 * @param {Object} response - Google credential response
 */
function handleCredentialResponse(response) {
    try {
        console.log('Subscription Google Login Response Received');
        
        // Decode the JWT token to get user info
        const userInfo = parseJwt(response.credential);
        console.log('Subscription User Info:', userInfo);
        
        // Create user object
        currentSubscriptionUser = {
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture,
            token: response.credential,
            loginTime: new Date().toISOString()
        };
        
        // Save to session storage
        sessionStorage.setItem('subscriptionUser', JSON.stringify(currentSubscriptionUser));
        
        // Handle successful login
        handleSuccessfulSubscriptionLogin(currentSubscriptionUser);
        
        // Add user to premium subscribers sheet
        addToPremiumSubscribers(currentSubscriptionUser);
        
    } catch (error) {
        console.error('Subscription Login Error:', error);
        showSubscriptionError('Authentication failed. Please try again.');
    }
}

/**
 * Handle successful subscription login
 * @param {Object} user - User information
 */
function handleSuccessfulSubscriptionLogin(user) {
    isSubscriptionAuthenticated = true;
    
    // Update user status display
    const userStatus = document.getElementById('userStatus');
    const userStatusTitle = document.getElementById('userStatusTitle');
    const userStatusMessage = document.getElementById('userStatusMessage');
    
    userStatusTitle.textContent = `Welcome, ${user.name}!`;
    userStatusMessage.textContent = `Logged in as ${user.email} - You now have access to premium subscription benefits.`;
    userStatus.style.display = 'block';
    userStatus.classList.add('premium');
    
    // Hide login section, enable premium subscription
    const loginSection = document.getElementById('premiumLoginSection');
    const premiumBtn = document.getElementById('premiumSubscribeBtn');
    
    if (loginSection) {
        loginSection.style.display = 'none';
    }
    
    if (premiumBtn) {
        premiumBtn.disabled = false;
        premiumBtn.textContent = 'Choose Premium Plan';
        premiumBtn.classList.add('premium');
    }
    
    console.log('Subscription authentication successful');
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
 * Add user to premium subscribers Google Sheet
 * @param {Object} user - User information
 */
async function addToPremiumSubscribers(user) {
    try {
        // In a production environment, this would make an API call to Google Sheets
        // For now, we'll simulate the process
        
        console.log('Adding user to premium subscribers:', user.email);
        
        // TODO: Replace with actual Google Sheets API call
        // This would require server-side implementation or Google Apps Script
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demonstration, we'll use localStorage to track premium users
        const premiumUsers = JSON.parse(localStorage.getItem('premiumSubscribers') || '[]');
        
        // Check if user already exists
        const existingUser = premiumUsers.find(u => u.email === user.email);
        if (!existingUser) {
            premiumUsers.push({
                name: user.name,
                email: user.email,
                signupDate: new Date().toISOString(),
                tier: 'premium',
                status: 'active'
            });
            localStorage.setItem('premiumSubscribers', JSON.stringify(premiumUsers));
        }
        
        console.log('User added to premium subscribers successfully');
        
    } catch (error) {
        console.error('Error adding user to premium subscribers:', error);
        // Don't show error to user as this is background operation
    }
}

/**
 * Load user's current subscription status
 */
function loadUserSubscriptionStatus() {
    try {
        if (currentSubscriptionUser) {
            const premiumUsers = JSON.parse(localStorage.getItem('premiumSubscribers') || '[]');
            const userSubscription = premiumUsers.find(u => u.email === currentSubscriptionUser.email);
            
            if (userSubscription) {
                userSubscriptionTier = userSubscription.tier;
                console.log('User subscription tier:', userSubscriptionTier);
            }
        }
    } catch (error) {
        console.error('Error loading subscription status:', error);
    }
}

/**
 * Sign out the current subscription user
 */
function signOut() {
    // Clear session storage
    sessionStorage.removeItem('subscriptionUser');
    
    // Reset variables
    currentSubscriptionUser = null;
    isSubscriptionAuthenticated = false;
    userSubscriptionTier = null;
    
    // Hide user status
    const userStatus = document.getElementById('userStatus');
    userStatus.style.display = 'none';
    userStatus.classList.remove('premium');
    
    // Show login section, disable premium subscription
    const loginSection = document.getElementById('premiumLoginSection');
    const premiumBtn = document.getElementById('premiumSubscribeBtn');
    
    if (loginSection) {
        loginSection.style.display = 'block';
    }
    
    if (premiumBtn) {
        premiumBtn.disabled = true;
        premiumBtn.textContent = 'Sign In for Premium';
        premiumBtn.classList.remove('premium');
    }
    
    console.log('User signed out successfully');
}

/**
 * Subscribe to Basic plan
 */
function subscribeBasic() {
    const tier = SUBSCRIPTION_CONFIG.TIERS.basic;
    
    // Redirect to contact with subscription details
    const message = `Hi! I'm interested in subscribing to the ${tier.name} (${tier.visits} visits per month for $${tier.price}/month). Please contact me to set up my subscription.`;
    const contactUrl = `contact.html?subject=Basic Subscription&message=${encodeURIComponent(message)}`;
    
    window.location.href = contactUrl;
}

/**
 * Subscribe to Premium plan
 */
function subscribePremium() {
    if (!isSubscriptionAuthenticated) {
        showSubscriptionError('Please sign in with Google first to access premium features.');
        return;
    }
    
    const tier = SUBSCRIPTION_CONFIG.TIERS.premium;
    
    // Add user email to the message for premium tracking
    const message = `Hi! I'm interested in subscribing to the ${tier.name} (${tier.visits} visits per month for $${tier.price}/month with ${tier.discount}% discount). My Google account is: ${currentSubscriptionUser.email}. Please contact me to set up my premium subscription.`;
    const contactUrl = `contact.html?subject=Premium Subscription&message=${encodeURIComponent(message)}`;
    
    window.location.href = contactUrl;
}

/**
 * Subscribe to Elite plan
 */
function subscribeElite() {
    const tier = SUBSCRIPTION_CONFIG.TIERS.elite;
    
    // Elite tier doesn't require login but benefits from it
    let message = `Hi! I'm interested in subscribing to the ${tier.name} (${tier.visits} visits + 1 overnight stay for $${tier.price}/month with ${tier.discount}% discount).`;
    
    if (isSubscriptionAuthenticated) {
        message += ` My Google account is: ${currentSubscriptionUser.email}.`;
    }
    
    message += ` Please contact me to set up my elite subscription.`;
    
    const contactUrl = `contact.html?subject=Elite Subscription&message=${encodeURIComponent(message)}`;
    
    window.location.href = contactUrl;
}

/**
 * Show subscription error message
 * @param {string} message - Error message to display
 */
function showSubscriptionError(message) {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid #f5c6cb;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 300px;
    `;
    errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
        }
    }, 5000);
}

/**
 * Get user's current subscription benefits for booking form
 * This function will be used by the booking form to apply discounts
 * @returns {Object} User subscription benefits
 */
function getUserSubscriptionBenefits() {
    if (!isSubscriptionAuthenticated || !userSubscriptionTier) {
        return {
            isSubscriber: false,
            tier: null,
            discount: 0,
            priority: false
        };
    }
    
    const tier = SUBSCRIPTION_CONFIG.TIERS[userSubscriptionTier];
    return {
        isSubscriber: true,
        tier: userSubscriptionTier,
        discount: tier.discount || 0,
        priority: userSubscriptionTier === 'premium' || userSubscriptionTier === 'elite',
        email: currentSubscriptionUser.email
    };
}

/**
 * Pre-fill booking form with subscription user information
 * This function can be called from the booking page
 */
function prefillBookingForm() {
    if (isSubscriptionAuthenticated && currentSubscriptionUser) {
        // This would be called from booking.html to prefill user information
        return {
            name: currentSubscriptionUser.name,
            email: currentSubscriptionUser.email,
            isSubscriber: true,
            subscriptionTier: userSubscriptionTier
        };
    }
    return null;
}

// Error handling for uncaught errors
window.addEventListener('error', function(error) {
    console.error('Subscription Page Error:', error);
});

// Make functions available globally for HTML onclick handlers
window.handleCredentialResponse = handleCredentialResponse;
window.signOut = signOut;
window.subscribeBasic = subscribeBasic;
window.subscribePremium = subscribePremium;
window.subscribeElite = subscribeElite;
window.getUserSubscriptionBenefits = getUserSubscriptionBenefits;
window.prefillBookingForm = prefillBookingForm; 