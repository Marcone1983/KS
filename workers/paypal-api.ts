/// <reference types="@cloudflare/workers-types" />

/**
 * Kurstaki Strike - PayPal API Worker
 * Enterprise-grade payment processing with Cloudflare Workers
 * 
 * Features:
 * - PayPal Order Creation
 * - Payment Capture
 * - Premium Status Management
 * - D1 Database Integration
 * - KV Storage for Sessions
 */

export interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_MODE: 'sandbox' | 'live';
  KS_DB: D1Database;
  KS_KV: KVNamespace;
}

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

const PAYPAL_URLS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

// Get PayPal access token
async function getPayPalAccessToken(env: Env): Promise<string> {
  // Check cache first
  const cachedToken = await env.KS_KV.get('paypal_access_token');
  if (cachedToken) {
    return cachedToken;
  }

  const baseUrl = PAYPAL_URLS[env.PAYPAL_MODE];
  const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.status}`);
  }

  const data: PayPalAccessToken = await response.json();
  
  // Cache token for 1 hour (expires_in is usually 32400 seconds)
  await env.KS_KV.put('paypal_access_token', data.access_token, {
    expirationTtl: 3600,
  });

  return data.access_token;
}

// Create PayPal order for $10 premium unlock
async function createOrder(env: Env, userId: string): Promise<PayPalOrder> {
  const accessToken = await getPayPalAccessToken(env);
  const baseUrl = PAYPAL_URLS[env.PAYPAL_MODE];

  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: `ks_premium_${userId}_${Date.now()}`,
        description: 'Kurstaki Strike - Premium Unlock (Lifetime)',
        amount: {
          currency_code: 'USD',
          value: '10.00',
        },
        custom_id: userId,
      },
    ],
    application_context: {
      brand_name: 'Kurstaki Strike',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: 'https://kurstaki-strike.app/payment/success',
      cancel_url: 'https://kurstaki-strike.app/payment/cancel',
    },
  };

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `ks_${userId}_${Date.now()}`,
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal order creation failed: ${error}`);
  }

  const order: PayPalOrder = await response.json();

  // Store order in D1 database
  await env.KS_DB.prepare(
    `INSERT INTO payments (order_id, user_id, amount, currency, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(order.id, userId, '10.00', 'USD', 'CREATED', new Date().toISOString()).run();

  return order;
}

// Capture PayPal order after user approval
async function captureOrder(env: Env, orderId: string): Promise<any> {
  const accessToken = await getPayPalAccessToken(env);
  const baseUrl = PAYPAL_URLS[env.PAYPAL_MODE];

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal capture failed: ${error}`);
  }

  const captureData = await response.json();

  if (captureData.status === 'COMPLETED') {
    // Get user ID from order
    const payment = await env.KS_DB.prepare(
      `SELECT user_id FROM payments WHERE order_id = ?`
    ).bind(orderId).first();

    if (payment) {
      const userId = payment.user_id as string;

      // Update payment status
      await env.KS_DB.prepare(
        `UPDATE payments SET status = ?, captured_at = ? WHERE order_id = ?`
      ).bind('COMPLETED', new Date().toISOString(), orderId).run();

      // Grant premium status to user
      await env.KS_DB.prepare(
        `INSERT INTO premium_users (user_id, order_id, granted_at, is_lifetime)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET order_id = ?, granted_at = ?`
      ).bind(userId, orderId, new Date().toISOString(), true, orderId, new Date().toISOString()).run();

      // Cache premium status in KV for fast lookups
      await env.KS_KV.put(`premium_${userId}`, 'true', {
        expirationTtl: 86400 * 365, // 1 year cache
      });
    }
  }

  return captureData;
}

// Check if user has premium status
async function checkPremiumStatus(env: Env, userId: string): Promise<boolean> {
  // Check KV cache first
  const cached = await env.KS_KV.get(`premium_${userId}`);
  if (cached === 'true') {
    return true;
  }

  // Check D1 database
  const result = await env.KS_DB.prepare(
    `SELECT * FROM premium_users WHERE user_id = ? AND is_lifetime = true`
  ).bind(userId).first();

  if (result) {
    // Update cache
    await env.KS_KV.put(`premium_${userId}`, 'true', {
      expirationTtl: 86400 * 365,
    });
    return true;
  }

  return false;
}

// Main worker handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Create order endpoint
      if (path === '/api/paypal/create-order' && request.method === 'POST') {
        const body = await request.json() as { userId: string };
        const order = await createOrder(env, body.userId);
        
        return new Response(JSON.stringify({
          success: true,
          orderId: order.id,
          approvalUrl: order.links.find(l => l.rel === 'approve')?.href,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Capture order endpoint
      if (path === '/api/paypal/capture-order' && request.method === 'POST') {
        const body = await request.json() as { orderId: string };
        const result = await captureOrder(env, body.orderId);
        
        return new Response(JSON.stringify({
          success: result.status === 'COMPLETED',
          status: result.status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check premium status endpoint
      if (path === '/api/premium/status' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const isPremium = await checkPremiumStatus(env, userId);
        
        return new Response(JSON.stringify({
          isPremium,
          userId,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Health check
      if (path === '/api/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'Kurstaki Strike API',
          version: '1.0.0',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
