import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendSMSRequest {
  phoneNumber: string;
  otp: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get Twilio credentials from environment
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log('Environment check:', {
      hasSID: !!TWILIO_ACCOUNT_SID,
      hasToken: !!TWILIO_AUTH_TOKEN,
      hasPhone: !!TWILIO_PHONE_NUMBER,
      sidPrefix: TWILIO_ACCOUNT_SID?.substring(0, 4),
      phoneNumber: TWILIO_PHONE_NUMBER
    });

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured. Please contact support.',
          testMode: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { phoneNumber, otp }: SendSMSRequest = await req.json();

    console.log('Request received:', { phoneNumber, otpLength: otp?.length });

    if (!phoneNumber || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number and OTP are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Format phone number - ensure it starts with +
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      // If no country code, assume US/Canada (+1)
      formattedPhone = `+1${formattedPhone.replace(/[^0-9]/g, '')}`;
    }

    console.log('Formatted phone:', formattedPhone);

    // Create SMS message
    const message = `Your Dates verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this message.`;

    // Send SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    console.log('Attempting to send SMS via Twilio...');

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    });

    const responseText = await twilioResponse.text();
    console.log('Twilio response status:', twilioResponse.status);
    console.log('Twilio response body:', responseText);

    if (!twilioResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      
      console.error('Twilio API error:', errorData);
      
      // Provide more specific error messages
      let userMessage = 'Failed to send SMS. ';
      if (errorData.code === 21211) {
        userMessage += 'Invalid phone number format.';
      } else if (errorData.code === 21608) {
        userMessage += 'The phone number is not verified in your Twilio trial account.';
      } else if (errorData.code === 21606) {
        userMessage += 'The From phone number is not verified.';
      } else if (errorData.message) {
        userMessage += errorData.message;
      } else {
        userMessage += 'Please check your phone number and try again.';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userMessage,
          twilioError: errorData,
          details: `Twilio error code: ${errorData.code || 'unknown'}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const twilioData = JSON.parse(responseText);
    console.log('SMS sent successfully:', twilioData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully',
        messageSid: twilioData.sid
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred while sending SMS',
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});