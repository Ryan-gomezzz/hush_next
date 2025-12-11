import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (body.action === 'validate') {
        // Public: Validate coupon
        const { code, cart } = body;

        const { data: coupon, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', code.toUpperCase())
          .eq('active', true)
          .single();

        if (error || !coupon) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ valid: false, error: 'Invalid coupon code' }),
          };
        }

        // Check if coupon is within date range
        const now = new Date();
        if (coupon.starts_at && new Date(coupon.starts_at) > now) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ valid: false, error: 'Coupon not yet active' }),
          };
        }
        if (coupon.ends_at && new Date(coupon.ends_at) < now) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ valid: false, error: 'Coupon has expired' }),
          };
        }

        // Check usage limit
        if (coupon.usage_limit && coupon.uses >= coupon.usage_limit) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ valid: false, error: 'Coupon usage limit reached' }),
          };
        }

        // Calculate discount
        const subtotal = cart.reduce((sum: number, item: any) => sum + item.price_cents * item.qty, 0);
        let discount = 0;

        if (coupon.discount_type === 'PERCENT' && coupon.discount_pct) {
          discount = Math.floor((subtotal * coupon.discount_pct) / 100);
        } else if (coupon.discount_type === 'FIXED' && coupon.discount_cents) {
          discount = coupon.discount_cents;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            valid: true,
            coupon,
            discount,
            subtotal,
            total: Math.max(0, subtotal - discount),
          }),
        };
      } else {
        // Admin: Create coupon
        const isAdmin = await checkAdmin(authHeader || null);
        if (!isAdmin) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Admin access required' }),
          };
        }

        const { data, error } = await supabase.from('coupons').insert(body).select().single();

        if (error) throw error;

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ coupon: data }),
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error: any) {
    console.error('Error in coupons function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

