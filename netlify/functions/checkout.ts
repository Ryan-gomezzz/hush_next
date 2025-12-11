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

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { user_id, items, total_cents, coupon_id, shipping } = JSON.parse(event.body || '{}');

    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cart is empty' }),
      };
    }

    // Check inventory and reserve items
    for (const item of items) {
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('qty, reserved')
        .eq('product_id', item.product_id)
        .single();

      if (invError || !inventory) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Product ${item.product_id} not found in inventory` }),
        };
      }

      const available = inventory.qty - inventory.reserved;
      if (available < item.qty) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Insufficient stock for ${item.name}` }),
        };
      }
    }

    // Create order in transaction
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user_id || null,
        status: 'PENDING',
        total_cents,
        currency: 'INR',
        shipping,
        coupon_id: coupon_id || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      sku: item.sku,
      name: item.name,
      unit_price_cents: item.price_cents,
      qty: item.qty,
      metadata: {},
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    // Reserve inventory
    for (const item of items) {
      await supabase.rpc('increment_reserved', {
        product_id: item.product_id,
        qty: item.qty,
      }).catch(async () => {
        // Fallback if RPC doesn't exist
        const { data: inv } = await supabase
          .from('inventory')
          .select('reserved')
          .eq('product_id', item.product_id)
          .single();
        
        await supabase
          .from('inventory')
          .update({ reserved: (inv?.reserved || 0) + item.qty })
          .eq('product_id', item.product_id);
      });
    }

    // Update coupon usage if applicable
    if (coupon_id) {
      await supabase.rpc('increment_coupon_uses', { coupon_id }).catch(async () => {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('uses')
          .eq('id', coupon_id)
          .single();
        
        await supabase
          .from('coupons')
          .update({ uses: (coupon?.uses || 0) + 1 })
          .eq('id', coupon_id);
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ order }),
    };
  } catch (error: any) {
    console.error('Error in checkout function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

