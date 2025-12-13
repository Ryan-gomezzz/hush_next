import { createClient } from '@supabase/supabase-js';
import { NextApiRequest } from 'next';

// Create Supabase server client with service role key
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Check if user is admin
export async function checkAdmin(req: NextApiRequest): Promise<boolean> {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

// CORS headers helper
export function getCorsHeaders(allowedMethods: string = 'GET, POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': allowedMethods,
    'Content-Type': 'application/json',
  };
}

