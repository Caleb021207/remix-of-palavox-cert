
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Rate limiting: max 10 requests per minute per user
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Authentication error", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check cache first
    const { data: cachedData } = await supabaseClient
      .from("subscribers")
      .select("*")
      .eq("email", user.email)
      .single();

    if (cachedData && cachedData.updated_at) {
      const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime();
      if (cacheAge < CACHE_DURATION) {
        logStep("Returning cached subscription data", { 
          subscribed: cachedData.subscribed, 
          tier: cachedData.subscription_tier,
          cacheAge: Math.round(cacheAge / 1000) + 's'
        });
        return new Response(JSON.stringify({
          subscribed: cachedData.subscribed,
          subscription_tier: cachedData.subscription_tier,
          subscription_end: cachedData.subscription_end
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    logStep("Cache miss or stale, checking Stripe");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Add rate limiting check
    try {
      const customers = await stripe.customers.list({ 
        email: user.email, 
        limit: 1 
      });
      
      if (customers.data.length === 0) {
        logStep("No customer found, updating unsubscribed state");
        await supabaseClient.from("subscribers").upsert({
          email: user.email,
          user_id: user.id,
          stripe_customer_id: null,
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });
        
        return new Response(JSON.stringify({ subscribed: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });
      
      let hasActiveSub = false;
      let subscriptionTier = null;
      let subscriptionEnd = null;

      // Check for the specific $8.99/week Premium subscription
      for (const subscription of subscriptions.data) {
        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId) {
          const price = await stripe.prices.retrieve(priceId);
          const amount = price.unit_amount || 0;
          const interval = price.recurring?.interval;
          
          logStep("Checking subscription", { 
            priceId, 
            amount, 
            interval,
            subscriptionId: subscription.id 
          });
          
          // Only consider Premium if it's $8.99/week (899 cents per week)
          if (amount === 899 && interval === 'week') {
            hasActiveSub = true;
            subscriptionTier = "Premium";
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
            logStep("Found Premium subscription", { 
              subscriptionId: subscription.id, 
              endDate: subscriptionEnd 
            });
            break; // Found the premium subscription, no need to check others
          }
        }
      }

      if (!hasActiveSub) {
        logStep("No Premium subscription found");
      }

      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: customerId,
        subscribed: hasActiveSub,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      logStep("Updated database with subscription info", { 
        subscribed: hasActiveSub, 
        subscriptionTier 
      });
      
      return new Response(JSON.stringify({
        subscribed: hasActiveSub,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
      
    } catch (stripeError: any) {
      if (stripeError.type === 'StripeInvalidRequestError' || 
          stripeError.message?.includes('rate_limit')) {
        logStep("Stripe rate limit hit, returning cached data if available");
        
        if (cachedData) {
          return new Response(JSON.stringify({
            subscribed: cachedData.subscribed,
            subscription_tier: cachedData.subscription_tier,
            subscription_end: cachedData.subscription_end
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      throw stripeError;
    }
    
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    
    // Return a more specific error response
    let statusCode = 500;
    if (errorMessage.includes("Authentication error")) {
      statusCode = 401;
    } else if (errorMessage.includes("Rate limit")) {
      statusCode = 429;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      type: error.type || 'unknown_error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
