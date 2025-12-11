import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
    // Rate limiting
    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    if (!checkRateLimit(clientIP as string)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      };
    }

    const { message, session_id, top_k = 5 } = JSON.parse(event.body || '{}');

    if (!message || typeof message !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid message' }),
      };
    }

    // Create embedding for user query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: message,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Vector search in embeddings table
    // Use the match_embeddings function if available, otherwise fallback
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        answer,
        suggestions: productIds,
        sources: contextDocs.map((doc: any) => ({
          doc_type: doc.doc_type,
          doc_id: doc.doc_id,
          preview: doc.content.substring(0, 100) + '...',
        })),
      }),
    };
  } catch (error: any) {
    console.error('Error in chatbot-query function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

