import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LikeUserRequest {
  targetUserId: string;
  likeType: "like" | "super_like" | "pass" | "blink";
}

interface LikeUserResponse {
  success: boolean;
  likeId?: string;
  isMatch?: boolean;
  matchId?: string;
  creditsSpent?: number;
  newBalance?: number;
  error?: string;
  errorCode?: string;
}

const CREDIT_COSTS = {
  like: 0, // Regular likes are free
  super_like: 25, // Super likes cost 25 credits
  blink: 0, // Blinks are free
  pass: 0, // Passes are free
};

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
    const body: LikeUserRequest = await req.json();
    const { targetUserId, likeType } = body;

    // Validate input
    if (!targetUserId || !likeType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: targetUserId and likeType",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate like type
    if (!(["like", "super_like", "pass", "blink"] as const).includes(likeType as any)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid like type",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prevent self-likes
    if (targetUserId === user.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cannot like yourself",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if target user exists
    const { data: targetUser, error: targetError } = await supabaseClient
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Target user not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check rate limiting
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient.rpc(
      'check_and_update_rate_limit',
      {
        p_user_id: user.id,
        p_action_type: 'likes',
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

    // Determine credit cost
    const creditCost = CREDIT_COSTS[likeType];

    // Check if user has sufficient credits for super likes
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
            error: "Insufficient credits for super like",
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

    // Record the like
    const { data: likeData, error: likeError } = await supabaseClient
      .from("user_likes")
      .upsert(
        {
          user_id: user.id,
          target_user_id: targetUserId,
          like_type: likeType,
        },
        { onConflict: "user_id,target_user_id" }
      )
      .select("id")
      .single();

    if (likeError) {
      console.error("Like creation error:", likeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to record like",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if this creates a mutual match (only for like/super_like)
    let isMatch = false;
    let matchId: string | undefined;

    if (likeType === "like" || likeType === "super_like") {
      // Check if target user has also liked this user
      const { data: reciprocalLike } = await supabaseClient
        .from("user_likes")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("target_user_id", user.id)
        .in("like_type", ["like", "super_like"])
        .maybeSingle();

      if (reciprocalLike) {
        isMatch = true;

        // Create match record
        const [userId1, userId2] = [user.id, targetUserId].sort();

        const { data: matchData, error: matchError } = await supabaseClient
          .from("matches")
          .upsert(
            {
              user1_id: userId1,
              user2_id: userId2,
              is_active: true,
              last_activity: new Date().toISOString(),
            },
            { onConflict: "user1_id,user2_id" }
          )
          .select("id")
          .single();

        if (!matchError && matchData) {
          matchId = matchData.id;
        }
      }
    }

    // Deduct credits if applicable
    let newBalance = 0;
    if (creditCost > 0) {
      const { data: spendResult, error: spendError } = await supabaseClient.rpc(
        "spend_credits_atomic",
        {
          p_user_id: user.id,
          p_amount: creditCost,
          p_description: `Super liked user ${targetUserId}`,
          p_category: "likes",
        }
      );

      if (spendError || !spendResult?.success) {
        console.error("Credit deduction error:", spendError || spendResult);
        // Like was recorded but credits weren't deducted
        console.error("CRITICAL: Like recorded but credits not deducted", {
          userId: user.id,
          likeId: likeData.id,
          amount: creditCost,
        });
      } else {
        newBalance = spendResult.new_balance;
      }
    } else {
      // Get current balance for free likes
      const { data: balance } = await supabaseClient.rpc("get_user_balance", {
        p_user_id: user.id,
      });
      if (balance && balance.length > 0) {
        newBalance = balance[0].total_credits;
      }
    }

    // Return success response
    const response: LikeUserResponse = {
      success: true,
      likeId: likeData.id,
      isMatch,
      matchId,
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
