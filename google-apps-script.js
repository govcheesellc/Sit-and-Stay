/**
 * Sit and Stay Pet Care - Booking Automation Script
 * This script processes Google Form submissions for pet care bookings
 * 
 * Form Field Mapping:
 * 0: Timestamp, 1: Customer Name, 2: Address, 3: Phone Number, 4: Email
 * 5: Dog Name, 6: Breed, 7: Special Needs, 8: Service Type, 9: Date, 10: Time
 */

// Configuration - UPDATE THIS EMAIL WHEN BAILEE CONNECTS HER ACCOUNT
const BUSINESS_OWNER_EMAIL = 'sitandstaytest@gmail.com'; // Change to Bailee's email later
const BUSINESS_NAME = 'Sit and Stay Pet Care';
const BUSINESS_PHONE = '(817) 395-9982';

/**
 * Main function triggered when form is submitted
 */
function onFormSubmit(e) {
  try {
    console.log('Form submission received:', new Date());
    
    // Get form response data
    const values = e.values;
    console.log('Form values:', values);
    
    // Extract form data
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
      time: values[10]
    };
    
    console.log('Parsed booking data:', bookingData);
    
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
        `An error occurred processing a booking:\n\nError: ${error.message}\n\nPlease check the booking manually.`
      );
    } catch (emailError) {
      console.error('Failed to send error notification:', emailError);
    }
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
 * Creates calendar event for approved booking
 */
function createCalendarEvent(data) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    
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
    
    // Create event title and description
    const title = `${data.serviceType} - ${data.customerName} (${data.dogName})`;
    const description = `
Pet Care Appointment Details:

Customer: ${data.customerName}
Phone: ${data.phone}
Email: ${data.email}
Address: ${data.address}

Pet Information:
Dog Name: ${data.dogName}
Breed: ${data.breed}
Special Needs: ${data.specialNeeds || 'None specified'}

Service: ${data.serviceType}
Requested Time: ${data.time || 'Not specified'}

Booking submitted: ${data.timestamp}

Contact customer to confirm final details.
    `.trim();
    
    // Create the calendar event
    const event = calendar.createEvent(title, bookingDate, endDate, {
      description: description,
      location: data.address
    });
    
    console.log('Calendar event created:', event.getTitle());
    return event;
    
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw new Error('Failed to create calendar event: ' + error.message);
  }
}

/**
 * Sends confirmation email to customer
 */
function sendConfirmationEmail(data, calendarEvent) {
  try {
    const subject = `Booking Request Received - ${BUSINESS_NAME}`;
    
    const message = `
Hi ${data.customerName},

Thank you for your booking request with ${BUSINESS_NAME}!

BOOKING DETAILS:
• Service: ${data.serviceType}
• Date: ${data.date}
• Time: ${data.time || 'To be confirmed'}
• Pet: ${data.dogName} (${data.breed})

We have received your request and will review the details. 

CONFIRMATION TEXT WILL BE SENT ONCE SCHEDULING IS APPROVED.

If you have any questions or need to make changes, please contact us at ${BUSINESS_PHONE}.

Thank you for choosing ${BUSINESS_NAME} for your pet care needs!

Best regards,
Bailee Williams
${BUSINESS_NAME}
${BUSINESS_PHONE}
    `.trim();
    
    GmailApp.sendEmail(data.email, subject, message);
    console.log('Confirmation email sent to:', data.email);
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw new Error('Failed to send confirmation email: ' + error.message);
  }
}

/**
 * Sends notification to business owner about new booking
 */
function sendOwnerNotification(data, calendarEvent) {
  try {
    const subject = `New Booking Request - ${data.customerName} (${data.dogName})`;
    
    const message = `
New booking request received for ${BUSINESS_NAME}:

CUSTOMER INFORMATION:
• Name: ${data.customerName}
• Phone: ${data.phone}
• Email: ${data.email}
• Address: ${data.address}

PET INFORMATION:
• Dog Name: ${data.dogName}
• Breed: ${data.breed}
• Special Needs: ${data.specialNeeds || 'None specified'}

BOOKING DETAILS:
• Service: ${data.serviceType}
• Date: ${data.date}
• Time: ${data.time || 'Not specified'}

CALENDAR EVENT: A calendar event has been created for this booking.

ACTION NEEDED: Please review and contact the customer to confirm the booking details.

Submitted: ${data.timestamp}
    `.trim();
    
    GmailApp.sendEmail(BUSINESS_OWNER_EMAIL, subject, message);
    console.log('Owner notification sent to:', BUSINESS_OWNER_EMAIL);
    
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

${reason}

Please submit a new booking request with an appropriate date, and we'll be happy to care for ${data.dogName}!

If you have any questions, please contact us at ${BUSINESS_PHONE}.

Best regards,
Bailee Williams
${BUSINESS_NAME}
${BUSINESS_PHONE}
    `.trim();
    
    GmailApp.sendEmail(data.email, subject, message);
    console.log('Rejection email sent to:', data.email);
    
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
}

/**
 * Sends rejection notification to business owner
 */
function sendOwnerRejectionNotification(data, reason) {
  try {
    const subject = `Booking Rejected - ${data.customerName} (${data.dogName})`;
    
    const message = `
A booking request was automatically rejected:

CUSTOMER: ${data.customerName}
PHONE: ${data.phone}
EMAIL: ${data.email}
SERVICE: ${data.serviceType}
DATE: ${data.date}

REJECTION REASON: ${reason}

The customer has been notified via email.

Submitted: ${data.timestamp}
    `.trim();
    
    GmailApp.sendEmail(BUSINESS_OWNER_EMAIL, subject, message);
    console.log('Owner rejection notification sent');
    
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
      '2025-06-20', // date (adjust to be 2+ weeks from today)
      '18:00' // time
    ]
  };
  
  console.log('Running test with sample data...');
  onFormSubmit(testData);
} 