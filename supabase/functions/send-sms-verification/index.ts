import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check rate limiting
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient.rpc(
      'check_and_update_rate_limit',
      {
        p_user_id: user.id,
        p_action_type: 'api_calls',
        p_increment: true,
      }
    );

    if (rateLimitError || !rateLimitCheck) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    // Get Twilio credentials - try multiple possible environment variable names
    let TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || Deno.env.get('Twilio_Account_SID');
    let TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || Deno.env.get('Twilio_AUTH_Token') || Deno.env.get('TWILIO_AUTH_TOKEN');
    let TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || Deno.env.get('Twilio_Phone_number');

    // Log what we found (first 4 chars only for security)
    console.log('Checking Twilio credentials:');
    console.log('- TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.substring(0, 4)}... (length: ${TWILIO_ACCOUNT_SID.length})` : 'NOT FOUND');
    console.log('- TWILIO_AUTH_TOKEN:', TWILIO_AUTH_TOKEN ? `${TWILIO_AUTH_TOKEN.substring(0, 4)}... (length: ${TWILIO_AUTH_TOKEN.length})` : 'NOT FOUND');
    console.log('- TWILIO_PHONE_NUMBER:', TWILIO_PHONE_NUMBER || 'NOT FOUND');

    // List all environment variables that start with TWILIO (for debugging)
    console.log('All TWILIO env vars:', Object.keys(Deno.env.toObject()).filter(k => k.toUpperCase().includes('TWILIO')));

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials not configured properly');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to Edge Function secrets.',
          testMode: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { phoneNumber, otp }: SendSMSRequest = await req.json();

    console.log('Request received for phone:', phoneNumber);

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

    // Verify credentials are correct format
    if (!TWILIO_ACCOUNT_SID.startsWith('AC')) {
      console.error('Invalid Account SID format - should start with AC');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid Twilio Account SID format. It should start with "AC".',
          details: 'Please check your TWILIO_ACCOUNT_SID secret in Supabase'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    // Create Basic Auth header
    const authString = `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`;
    const authHeader = btoa(authString);
    
    console.log('Attempting Twilio API call...');
    console.log('URL:', twilioUrl);
    console.log('Auth header length:', authHeader.length);

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
    console.log('Twilio response:', responseText);

    if (!twilioResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      
      console.error('Twilio API error:', errorData);
      
      // Provide specific error messages
      let userMessage = 'Failed to send SMS. ';
      let details = '';
      
      if (errorData.code === 20003) {
        userMessage = 'Authentication failed with Twilio.';
        details = 'Please verify your Twilio credentials in Supabase Edge Function secrets:\n- TWILIO_ACCOUNT_SID should start with AC\n- TWILIO_AUTH_TOKEN should be 32 characters\n- Make sure there are no spaces or extra characters';
      } else if (errorData.code === 21211) {
        userMessage = 'Invalid phone number format.';
        details = 'Please enter a valid phone number with country code (e.g., +1234567890)';
      } else if (errorData.code === 21608) {
        userMessage = 'The phone number is not verified in your Twilio trial account.';
        details = 'Visit https://console.twilio.com/us1/develop/phone-numbers/manage/verified to add this number';
      } else if (errorData.code === 21606) {
        userMessage = 'The From phone number is not valid or not owned by your account.';
        details = 'Check your TWILIO_PHONE_NUMBER setting and verify it exists in your Twilio account';
      } else if (errorData.message) {
        userMessage = errorData.message;
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userMessage,
          details: `Twilio error code: ${errorData.code || 'unknown'}${details ? '\n\n' + details : ''}`,
          twilioError: errorData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const twilioData = JSON.parse(responseText);
    console.log('✅ SMS sent successfully! Message SID:', twilioData.sid);

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
    console.error('Unexpected error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred',
        message: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});