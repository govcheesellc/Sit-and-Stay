/**
 * Sit and Stay Pet Care - Subscription Management JavaScript
 * Handles Google Login for Premium Tiers and Subscriber Management  
 * Created: June 11, 2025
 */

// Load configuration from admin system or use defaults
const ADMIN_CONFIG = JSON.parse(localStorage.getItem('sitandstay_config')) || {};

// Configuration - dynamically loaded from admin system
const SUBSCRIPTION_CONFIG = {
    // Replace with your Google Client ID from Google Cloud Console
    GOOGLE_CLIENT_ID: ADMIN_CONFIG.GOOGLE_CLIENT_ID || '323272466004-n3vqvtmb0qumc92ngackscce8d4pjo5h.apps.googleusercontent.com',
    
    // Google Sheet ID for Premium Subscribers tracking
    PREMIUM_SUBSCRIBERS_SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
    
    // Business owner email
    BUSINESS_OWNER_EMAIL: ADMIN_CONFIG.BUSINESS_OWNER_EMAIL || 'bailee.williams@google.com',
    
    // Stripe configuration
    STRIPE: {
        PUBLISHABLE_KEY: ADMIN_CONFIG.STRIPE?.PUBLISHABLE_KEY || 'pk_test_51234567890abcdef',
        MODE: ADMIN_CONFIG.STRIPE?.MODE || 'test'
    },
    
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

// Stripe variables
let stripe = null;
let elements = null;
let paymentElement = null;
let selectedPaymentMethod = null;
let currentSubscriptionPlan = null;

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
    
    // Initialize Stripe
    initializeStripe();
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
    
    // Set current subscription plan for payment processing
    currentSubscriptionPlan = {
        tier: 'basic',
        name: tier.name,
        price: tier.price,
        visits: tier.visits,
        features: tier.features
    };
    
    // Scroll to payment section
    const paymentSection = document.querySelector('.payment-section');
    if (paymentSection) {
        paymentSection.scrollIntoView({ behavior: 'smooth' });
        
        // Highlight the section briefly
        paymentSection.style.background = '#e3f2fd';
        setTimeout(() => {
            paymentSection.style.background = '#f8f9fa';
        }, 2000);
    }
    
    // Show plan selection message
    showPaymentMessage(`Selected ${tier.name} - $${tier.price}/month. Choose your payment method below.`, 'success');
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
    
    // Set current subscription plan for payment processing
    currentSubscriptionPlan = {
        tier: 'premium',
        name: tier.name,
        price: tier.price,
        visits: tier.visits,
        discount: tier.discount,
        features: tier.features,
        userEmail: currentSubscriptionUser.email
    };
    
    // Scroll to payment section
    const paymentSection = document.querySelector('.payment-section');
    if (paymentSection) {
        paymentSection.scrollIntoView({ behavior: 'smooth' });
        
        // Highlight the section briefly
        paymentSection.style.background = '#fff3cd';
        setTimeout(() => {
            paymentSection.style.background = '#f8f9fa';
        }, 2000);
    }
    
    // Show plan selection message
    showPaymentMessage(`Selected ${tier.name} - $${tier.price}/month with ${tier.discount}% discount. Choose your payment method below.`, 'success');
}

/**
 * Subscribe to Elite plan
 */
function subscribeElite() {
    const tier = SUBSCRIPTION_CONFIG.TIERS.elite;
    
    // Set current subscription plan for payment processing
    currentSubscriptionPlan = {
        tier: 'elite',
        name: tier.name,
        price: tier.price,
        visits: tier.visits,
        discount: tier.discount,
        features: tier.features,
        userEmail: isSubscriptionAuthenticated ? currentSubscriptionUser.email : null
    };
    
    // Scroll to payment section
    const paymentSection = document.querySelector('.payment-section');
    if (paymentSection) {
        paymentSection.scrollIntoView({ behavior: 'smooth' });
        
        // Highlight the section briefly
        paymentSection.style.background = '#d4edda';
        setTimeout(() => {
            paymentSection.style.background = '#f8f9fa';
        }, 2000);
    }
    
    // Show plan selection message
    showPaymentMessage(`Selected ${tier.name} - $${tier.price}/month with ${tier.discount}% discount and unlimited visits. Choose your payment method below.`, 'success');
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

/**
 * Stripe Payment Integration Functions
 */

/**
 * Initialize Stripe with publishable key
 */
function initializeStripe() {
    try {
        if (!SUBSCRIPTION_CONFIG.STRIPE.PUBLISHABLE_KEY || SUBSCRIPTION_CONFIG.STRIPE.PUBLISHABLE_KEY.includes('51234567890abcdef')) {
            console.warn('Stripe not configured properly. Using demo mode.');
            return;
        }
        
        stripe = Stripe(SUBSCRIPTION_CONFIG.STRIPE.PUBLISHABLE_KEY);
        console.log(`Stripe initialized in ${SUBSCRIPTION_CONFIG.STRIPE.MODE} mode`);
        
    } catch (error) {
        console.error('Stripe initialization error:', error);
        showPaymentMessage('Payment system initialization failed. Please refresh the page.', 'error');
    }
}

/**
 * Handle payment method selection
 * @param {string} method - Payment method selected
 */
function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Remove previous selections
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked method
    event.target.closest('.payment-method').classList.add('selected');
    
    // Show appropriate payment interface
    if (method === 'stripe' || method === 'googlepay' || method === 'applepay') {
        showStripePaymentSection();
    } else if (method === 'manual') {
        showManualPaymentInfo();
    }
}

/**
 * Show Stripe payment section
 */
function showStripePaymentSection() {
    const paymentSection = document.getElementById('stripePaymentSection');
    
    if (!stripe) {
        showPaymentMessage('Payment system not configured. Please contact support.', 'error');
        return;
    }
    
    paymentSection.style.display = 'block';
    
    // Show different options based on selected method
    if (selectedPaymentMethod === 'googlepay') {
        setupGooglePay();
    } else if (selectedPaymentMethod === 'applepay') {
        setupApplePay();
    } else {
        setupCardPayment();
    }
}

/**
 * Setup card payment with Stripe Elements
 */
function setupCardPayment() {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    
    buttonText.textContent = 'Enter Payment Details';
    submitButton.disabled = false;
    
    // Create Stripe Elements
    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#4a90e2',
            colorBackground: '#ffffff',
            colorText: '#262626',
            colorDanger: '#df1b41',
            fontFamily: 'Poppins, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px'
        }
    };
    
    elements = stripe.elements({ appearance });
    
    // Create payment element
    paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');
    
    // Handle real-time validation errors from the payment element
    paymentElement.on('change', ({ complete, error }) => {
        if (error) {
            showPaymentMessage(error.message, 'error');
        } else if (complete) {
            showPaymentMessage('Payment method looks good!', 'success');
            buttonText.textContent = 'Subscribe Now';
            submitButton.disabled = false;
        } else {
            hidePaymentMessage();
            buttonText.textContent = 'Enter Payment Details';
            submitButton.disabled = true;
        }
    });
    
    // Handle form submission
    submitButton.onclick = handleCardPaymentSubmission;
}

/**
 * Setup Google Pay
 */
function setupGooglePay() {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    
    buttonText.textContent = 'Pay with Google Pay';
    submitButton.disabled = false;
    
    // Hide payment element for Google Pay
    document.getElementById('payment-element').style.display = 'none';
    
    submitButton.onclick = handleGooglePaySubmission;
}

/**
 * Setup Apple Pay
 */
function setupApplePay() {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    
    // Check if Apple Pay is available
    if (!stripe.paymentRequest) {
        showPaymentMessage('Apple Pay is not available on this device/browser.', 'error');
        return;
    }
    
    buttonText.textContent = 'Pay with Apple Pay';
    submitButton.disabled = false;
    
    // Hide payment element for Apple Pay
    document.getElementById('payment-element').style.display = 'none';
    
    submitButton.onclick = handleApplePaySubmission;
}

/**
 * Show manual payment information
 */
function showManualPaymentInfo() {
    const paymentSection = document.getElementById('stripePaymentSection');
    paymentSection.innerHTML = `
        <h3>💸 Manual Payment Setup</h3>
        <p>Contact us to set up manual payment via Venmo or cash:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h4>Contact Information:</h4>
            <p><strong>Email:</strong> ${SUBSCRIPTION_CONFIG.BUSINESS_OWNER_EMAIL}</p>
            <p><strong>Phone:</strong> Available upon request</p>
            <p><strong>Venmo:</strong> Contact for Venmo details</p>
        </div>
        <button class="subscribe-btn" onclick="window.location.href='contact.html'">
            Contact Us
        </button>
    `;
    paymentSection.style.display = 'block';
}

/**
 * Show payment message
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, error)
 */
function showPaymentMessage(message, type) {
    const messageEl = document.getElementById('payment-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `payment-message ${type}`;
        messageEl.style.display = 'block';
    }
}

/**
 * Hide payment message
 */
function hidePaymentMessage() {
    const messageEl = document.getElementById('payment-message');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
}

// Make functions available globally for HTML onclick handlers
window.handleCredentialResponse = handleCredentialResponse;
window.signOut = signOut;
window.subscribeBasic = subscribeBasic;
window.subscribePremium = subscribePremium;
window.subscribeElite = subscribeElite;
window.getUserSubscriptionBenefits = getUserSubscriptionBenefits;
window.prefillBookingForm = prefillBookingForm;
window.selectPaymentMethod = selectPaymentMethod; 