import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient, checkAdmin, getCorsHeaders } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const headers = getCorsHeaders('GET, POST, OPTIONS');
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const supabase = createServerSupabaseClient();
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (req.method === 'POST') {
      const body = req.body;

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
          return res.status(200).json({ valid: false, error: 'Invalid coupon code' });
        }

        // Check if coupon is within date range
        const now = new Date();
        if (coupon.starts_at && new Date(coupon.starts_at) > now) {
          return res.status(200).json({ valid: false, error: 'Coupon not yet active' });
        }
        if (coupon.ends_at && new Date(coupon.ends_at) < now) {
          return res.status(200).json({ valid: false, error: 'Coupon has expired' });
        }

        // Check usage limit
        if (coupon.usage_limit && coupon.uses >= coupon.usage_limit) {
          return res.status(200).json({ valid: false, error: 'Coupon usage limit reached' });
        }

        // Calculate discount
        const subtotal = cart.reduce((sum: number, item: any) => sum + item.price_cents * item.qty, 0);
        let discount = 0;

        if (coupon.discount_type === 'PERCENT' && coupon.discount_pct) {
          discount = Math.floor((subtotal * coupon.discount_pct) / 100);
        } else if (coupon.discount_type === 'FIXED' && coupon.discount_cents) {
          discount = coupon.discount_cents;
        }

        return res.status(200).json({
          valid: true,
          coupon,
          discount,
          subtotal,
          total: Math.max(0, subtotal - discount),
        });
      } else {
        // Admin: Create coupon
        const isAdmin = await checkAdmin(req);
        if (!isAdmin) {
          return res.status(403).json({ error: 'Admin access required' });
        }

        const { data, error } = await supabase.from('coupons').insert(body).select().single();

        if (error) throw error;

        return res.status(201).json({ coupon: data });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in coupons API:', error);
    return res.status(500).json({ error: error.message });
  }
}

