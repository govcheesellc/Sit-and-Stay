/**
 * Sit and Stay Pet Care - Enhanced Booking Automation Script
 * This script processes Google Form submissions for pet care bookings
 * Updated: June 11, 2025 - Added Calendar ID integration and premium user handling
 * 
 * Form Field Mapping:
 * 0: Timestamp, 1: Customer Name, 2: Address, 3: Phone Number, 4: Email
 * 5: Dog Name, 6: Breed, 7: Special Needs, 8: Service Type, 9: Date, 10: Time
 * 11: Logged-in Google Email (for premium subscribers) - NEW FIELD
 */

// Configuration - UPDATE THESE VALUES
const BUSINESS_OWNER_EMAIL = 'bailee.williams@google.com'; // Bailee's actual email
const BUSINESS_NAME = 'Sit and Stay Pet Care';
const BUSINESS_PHONE = '(817) 395-9982';

// IMPORTANT: Bailee's Calendar ID for Sit and Stay Pet Care bookings
// This will create events in bailee.williams@google.com's calendar
const BAILEE_CALENDAR_ID = 'primary'; // Uses your default calendar

// Pet Database Configuration
const PET_DATABASE_SHEET_ID = 'YOUR_PET_DATABASE_SHEET_ID'; // Replace with actual Google Sheet ID
const PET_DATABASE_SHEET_NAME = 'Pet Profiles';

// Premium subscriber configuration
const PREMIUM_DISCOUNT_PERCENT = 10;
const ELITE_DISCOUNT_PERCENT = 15;

/**
 * Main function triggered when form is submitted
 */
function onFormSubmit(e) {
  try {
    console.log('Form submission received:', new Date());
    
    // Get form response data
    const values = e.values;
    console.log('Form values:', values);
    
    // Extract form data including new premium user field
    const bookingData = {
      timestamp: values[0],
      customerName: values[1],
      address: values[2],
      phone: values[3],
      email: values[4],
      dogName: values[5],
      breed: values[6],
      specialNeeds: values[7],
      serviceType: values[8],
      date: values[9],
      time: values[10],
      premiumUserEmail: values[11] || null // New field for premium subscribers
    };
    
    console.log('Parsed booking data:', bookingData);
    
    // Check if user is premium subscriber
    const premiumInfo = checkPremiumSubscriber(bookingData);
    bookingData.premiumInfo = premiumInfo;
    
    // Validate booking
    const validation = validateBooking(bookingData);
    
    if (!validation.isValid) {
      // Booking rejected - send rejection emails
      sendRejectionEmail(bookingData, validation.reason);
      sendOwnerRejectionNotification(bookingData, validation.reason);
      console.log('Booking rejected:', validation.reason);
      return;
    }
    
    // Booking approved - process it
    const calendarEvent = createCalendarEvent(bookingData);
    
    // Create or update pet profile in database
    createOrUpdatePetProfile(bookingData);
    
    sendConfirmationEmail(bookingData, calendarEvent);
    sendOwnerNotification(bookingData, calendarEvent);
    
    console.log('Booking processed successfully');
    
  } catch (error) {
    console.error('Error in onFormSubmit:', error);
    // Send error notification to business owner
    try {
      GmailApp.sendEmail(
        BUSINESS_OWNER_EMAIL,
        'Booking System Error - Sit and Stay Pet Care',
        `An error occurred processing a booking:\n\nError: ${error.message}\n\nPlease check the booking manually.\n\nTimestamp: ${new Date()}`
      );
    } catch (emailError) {
      console.error('Failed to send error notification:', emailError);
    }
  }
}

/**
 * Check if user is a premium subscriber
 * In production, this would query the Premium Subscribers Google Sheet
 */
function checkPremiumSubscriber(data) {
  try {
    // If no premium email provided, user is not premium
    if (!data.premiumUserEmail) {
      return {
        isPremium: false,
        tier: 'basic',
        discount: 0,
        priority: false
      };
    }
    
    // TODO: Replace with actual Google Sheets lookup
    // For now, we'll simulate premium user detection
    // In production, you would:
    // 1. Open the Premium Subscribers Google Sheet
    // 2. Search for the email in the subscribers list
    // 3. Return the subscriber's tier and benefits
    
    // Simulate premium user detection (for demonstration)
    const premiumEmails = [
      'bailee@example.com',
      'premium@test.com',
      data.premiumUserEmail // Accept any provided premium email for demo
    ];
    
    if (premiumEmails.includes(data.premiumUserEmail.toLowerCase())) {
      return {
        isPremium: true,
        tier: 'premium', // Could be 'premium' or 'elite'
        discount: PREMIUM_DISCOUNT_PERCENT,
        priority: true,
        email: data.premiumUserEmail
      };
    }
    
    return {
      isPremium: false,
      tier: 'basic',
      discount: 0,
      priority: false
    };
    
  } catch (error) {
    console.error('Error checking premium subscriber:', error);
    return {
      isPremium: false,
      tier: 'basic',
      discount: 0,
      priority: false
    };
  }
}

/**
 * Validates booking according to business rules
 */
function validateBooking(data) {
  try {
    // Parse the booking date
    const bookingDate = new Date(data.date);
    const today = new Date();
    const daysAhead = Math.ceil((bookingDate - today) / (1000 * 60 * 60 * 24));
    
    // Validate overnight bookings require 2 weeks notice
    if (data.serviceType && data.serviceType.toLowerCase().includes('overnight')) {
      if (daysAhead < 14) {
        return {
          isValid: false,
          reason: `Overnight Pet Sitting requires at least 2 weeks advance notice. Your booking date (${data.date}) is only ${daysAhead} days away. Please select a date at least 14 days in advance.`
        };
      }
    }
    
    // Validate date is not in the past
    if (daysAhead < 0) {
      return {
        isValid: false,
        reason: `The booking date (${data.date}) is in the past. Please select a future date.`
      };
    }
    
    // Additional validation for premium users could be added here
    // e.g., premium users might have different rules or priority access
    
    return { isValid: true };
    
  } catch (error) {
    console.error('Error validating booking:', error);
    return {
      isValid: false,
      reason: 'Invalid date format. Please use a valid date format.'
    };
  }
}

/**
 * Creates calendar event for approved booking with enhanced details
 */
function createCalendarEvent(data) {
  try {
    // Use specific calendar ID instead of default calendar
    const calendar = CalendarApp.getCalendarById(BAILEE_CALENDAR_ID);
    
    if (!calendar) {
      console.error('Calendar not found with ID:', BAILEE_CALENDAR_ID);
      throw new Error(`Calendar not accessible. Please verify Calendar ID: ${BAILEE_CALENDAR_ID}`);
    }
    
    // Parse date and time
    const bookingDate = new Date(data.date);
    
    // Set time if provided, otherwise default to 9 AM
    let startTime = '09:00';
    if (data.time) {
      startTime = data.time;
    }
    
    // Parse time (assumes format like "09:00" or "9:00 AM")
    const [hours, minutes] = startTime.replace(/[^\d:]/g, '').split(':');
    bookingDate.setHours(parseInt(hours), parseInt(minutes) || 0, 0, 0);
    
    // Set duration based on service type
    const endDate = new Date(bookingDate);
    if (data.serviceType && data.serviceType.toLowerCase().includes('overnight')) {
      // 24 hours for overnight stays
      endDate.setDate(endDate.getDate() + 1);
    } else {
      // 1 hour for drop-in visits
      endDate.setHours(endDate.getHours() + 1);
    }
    
    // Create enhanced event title with premium indicator
    let title = `${data.serviceType} - ${data.customerName} (${data.dogName})`;
    if (data.premiumInfo && data.premiumInfo.isPremium) {
      title = `⭐ PREMIUM: ${title}`;
    }
    
    // Create comprehensive event description
    const description = `
🐾 Pet Care Appointment Details

📋 CUSTOMER INFORMATION:
• Name: ${data.customerName}
• Phone: ${data.phone}
• Email: ${data.email}
• Address: ${data.address}

🐕 PET INFORMATION:
• Dog Name: ${data.dogName}
• Breed: ${data.breed}
• Special Needs: ${data.specialNeeds || 'None specified'}

🛎️ SERVICE DETAILS:
• Service Type: ${data.serviceType}
• Requested Time: ${data.time || 'Not specified'}
• Duration: ${data.serviceType && data.serviceType.toLowerCase().includes('overnight') ? '24 hours (Overnight)' : '1 hour (Drop-in)'}

${data.premiumInfo && data.premiumInfo.isPremium ? `
⭐ PREMIUM SUBSCRIBER:
• Tier: ${data.premiumInfo.tier.toUpperCase()}
• Discount: ${data.premiumInfo.discount}%
• Priority Customer: YES
• Premium Email: ${data.premiumInfo.email}
` : ''}

📅 BOOKING INFORMATION:
• Submitted: ${data.timestamp}
• Processing Date: ${new Date()}

⚠️ ACTION NEEDED:
• Contact customer to confirm final details
• Confirm exact timing and requirements
• Apply any premium discounts if applicable

🏠 Location: ${data.address}
    `.trim();
    
    // Create the calendar event with enhanced details
    const event = calendar.createEvent(title, bookingDate, endDate, {
      description: description,
      location: data.address,
      // Add guests if premium subscriber
      guests: data.premiumInfo && data.premiumInfo.isPremium ? data.premiumInfo.email : '',
      sendInvites: false // Don't auto-send invites
    });
    
    console.log('Enhanced calendar event created:', event.getTitle());
    console.log('Calendar used:', calendar.getName());
    
    return event;
    
  } catch (error) {
    console.error('Error creating calendar event:', error);
    // Fallback to default calendar if specific calendar fails
    try {
      console.log('Attempting fallback to default calendar...');
      const fallbackCalendar = CalendarApp.getDefaultCalendar();
      const title = `${data.serviceType} - ${data.customerName} (${data.dogName})`;
      const bookingDate = new Date(data.date);
      const endDate = new Date(bookingDate);
      endDate.setHours(endDate.getHours() + 1);
      
      const event = fallbackCalendar.createEvent(title, bookingDate, endDate, {
        description: `Booking for ${data.dogName} - Contact: ${data.phone}`,
        location: data.address
      });
      
      console.log('Fallback calendar event created');
      return event;
      
    } catch (fallbackError) {
      console.error('Fallback calendar creation failed:', fallbackError);
      throw new Error('Failed to create calendar event: ' + error.message);
    }
  }
}

/**
 * Sends enhanced confirmation email to customer
 */
function sendConfirmationEmail(data, calendarEvent) {
  try {
    const subject = `Booking Request Received - ${BUSINESS_NAME}`;
    
    // Calculate estimated pricing with premium discounts
    let pricingInfo = '';
    if (data.premiumInfo && data.premiumInfo.isPremium) {
      pricingInfo = `
⭐ PREMIUM SUBSCRIBER BENEFITS:
• ${data.premiumInfo.discount}% discount applied
• Priority booking status
• Enhanced service features
• Flexible rescheduling options
`;
    }
    
    const message = `
Hi ${data.customerName},

Thank you for your booking request with ${BUSINESS_NAME}!

🐾 BOOKING DETAILS:
• Service: ${data.serviceType}
• Date: ${data.date}
• Time: ${data.time || 'To be confirmed'}
• Pet: ${data.dogName} (${data.breed})
• Location: ${data.address}

${pricingInfo}

📋 NEXT STEPS:
We have received your request and added it to our calendar. Bailee will review the details and contact you shortly to:
• Confirm the final scheduling
• Discuss any special requirements for ${data.dogName}
• Provide final pricing details
• Answer any questions you may have

📞 CONTACT INFORMATION:
If you have any questions or need to make changes, please contact us:
• Phone: ${BUSINESS_PHONE}
• Email: ${BUSINESS_OWNER_EMAIL}

🙏 Thank you for choosing ${BUSINESS_NAME} for your pet care needs! We look forward to caring for ${data.dogName}.

Best regards,
Bailee Williams
${BUSINESS_NAME}
Serving Allen, TX and surrounding areas
${BUSINESS_PHONE}

🐾 Professional pet care you can trust! 🐾
    `.trim();
    
    GmailApp.sendEmail(data.email, subject, message);
    console.log('Enhanced confirmation email sent to:', data.email);
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw new Error('Failed to send confirmation email: ' + error.message);
  }
}

/**
 * Sends enhanced notification to business owner about new booking
 */
function sendOwnerNotification(data, calendarEvent) {
  try {
    let subject = `New Booking Request - ${data.customerName} (${data.dogName})`;
    if (data.premiumInfo && data.premiumInfo.isPremium) {
      subject = `⭐ PREMIUM: ${subject}`;
    }
    
    const message = `
🐾 New booking request received for ${BUSINESS_NAME}:

📋 CUSTOMER INFORMATION:
• Name: ${data.customerName}
• Phone: ${data.phone}
• Email: ${data.email}
• Address: ${data.address}

🐕 PET INFORMATION:
• Dog Name: ${data.dogName}
• Breed: ${data.breed}
• Special Needs: ${data.specialNeeds || 'None specified'}

🛎️ BOOKING DETAILS:
• Service: ${data.serviceType}
• Date: ${data.date}
• Time: ${data.time || 'Not specified'}

${data.premiumInfo && data.premiumInfo.isPremium ? `
⭐ PREMIUM SUBSCRIBER ALERT:
• Subscriber Tier: ${data.premiumInfo.tier.toUpperCase()}
• Eligible Discount: ${data.premiumInfo.discount}%
• Priority Customer: YES
• Premium Account: ${data.premiumInfo.email}
• PLEASE PRIORITIZE THIS BOOKING

` : ''}

📅 CALENDAR STATUS:
A calendar event has been created in your ${BAILEE_CALENDAR_ID === 'primary' ? 'primary calendar' : 'designated pet care calendar'}.

⚠️ ACTION NEEDED:
1. Review booking details
2. Contact customer to confirm scheduling
3. ${data.premiumInfo && data.premiumInfo.isPremium ? 'Apply premium discount and benefits' : 'Discuss pricing and services'}
4. Update calendar with final confirmed details

📊 BOOKING STATISTICS:
• Submitted: ${data.timestamp}
• Processed: ${new Date()}
• Calendar ID: ${BAILEE_CALENDAR_ID}

Happy pet sitting! 🐾
    `.trim();
    
    GmailApp.sendEmail(BUSINESS_OWNER_EMAIL, subject, message);
    console.log('Enhanced owner notification sent to:', BUSINESS_OWNER_EMAIL);
    
  } catch (error) {
    console.error('Error sending owner notification:', error);
    throw new Error('Failed to send owner notification: ' + error.message);
  }
}

/**
 * Sends rejection email to customer
 */
function sendRejectionEmail(data, reason) {
  try {
    const subject = `Booking Request - Additional Notice Required - ${BUSINESS_NAME}`;
    
    const message = `
Hi ${data.customerName},

Thank you for your interest in ${BUSINESS_NAME}.

Unfortunately, we cannot process your booking request for the following reason:

❌ ${reason}

🔄 NEXT STEPS:
Please submit a new booking request with an appropriate date, and we'll be happy to care for ${data.dogName}!

${data.premiumInfo && data.premiumInfo.isPremium ? `
⭐ As a premium subscriber, you still have access to:
• Priority rebooking when you submit a valid date
• Flexible rescheduling options
• Premium customer support

` : ''}

📞 QUESTIONS?
If you need assistance selecting an appropriate date or have any questions, please contact us at ${BUSINESS_PHONE}.

We appreciate your understanding and look forward to serving you and ${data.dogName} soon!

Best regards,
Bailee Williams
${BUSINESS_NAME}
${BUSINESS_PHONE}
    `.trim();
    
    GmailApp.sendEmail(data.email, subject, message);
    console.log('Enhanced rejection email sent to:', data.email);
    
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
}

/**
 * Sends rejection notification to business owner
 */
function sendOwnerRejectionNotification(data, reason) {
  try {
    let subject = `Booking Rejected - ${data.customerName} (${data.dogName})`;
    if (data.premiumInfo && data.premiumInfo.isPremium) {
      subject = `⭐ PREMIUM CUSTOMER - ${subject}`;
    }
    
    const message = `
🚫 A booking request was automatically rejected:

📋 CUSTOMER DETAILS:
• Name: ${data.customerName}
• Phone: ${data.phone}
• Email: ${data.email}
• Service: ${data.serviceType}
• Requested Date: ${data.date}

${data.premiumInfo && data.premiumInfo.isPremium ? `
⭐ PREMIUM SUBSCRIBER:
• This was a PREMIUM customer (${data.premiumInfo.tier})
• Consider reaching out personally to assist with rebooking
• Premium Email: ${data.premiumInfo.email}

` : ''}

❌ REJECTION REASON:
${reason}

📧 CUSTOMER NOTIFICATION:
The customer has been notified via email with rebooking instructions.

📊 DETAILS:
• Submitted: ${data.timestamp}
• Processed: ${new Date()}

${data.premiumInfo && data.premiumInfo.isPremium ? '⚠️ Consider personal follow-up with this premium customer.' : ''}
    `.trim();
    
    GmailApp.sendEmail(BUSINESS_OWNER_EMAIL, subject, message);
    console.log('Enhanced owner rejection notification sent');
    
  } catch (error) {
    console.error('Error sending owner rejection notification:', error);
  }
}

/**
 * Test function - run this to test the script with sample data
 */
function testScript() {
  const testData = {
    values: [
      new Date().toString(), // timestamp
      'John Smith', // customer name
      '123 Main St, Allen, TX 75002', // address
      '(555) 123-4567', // phone
      'john@example.com', // email
      'Buddy', // dog name
      'Golden Retriever', // breed
      'Needs medication twice daily', // special needs
      'Overnight Pet Sitting', // service type
      '2025-06-30', // date (adjust to be 2+ weeks from today)
      '18:00', // time
      'premium@test.com' // premium user email (test premium features)
    ]
  };
  
  console.log('Running enhanced test with sample data...');
  console.log('Testing Calendar ID:', BAILEE_CALENDAR_ID);
  onFormSubmit(testData);
}

/**
 * Setup helper function to verify calendar access
 * Run this function to test if the calendar ID is correctly configured
 */
function testCalendarAccess() {
  try {
    console.log('Testing calendar access...');
    console.log('Calendar ID:', BAILEE_CALENDAR_ID);
    
    const calendar = CalendarApp.getCalendarById(BAILEE_CALENDAR_ID);
    
    if (calendar) {
      console.log('✅ Calendar access successful!');
      console.log('Calendar name:', calendar.getName());
      console.log('Calendar description:', calendar.getDescription());
      return true;
    } else {
      console.log('❌ Calendar not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Calendar access error:', error);
    console.log('Trying default calendar as fallback...');
    
    try {
      const defaultCalendar = CalendarApp.getDefaultCalendar();
      console.log('✅ Default calendar access successful:', defaultCalendar.getName());
      console.log('⚠️ Please update BAILEE_CALENDAR_ID with the correct Calendar ID');
      return false;
    } catch (defaultError) {
      console.error('❌ Default calendar access also failed:', defaultError);
      return false;
    }
  }
}

/**
 * Creates or updates a pet profile in the database
 */
function createOrUpdatePetProfile(data) {
  try {
    console.log('Creating/updating pet profile for:', data.dogName);
    
    // Get or create the pet database sheet
    const sheet = getPetDatabaseSheet();
    if (!sheet) {
      console.error('Could not access pet database sheet');
      return;
    }
    
    // Check if pet already exists
    const existingPetRow = findPetByNameAndOwner(sheet, data.dogName, data.customerName);
    
    const petData = {
      petName: data.dogName,
      breed: data.breed,
      ownerName: data.customerName,
      ownerEmail: data.email,
      ownerPhone: data.phone,
      ownerAddress: data.address,
      specialNeeds: data.specialNeeds || 'None',
      lastService: data.serviceType,
      lastServiceDate: data.date,
      lastServiceTime: data.time,
      totalVisits: 1,
      isPremiumOwner: data.premiumInfo ? data.premiumInfo.isPremium : false,
      premiumTier: data.premiumInfo ? data.premiumInfo.tier : 'basic',
      dateCreated: new Date(),
      lastUpdated: new Date(),
      notes: ''
    };
    
    if (existingPetRow) {
      // Update existing pet profile
      updateExistingPetProfile(sheet, existingPetRow, petData, data);
    } else {
      // Create new pet profile
      createNewPetProfile(sheet, petData);
    }
    
    console.log('Pet profile processed successfully');
    
  } catch (error) {
    console.error('Error creating/updating pet profile:', error);
  }
}

/**
 * Gets or creates the pet database sheet
 */
function getPetDatabaseSheet() {
  try {
    // Try to open existing sheet by ID
    if (PET_DATABASE_SHEET_ID && PET_DATABASE_SHEET_ID !== 'YOUR_PET_DATABASE_SHEET_ID') {
      const spreadsheet = SpreadsheetApp.openById(PET_DATABASE_SHEET_ID);
      let sheet = spreadsheet.getSheetByName(PET_DATABASE_SHEET_NAME);
      
      if (!sheet) {
        // Create the sheet if it doesn't exist
        sheet = spreadsheet.insertSheet(PET_DATABASE_SHEET_NAME);
        setupPetDatabaseHeaders(sheet);
      }
      
      return sheet;
    } else {
      // Create a new spreadsheet for pet database
      const spreadsheet = SpreadsheetApp.create('Sit and Stay - Pet Database');
      const sheet = spreadsheet.getActiveSheet();
      sheet.setName(PET_DATABASE_SHEET_NAME);
      setupPetDatabaseHeaders(sheet);
      
      // Log the new spreadsheet ID for configuration
      console.log('🆕 Created new Pet Database spreadsheet. ID:', spreadsheet.getId());
      console.log('📝 Please update PET_DATABASE_SHEET_ID in the script configuration');
      
      return sheet;
    }
  } catch (error) {
    console.error('Error accessing pet database sheet:', error);
    return null;
  }
}

/**
 * Sets up the headers for the pet database sheet
 */
function setupPetDatabaseHeaders(sheet) {
  const headers = [
    'Pet ID',
    'Pet Name',
    'Breed',
    'Owner Name',
    'Owner Email',
    'Owner Phone',
    'Owner Address',
    'Special Needs',
    'Last Service',
    'Last Service Date',
    'Last Service Time',
    'Total Visits',
    'Is Premium Owner',
    'Premium Tier',
    'Date Created',
    'Last Updated',
    'Notes',
    'Emergency Contact',
    'Veterinarian',
    'Medications',
    'Allergies',
    'Behavioral Notes',
    'Preferred Activities',
    'Feeding Instructions'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4a90e2');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
  
  console.log('Pet database headers set up successfully');
}

/**
 * Finds a pet by name and owner in the database
 */
function findPetByNameAndOwner(sheet, petName, ownerName) {
  try {
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) { // Skip header row
      const row = data[i];
      if (row[1] && row[3] && // Pet Name and Owner Name columns
          row[1].toString().toLowerCase() === petName.toLowerCase() &&
          row[3].toString().toLowerCase() === ownerName.toLowerCase()) {
        return i + 1; // Return 1-based row number
      }
    }
    
    return null; // Pet not found
  } catch (error) {
    console.error('Error finding pet:', error);
    return null;
  }
}

/**
 * Creates a new pet profile
 */
function createNewPetProfile(sheet, petData) {
  try {
    const nextRow = sheet.getLastRow() + 1;
    const petId = `PET${String(nextRow - 1).padStart(4, '0')}`; // Generate unique pet ID
    
    const rowData = [
      petId,
      petData.petName,
      petData.breed,
      petData.ownerName,
      petData.ownerEmail,
      petData.ownerPhone,
      petData.ownerAddress,
      petData.specialNeeds,
      petData.lastService,
      petData.lastServiceDate,
      petData.lastServiceTime,
      petData.totalVisits,
      petData.isPremiumOwner,
      petData.premiumTier,
      petData.dateCreated,
      petData.lastUpdated,
      petData.notes,
      '', // Emergency Contact
      '', // Veterinarian
      '', // Medications
      '', // Allergies
      '', // Behavioral Notes
      '', // Preferred Activities
      ''  // Feeding Instructions
    ];
    
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    
    console.log(`✅ Created new pet profile: ${petData.petName} (${petId})`);
    
  } catch (error) {
    console.error('Error creating new pet profile:', error);
  }
}

/**
 * Updates an existing pet profile
 */
function updateExistingPetProfile(sheet, rowNumber, petData, bookingData) {
  try {
    // Get current data
    const currentData = sheet.getRange(rowNumber, 1, 1, 24).getValues()[0];
    
    // Update relevant fields
    const updatedData = [
      currentData[0], // Keep Pet ID
      petData.petName,
      petData.breed,
      petData.ownerName,
      petData.ownerEmail,
      petData.ownerPhone,
      petData.ownerAddress,
      petData.specialNeeds,
      petData.lastService, // Update last service
      petData.lastServiceDate, // Update last service date
      petData.lastServiceTime, // Update last service time
      (currentData[11] || 0) + 1, // Increment total visits
      petData.isPremiumOwner,
      petData.premiumTier,
      currentData[14], // Keep original date created
      petData.lastUpdated, // Update last updated
      currentData[16], // Keep existing notes
      currentData[17], // Keep emergency contact
      currentData[18], // Keep veterinarian
      currentData[19], // Keep medications
      currentData[20], // Keep allergies
      currentData[21], // Keep behavioral notes
      currentData[22], // Keep preferred activities
      currentData[23]  // Keep feeding instructions
    ];
    
    sheet.getRange(rowNumber, 1, 1, updatedData.length).setValues([updatedData]);
    
    console.log(`✅ Updated pet profile: ${petData.petName} (Visit #${updatedData[11]})`);
    
  } catch (error) {
    console.error('Error updating pet profile:', error);
  }
}

/**
 * Test pet database functionality
 */
function testPetDatabase() {
  try {
    console.log('Testing pet database functionality...');
    
    // Test data
    const testData = {
      dogName: 'Buddy',
      breed: 'Golden Retriever',
      customerName: 'John Smith',
      email: 'john@example.com',
      phone: '555-1234',
      address: '123 Main St',
      specialNeeds: 'Needs medication at 2pm',
      serviceType: 'Dog Walking',
      date: '2024-01-15',
      time: '10:00 AM',
      premiumInfo: {
        isPremium: true,
        tier: 'premium'
      }
    };
    
    createOrUpdatePetProfile(testData);
    console.log('✅ Pet database test completed');
    
  } catch (error) {
    console.error('❌ Pet database test failed:', error);
  }
}

// Pet Database Functions
function getPetData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses');
  if (!sheet) {
    throw new Error('Form Responses sheet not found');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find the relevant column indices
  const nameIndex = headers.indexOf('Pet Name');
  const typeIndex = headers.indexOf('Pet Type');
  const breedIndex = headers.indexOf('Breed');
  const ageIndex = headers.indexOf('Age');
  const ownerIndex = headers.indexOf('Owner Name');
  const serviceIndex = headers.indexOf('Service Type');
  const timestampIndex = headers.indexOf('Timestamp');
  const isPremiumIndex = headers.indexOf('Premium Service');

  if (nameIndex === -1 || typeIndex === -1) {
    throw new Error('Required columns not found in form responses');
  }

  // Process the data
  const pets = data.slice(1).map((row, index) => {
    return {
      id: index + 1,
      name: row[nameIndex] || 'Unknown',
      type: row[typeIndex] || 'Unknown',
      breed: row[breedIndex] || 'Unknown',
      age: row[ageIndex] || 'Unknown',
      owner: row[ownerIndex] || 'Unknown',
      service: row[serviceIndex] || 'Unknown',
      lastVisit: row[timestampIndex] ? new Date(row[timestampIndex]).toLocaleDateString() : 'Never',
      isPremium: row[isPremiumIndex] === 'Yes',
      visitCount: 1 // This could be calculated based on number of entries for this pet
    };
  });

  return pets;
}

// Placeholder for adding a pet
function addPet(pet) {
  // TODO: Implement adding a pet to the sheet
  return { success: false, message: 'Add pet not implemented yet.' };
}

// Placeholder for editing a pet
function editPet(pet) {
  // TODO: Implement editing a pet in the sheet
  return { success: false, message: 'Edit pet not implemented yet.' };
}

// Placeholder for deleting a pet
function deletePet(petId) {
  // TODO: Implement deleting a pet from the sheet
  return { success: false, message: 'Delete pet not implemented yet.' };
} 