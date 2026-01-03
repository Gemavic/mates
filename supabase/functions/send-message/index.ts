import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendMessageRequest {
  recipientId: string;
  message: string;
  threadId?: string;
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
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
    const body: SendMessageRequest = await req.json();
    const { recipientId, message, threadId } = body;

    // Validate input
    if (!recipientId || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: recipientId and message",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (message.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Message cannot be empty" }),
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

    // Determine credit cost
    // First message in a thread is free, subsequent messages cost 10 credits
    let creditCost = 10;
    let isFirstMessage = false;

    // Check if this is first message in thread
    if (threadId) {
      const { count } = await supabaseClient
        .from("mail_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", threadId)
        .eq("sender_id", user.id);

      if (count === 0) {
        creditCost = 0;
        isFirstMessage = true;
      }
    } else {
      // New thread - first message is free
      creditCost = 0;
      isFirstMessage = true;
    }

    // Check if user has sufficient credits (skip check for free messages)
    if (creditCost > 0) {
      const { data: hasCredits, error: checkError } = await supabaseClient.rpc(
        "check_sufficient_credits",
        {
          p_user_id: user.id,
          p_amount: creditCost,
        }
      );

      if (checkError) {
        console.error("Credit check error:", checkError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to check credits",
            errorCode: "CREDIT_CHECK_FAILED",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!hasCredits) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Insufficient credits",
            errorCode: "INSUFFICIENT_CREDITS",
            required: creditCost,
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Find or create mail thread
    const [participant1, participant2] = [user.id, recipientId].sort();

    let finalThreadId = threadId;

    if (!finalThreadId) {
      // Try to find existing thread
      const { data: existingThread } = await supabaseClient
        .from("mail_threads")
        .select("id")
        .eq("participant1_id", participant1)
        .eq("participant2_id", participant2)
        .maybeSingle();

      if (existingThread) {
        finalThreadId = existingThread.id;
      } else {
        // Create new thread
        const { data: newThread, error: threadError } = await supabaseClient
          .from("mail_threads")
          .insert({
            participant1_id: participant1,
            participant2_id: participant2,
          })
          .select("id")
          .single();

        if (threadError) {
          console.error("Thread creation error:", threadError);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Failed to create conversation thread",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        finalThreadId = newThread.id;
      }
    }

    // Send the message
    const { data: messageData, error: messageError } = await supabaseClient
      .from("mail_messages")
      .insert({
        thread_id: finalThreadId,
        sender_id: user.id,
        subject: "Chat Message",
        message_text: message,
        credits_spent: creditCost,
      })
      .select("id")
      .single();

    if (messageError) {
      console.error("Message send error:", messageError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send message",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deduct credits if not free
    let newBalance = 0;
    if (creditCost > 0) {
      const { data: spendResult, error: spendError } = await supabaseClient.rpc(
        "spend_credits_atomic",
        {
          p_user_id: user.id,
          p_amount: creditCost,
          p_description: `Sent message to ${recipientId}`,
          p_category: "messaging",
        }
      );

      if (spendError || !spendResult?.success) {
        console.error("Credit deduction error:", spendError || spendResult);
        // Message was sent but credits weren't deducted
        // Log this for manual review
        console.error("CRITICAL: Message sent but credits not deducted", {
          userId: user.id,
          messageId: messageData.id,
          amount: creditCost,
        });
      } else {
        newBalance = spendResult.new_balance;
      }
    } else {
      // Get current balance for free messages
      const { data: balance } = await supabaseClient.rpc("get_user_balance", {
        p_user_id: user.id,
      });
      if (balance && balance.length > 0) {
        newBalance = balance[0].total_credits;
      }
    }

    // Update thread timestamp
    await supabaseClient
      .from("mail_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", finalThreadId);

    // Return success response
    const response: SendMessageResponse = {
      success: true,
      messageId: messageData.id,
      threadId: finalThreadId,
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
