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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const isAdmin = await checkAdmin(authHeader || null);

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    const [dailyEvents, conversion, topProducts, couponUsage] = await Promise.all([
      supabase.from('daily_events').select('*').order('day', { ascending: true }).limit(30),
      supabase.from('daily_conversion').select('*').order('day', { ascending: true }).limit(30),
      supabase.from('top_products_last_30d').select('*'),
      supabase
        .from('orders')
        .select('coupon_id, coupons(code)')
        .not('coupon_id', 'is', null),
    ]);

    // Process coupon usage
    const couponStats: Record<string, number> = {};
    (couponUsage.data || []).forEach((order: any) => {
      const code = order.coupons?.code || 'unknown';
      couponStats[code] = (couponStats[code] || 0) + 1;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        daily_events: dailyEvents.data || [],
        conversion: conversion.data || [],
        top_products: topProducts.data || [],
        coupon_usage: Object.entries(couponStats).map(([code, count]) => ({ code, count })),
      }),
    };
  } catch (error: any) {
    console.error('Error in admin-metrics function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

