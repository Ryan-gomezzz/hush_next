import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient, checkAdmin, getCorsHeaders } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const headers = getCorsHeaders('GET, OPTIONS');
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const isAdmin = await checkAdmin(req);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const supabase = createServerSupabaseClient();

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

    return res.status(200).json({
      daily_events: dailyEvents.data || [],
      conversion: conversion.data || [],
      top_products: topProducts.data || [],
      coupon_usage: Object.entries(couponStats).map(([code, count]) => ({ code, count })),
    });
  } catch (error: any) {
    console.error('Error in admin-metrics API:', error);
    return res.status(500).json({ error: error.message });
  }
}

