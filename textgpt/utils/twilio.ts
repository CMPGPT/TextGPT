import { Twilio } from 'twilio';

// Initialize Twilio client with environment variables
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  : null;

// Function to send SMS
export const sendSMS = async (
  to: string,
  body: string,
  from?: string
): Promise<{ success: boolean; error?: Error }> => {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    // Use provided number or default to environment variable
    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      throw new Error('No from phone number provided');
    }

    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to,
    });

    console.log(`Message sent with SID: ${message.sid}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error occurred'),
    };
  }
};

// Function to create a Twilio number
export const createTwilioNumber = async (
  areaCode?: string
): Promise<{ success: boolean; phoneNumber?: string; error?: Error }> => {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    // Purchase a phone number with optional area code
    const phoneNumberOptions: any = {};
    
    if (areaCode) {
      phoneNumberOptions.areaCode = areaCode;
    } else {
      phoneNumberOptions.country = 'US';
    }

    // First search for available numbers
    const availableNumbers = await twilioClient.availablePhoneNumbers('US')
      .local.list(phoneNumberOptions);

    if (availableNumbers.length === 0) {
      throw new Error('No available phone numbers found');
    }

    // Purchase the first available number
    const incomingPhoneNumber = await twilioClient.incomingPhoneNumbers
      .create({ phoneNumber: availableNumbers[0].phoneNumber });

    return {
      success: true,
      phoneNumber: incomingPhoneNumber.phoneNumber,
    };
  } catch (error) {
    console.error('Error creating Twilio number:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error occurred'),
    };
  }
};

export { twilioClient }; 