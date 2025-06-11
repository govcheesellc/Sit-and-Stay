# Sit and Stay Pet Care - Setup Instructions
**Complete Implementation Guide for Enhanced Features**  
**Created:** June 11, 2025

## 🚀 Overview
This guide covers the setup for all enhanced features implemented according to Grok's specifications:
- ✅ **Task 1:** Admin Page with Google Analytics & Page Management
- ✅ **Task 2:** Subscription Tiers with Google Login  
- ✅ **Task 3:** Google Pay Placeholder (Future Implementation)
- ✅ **Task 4:** Enhanced Google Calendar Integration

---

## 📋 Prerequisites
1. **Google Cloud Console Access** - For setting up APIs
2. **Google Analytics Account** - For website analytics
3. **Google Calendar Access** - For Bailee's calendar integration
4. **Website Hosting** - Current: Netlify + GitHub Pages

---

## 🔧 TASK 1: Admin Page Setup

### Step 1: Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing: `Sit-and-Stay-Pet-Care`
3. Enable the following APIs:
   - **Google Identity Services API**
   - **Google Analytics Data API**
   - **Google Analytics Reporting API**

### Step 2: OAuth 2.0 Configuration
1. Navigate to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS > OAuth 2.0 Client IDs**
3. Configure OAuth consent screen:
   - **Application name:** Sit and Stay Pet Care Admin
   - **Authorized domains:** `netlify.app`, `github.io`, your custom domain
4. Create OAuth 2.0 Client ID:
   - **Application type:** Web application
   - **Authorized JavaScript origins:**
     ```
     https://magnificent-sfogliatella-f7af67.netlify.app
     https://govcheesellc.github.io/Sit-and-Stay
     http://localhost:3000 (for testing)
     ```
   - **Authorized redirect URIs:** Same as above
5. **Copy the Client ID** - You'll need this for configuration

### Step 3: Update Admin Configuration
Edit `admin.js` and update the configuration:
```javascript
const CONFIG = {
    GOOGLE_CLIENT_ID: 'YOUR_ACTUAL_CLIENT_ID_HERE',
    ANALYTICS_PROPERTY_ID: 'GA4_PROPERTY_ID_HERE',
    ADMIN_EMAIL: 'bailee@sitandstaypetcare.com', // Bailee's actual email
    // ... rest of config
};
```

### Step 4: Google Analytics Setup
1. Set up Google Analytics 4 for the website
2. Get the **Property ID** from Analytics Admin settings
3. Configure **Google Analytics Data API** access:
   - Service account or OAuth 2.0 for API access
   - Grant read permissions to Bailee's Google account

### Step 5: Admin Access
1. **URL:** `https://your-domain.com/admin.html`
2. **Login:** Restricted to `bailee@sitandstaypetcare.com` only
3. **Features Available:**
   - Dashboard with website analytics
   - Page content editor for About, Services, Contact
   - User management interface

---

## 👥 TASK 2: Subscription Management Setup

### Step 1: Google Sheets Creation
1. Create a new Google Sheet: **"Premium Subscribers"**
2. Set up columns:
   ```
   A: Timestamp
   B: Name  
   C: Email
   D: Subscription Tier (basic/premium/elite)
   E: Signup Date
   F: Status (active/paused/cancelled)
   G: Discount Percentage
   H: Priority Status
   ```
3. **Share the sheet** with the service account or Bailee's email

### Step 2: Update Subscription Configuration
Edit `subscription.js`:
```javascript
const SUBSCRIPTION_CONFIG = {
    GOOGLE_CLIENT_ID: 'YOUR_SAME_CLIENT_ID',
    PREMIUM_SUBSCRIBERS_SHEET_ID: 'GOOGLE_SHEET_ID_HERE',
    // ... rest of config
};
```

### Step 3: Google Form Enhancement
1. Open your existing booking Google Form
2. **Add a new field** at the end:
   - **Question:** "Premium Subscriber Email (if applicable)"
   - **Type:** Short answer
   - **Required:** No
   - **Description:** "If you're signed in as a premium subscriber, this will be auto-filled"

### Step 4: Apps Script Integration
The enhanced `google-apps-script.js` now includes:
- Premium subscriber detection
- Automatic discount application
- Priority booking handling
- Enhanced email notifications

**Update the script in Google Apps Script Editor with the new version.**

---

## 📅 TASK 4: Calendar Integration Setup

### Step 1: Find Bailee's Calendar ID
1. Open [Google Calendar](https://calendar.google.com)
2. Go to **Settings > Settings for my calendars**
3. Select the calendar for pet care bookings
4. Scroll to **Calendar ID** and copy it
   - Format: `bailee.petcare@gmail.com` or similar

### Step 2: Update Apps Script Configuration
Edit `google-apps-script.js`:
```javascript
// Replace this line:
const BAILEE_CALENDAR_ID = 'primary';

// With Bailee's actual Calendar ID:
const BAILEE_CALENDAR_ID = 'bailee.petcare@gmail.com';
```

### Step 3: Calendar Permissions
1. Ensure the Apps Script has access to the specific calendar
2. Test calendar access with the `testCalendarAccess()` function
3. Run the test function to verify setup

### Step 4: Enhanced Features Now Available
- ✅ Events created in Bailee's specific calendar
- ✅ Premium subscriber indicators in event titles
- ✅ Detailed event descriptions with all booking info
- ✅ Automatic duration setting (1 hour vs 24 hours)
- ✅ Enhanced email notifications
- ✅ Fallback to default calendar if needed

---

## 💳 TASK 3: Google Pay Integration (Future)

### Current Status: Placeholder Implementation
- ✅ UI placeholder in subscription page
- ✅ "Coming Soon" indicators
- ✅ Documentation for future implementation

### When Ready for Google Pay:
1. **Enable Google Pay API** in Google Cloud Console
2. **Set up merchant account** with Google Pay
3. **Implement backend** for payment processing
4. **Update subscription.html** to activate payment buttons
5. **Configure recurring billing** logic

### Future Implementation Notes:
```javascript
// When implementing Google Pay, replace placeholders with:
const GOOGLE_PAY_CONFIG = {
    merchantId: 'YOUR_MERCHANT_ID',
    environment: 'PRODUCTION', // or 'TEST'
    countryCode: 'US',
    currencyCode: 'USD'
};
```

---

## 🧪 Testing Procedures

### Test Admin Dashboard
1. Navigate to `/admin.html`
2. Sign in with authorized Google account
3. Verify analytics data loads
4. Test page content editor functionality

### Test Subscription Flow
1. Go to `/subscription.html`
2. Sign in with Google for premium access
3. Subscribe to premium tier
4. Verify email confirmation and Google Sheet entry

### Test Enhanced Booking
1. Submit booking through existing form
2. Include premium subscriber email
3. Verify premium benefits applied
4. Check calendar event creation with enhanced details

### Test Calendar Integration
1. Run `testCalendarAccess()` in Apps Script
2. Submit a test booking
3. Verify event appears in correct calendar
4. Check event details and formatting

---

## 🔐 Security Configuration

### Admin Access Security
- ✅ Google OAuth 2.0 authentication
- ✅ Email-based access restriction
- ✅ Session management with timeout
- ✅ HTTPS-only access

### API Security
- ✅ Client ID restrictions by domain
- ✅ Scope limitations for APIs
- ✅ No sensitive data in client-side code
- ✅ Error handling and logging

---

## 📧 Email Configuration Updates

### Required Email Updates
Update these placeholders in all files:
```javascript
// In admin.js, subscription.js, google-apps-script.js
BUSINESS_OWNER_EMAIL: 'bailee@sitandstaypetcare.com'  // Replace with Bailee's actual email
ADMIN_EMAIL: 'bailee@sitandstaypetcare.com'           // Same email for admin access
```

---

## 🚀 Deployment Checklist

### Pre-Launch
- [ ] All Google API keys configured
- [ ] Calendar ID updated
- [ ] Email addresses updated
- [ ] Google Sheets created and shared
- [ ] OAuth domains configured
- [ ] Analytics tracking active

### Launch Day
- [ ] Test all functionality end-to-end
- [ ] Verify admin access works
- [ ] Confirm subscription flow
- [ ] Check calendar integration
- [ ] Monitor error logs
- [ ] Send test bookings

### Post-Launch
- [ ] Monitor analytics dashboard
- [ ] Check premium subscriber tracking
- [ ] Review calendar event quality
- [ ] Gather user feedback
- [ ] Plan Google Pay implementation

---

## 📞 Support and Troubleshooting

### Common Issues
1. **Admin login fails:** Check Client ID and authorized domains
2. **Analytics not loading:** Verify Analytics API permissions
3. **Calendar events missing:** Check Calendar ID and permissions
4. **Premium benefits not applying:** Verify Google Sheets access

### Debug Functions Available
- `testCalendarAccess()` - Test calendar integration
- `testScript()` - Test complete booking flow
- Browser console logs for frontend issues

### Contact for Technical Support
- **Development Team:** Available for configuration assistance
- **Google Cloud Support:** For API-related issues
- **Documentation:** This file + inline code comments

---

## 🎯 Success Metrics

### Admin Dashboard
- Bailee can access analytics data
- Page editing functionality works
- User management is operational

### Subscription Management  
- Premium sign-ups tracked correctly
- Discounts applied automatically
- Priority booking system active

### Calendar Integration
- Events appear in correct calendar
- Enhanced details included
- Premium indicators visible

### Overall Enhancement
- **Target:** 100% functionality as specified by Grok
- **Status:** ✅ Complete and ready for production
- **Next Steps:** Google Pay integration when ready

---

**🐾 Enhanced website ready for launch with advanced functionality! 🐾** 