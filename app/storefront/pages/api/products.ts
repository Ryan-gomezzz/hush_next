import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient, checkAdmin, getCorsHeaders } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const headers = getCorsHeaders('GET, POST, PUT, DELETE, OPTIONS');
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const supabase = createServerSupabaseClient();
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (req.method === 'GET') {
      // Public: Get products
      const { limit = '20', page = '1', q, sort = 'created_at' } = req.query;
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order(sort as string, { ascending: false })
        .range((parseInt(page as string) - 1) * parseInt(limit as string), parseInt(page as string) * parseInt(limit as string) - 1);

      if (q) {
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({ products: data });
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      // Admin only
      const isAdmin = await checkAdmin(req);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      if (req.method === 'POST') {
        const { data, error } = await supabase.from('products').insert(req.body).select().single();

        if (error) throw error;

        return res.status(201).json({ product: data });
      }

      if (req.method === 'PUT') {
        const productId = req.query.id as string;
        const { data, error } = await supabase
          .from('products')
          .update(req.body)
          .eq('id', productId)
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({ product: data });
      }

      if (req.method === 'DELETE') {
        const productId = req.query.id as string;
        const { error } = await supabase
          .from('products')
          .update({ active: false })
          .eq('id', productId);

        if (error) throw error;

        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in products API:', error);
    return res.status(500).json({ error: error.message });
  }
}

