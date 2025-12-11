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
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (event.httpMethod === 'GET') {
      // Public: Get products
      const { limit = 20, page = 1, q, sort = 'created_at' } = event.queryStringParameters || {};
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order(sort, { ascending: false })
        .range((parseInt(page as string) - 1) * parseInt(limit as string), parseInt(page as string) * parseInt(limit as string) - 1);

      if (q) {
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ products: data }),
      };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT' || event.httpMethod === 'DELETE') {
      // Admin only
      const isAdmin = await checkAdmin(authHeader || null);
      if (!isAdmin) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Admin access required' }),
        };
      }

      if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const { data, error } = await supabase.from('products').insert(body).select().single();

        if (error) throw error;

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ product: data }),
        };
      }

      if (event.httpMethod === 'PUT') {
        const productId = event.path.split('/').pop();
        const body = JSON.parse(event.body || '{}');
        const { data, error } = await supabase
          .from('products')
          .update(body)
          .eq('id', productId)
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ product: data }),
        };
      }

      if (event.httpMethod === 'DELETE') {
        const productId = event.path.split('/').pop();
        const { error } = await supabase
          .from('products')
          .update({ active: false })
          .eq('id', productId);

        if (error) throw error;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error: any) {
    console.error('Error in products function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

