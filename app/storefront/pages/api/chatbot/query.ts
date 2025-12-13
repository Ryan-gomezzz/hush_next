import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient, getCorsHeaders } from '@/lib/apiHelpers';
import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error('OPENAI_API_KEY is not set');
}

const openai = new OpenAI({ apiKey: openaiApiKey });

// Simple rate limiting (use Redis in production)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  const recent = requests.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const headers = getCorsHeaders('POST, OPTIONS');
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    // Rate limiting
    const clientIP = (req.headers['x-forwarded-for'] as string) || 
                     (req.headers['x-real-ip'] as string) || 
                     req.socket.remoteAddress || 
                     'unknown';
    
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { message, session_id, top_k = 5 } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid message' });
    }

    // Create embedding for user query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: message,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Vector search in embeddings table
    const supabase = createServerSupabaseClient();
    const { data: similarDocs, error: searchError } = await supabase.rpc('match_embeddings', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: 0.7,
      match_count: top_k,
    }).catch(async () => {
      // Fallback: get all embeddings and filter client-side (not ideal for production)
      const { data } = await supabase.from('embeddings').select('*').limit(100);
      return { data: data || [], error: null };
    });

    const contextDocs = similarDocs || [];

    // Build context
    const context = contextDocs
      .map((doc: any, idx: number) => `[${idx + 1}] ${doc.content}`)
      .join('\n\n');

    // Extract product IDs
    const productIds = contextDocs
      .filter((doc: any) => doc.doc_type === 'product' && doc.doc_id)
      .map((doc: any) => doc.doc_id)
      .filter((id: string, idx: number, arr: string[]) => arr.indexOf(id) === idx)
      .slice(0, 3);

    // Query LLM
    const systemPrompt = `You are a helpful customer service assistant for a cosmetics e-commerce store. 
Answer questions about products, ingredients, usage, and general inquiries. 
Be friendly, concise, and helpful. If you mention a product, reference it by name.
If you don't know something, say so honestly.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `Relevant context:\n${context}` },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0].message.content || 'I apologize, but I could not generate a response.';

    // Log event
    await supabase.from('events').insert({
      event_type: 'chatbot_query',
      payload: {
        session_id,
        message_length: message.length,
        results_count: contextDocs.length,
      },
    }).catch(err => console.error('Failed to log event:', err));

    return res.status(200).json({
      answer,
      suggestions: productIds,
      sources: contextDocs.map((doc: any) => ({
        doc_type: doc.doc_type,
        doc_id: doc.doc_id,
        preview: doc.content.substring(0, 100) + '...',
      })),
    });
  } catch (error: any) {
    console.error('Error in chatbot-query API:', error);
    return res.status(500).json({ error: error.message });
  }
}

