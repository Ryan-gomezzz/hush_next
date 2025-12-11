// API route to get auth token for admin operations
// This is a helper endpoint for the chatbot ingestion feature

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return the access token (not the full session for security)
    return res.status(200).json({ token: session.access_token });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

