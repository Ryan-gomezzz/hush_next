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

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }
  
  return chunks;
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
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const isAdmin = await checkAdmin(authHeader || null);

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    const { doc_type, doc_id, content, metadata = {} } = JSON.parse(event.body || '{}');

    if (!doc_type || !doc_id || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: doc_type, doc_id, content' }),
      };
    }

    // Chunk the content
    const chunks = chunkText(content);
    const batchSize = 10;
    let totalProcessed = 0;

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Create embeddings for batch
      const embeddingPromises = batch.map(chunk => 
        openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunk,
        })
      );
      
      const embeddingResponses = await Promise.all(embeddingPromises);
      const embeddings = embeddingResponses.map(res => res.data[0].embedding);

      // Insert into database
      const insertData = batch.map((chunk, idx) => ({
        doc_type,
        doc_id,
        embedding: `[${embeddings[idx].join(',')}]`,
        content: chunk,
        metadata: { ...metadata, chunk_index: i + idx, total_chunks: chunks.length },
      }));

      const { error: insertError } = await supabase.from('embeddings').insert(insertData);
      if (insertError) throw insertError;

      totalProcessed += batch.length;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        chunks_processed: totalProcessed,
        message: `Ingested ${totalProcessed} chunks for ${doc_type}:${doc_id}`,
      }),
    };
  } catch (error: any) {
    console.error('Error in ingest-embeddings function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

