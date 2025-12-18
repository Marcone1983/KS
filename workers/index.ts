/**
 * KannaSprout API - Cloudflare Worker
 * Handles PayPal payments and premium verification
 */

export interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_MODE: string; // 'sandbox' or 'live'
  DATABASE_URL: string;
  COOKIE_SECRET: string;
}

const PAYPAL_SANDBOX_URL = "https://api-m.sandbox.paypal.com";
const PAYPAL_LIVE_URL = "https://api-m.paypal.com";
const PREMIUM_PRICE = "10.00";
const PREMIUM_CURRENCY = "USD";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper: Get PayPal API URL
function getPayPalUrl(env: Env): string {
  return env.PAYPAL_MODE === "live" ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL;
}

// Helper: Get PayPal access token
async function getPayPalAccessToken(env: Env): Promise<string> {
  const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  
  const response = await fetch(`${getPayPalUrl(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

// Create PayPal order
async function createPayPalOrder(env: Env): Promise<Response> {
  try {
    const accessToken = await getPayPalAccessToken(env);
    
    const orderResponse = await fetch(`${getPayPalUrl(env)}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: PREMIUM_CURRENCY,
            value: PREMIUM_PRICE,
          },
          description: "KannaSprout Premium - Lifetime Access",
        }],
        application_context: {
          brand_name: "KannaSprout",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: "https://kannasprout.app/payment/success",
          cancel_url: "https://kannasprout.app/payment/cancel",
        },
      }),
    });

    const orderData = await orderResponse.json() as {
      id: string;
      links: Array<{ rel: string; href: string }>;
    };
    
    return new Response(JSON.stringify({
      success: true,
      orderId: orderData.id,
      approvalUrl: orderData.links?.find((l) => l.rel === "approve")?.href,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to create PayPal order",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Capture PayPal payment
async function capturePayPalOrder(env: Env, orderId: string): Promise<Response> {
  try {
    const accessToken = await getPayPalAccessToken(env);
    
    const captureResponse = await fetch(
      `${getPayPalUrl(env)}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await captureResponse.json() as {
      status: string;
      payer?: { payer_id: string };
    };
    
    if (captureData.status === "COMPLETED") {
      return new Response(JSON.stringify({
        success: true,
        isPremium: true,
        payerId: captureData.payer?.payer_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: "Payment was not completed",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to capture payment",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Verify PayPal order status
async function verifyPayPalOrder(env: Env, orderId: string): Promise<Response> {
  try {
    const accessToken = await getPayPalAccessToken(env);
    
    const response = await fetch(
      `${getPayPalUrl(env)}/v2/checkout/orders/${orderId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const orderData = await response.json() as { status: string };
    
    return new Response(JSON.stringify({
      success: true,
      status: orderData.status,
      isPremium: orderData.status === "COMPLETED",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to verify order",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Main request handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check
    if (path === "/api/health") {
      return new Response(JSON.stringify({ status: "ok", service: "kannasprout-api" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // PayPal endpoints
    if (path === "/api/paypal/create-order" && request.method === "POST") {
      return createPayPalOrder(env);
    }
    
    if (path === "/api/paypal/capture-order" && request.method === "POST") {
      const body = await request.json() as { orderId: string };
      if (!body.orderId) {
        return new Response(JSON.stringify({ error: "Missing orderId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return capturePayPalOrder(env, body.orderId);
    }
    
    if (path === "/api/paypal/verify-order" && request.method === "POST") {
      const body = await request.json() as { orderId: string };
      if (!body.orderId) {
        return new Response(JSON.stringify({ error: "Missing orderId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return verifyPayPalOrder(env, body.orderId);
    }
    
    // 404 for unknown routes
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};
