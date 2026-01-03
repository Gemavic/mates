import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendGiftRequest {
  recipientId: string;
  giftId: string;
  message?: string;
}

interface SendGiftResponse {
  success: boolean;
  sentGiftId?: string;
  creditsSpent?: number;
  newBalance?: number;
  error?: string;
  errorCode?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: SendGiftRequest = await req.json();
    const { recipientId, giftId, message = "" } = body;

    // Validate input
    if (!recipientId || !giftId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: recipientId and giftId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prevent self-gifts
    if (recipientId === user.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cannot send gift to yourself",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if recipient exists
    const { data: recipient, error: recipientError } = await supabaseClient
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", recipientId)
      .maybeSingle();

    if (recipientError || !recipient) {
      return new Response(
        JSON.stringify({ success: false, error: "Recipient not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get gift details and price
    const { data: gift, error: giftError } = await supabaseClient
      .from("virtual_gifts")
      .select("id, gift_name, price_credits, is_active")
      .eq("id", giftId)
      .maybeSingle();

    if (giftError || !gift) {
      return new Response(
        JSON.stringify({ success: false, error: "Gift not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!gift.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "Gift is no longer available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const creditCost = gift.price_credits;

    // Check rate limiting
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient.rpc(
      'check_and_update_rate_limit',
      {
        p_user_id: user.id,
        p_action_type: 'gifts',
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

    // Deduct credits FIRST (before sending gift)
    const { data: spendResult, error: spendError } = await supabaseClient.rpc(
      "spend_credits_atomic",
      {
        p_user_id: user.id,
        p_amount: creditCost,
        p_description: `Sent ${gift.gift_name} to ${recipientId}`,
        p_category: "gifts",
      }
    );

    if (spendError || !spendResult?.success) {
      console.error("Credit deduction error:", spendError || spendResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: spendResult?.error_code === 'INSUFFICIENT_CREDITS'
            ? "Insufficient credits"
            : "Failed to process payment",
          errorCode: spendResult?.error_code || "CREDIT_DEDUCTION_FAILED",
          required: creditCost,
        }),
        {
          status: spendResult?.error_code === 'INSUFFICIENT_CREDITS' ? 402 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newBalance = spendResult.new_balance;

    // Now send the gift (after payment successful)
    const { data: sentGiftData, error: sentGiftError } = await supabaseClient
      .from("sent_gifts")
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        gift_id: giftId,
        credits_spent: creditCost,
        message: message || null,
      })
      .select("id")
      .single();

    if (sentGiftError) {
      console.error("Gift send error:", sentGiftError);
      // Credits were deducted but gift failed to send
      console.error("CRITICAL: Credits deducted but gift failed to send", {
        userId: user.id,
        amount: creditCost,
        error: sentGiftError,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send gift. Credits have been deducted and will be refunded.",
          errorCode: "GIFT_SEND_FAILED",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Increment gift popularity score
    await supabaseClient
      .from("virtual_gifts")
      .update({
        popularity_score: gift.popularity_score ? gift.popularity_score + 1 : 1,
      })
      .eq("id", giftId);

    // Return success response
    const response: SendGiftResponse = {
      success: true,
      sentGiftId: sentGiftData.id,
      creditsSpent: creditCost,
      newBalance,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
