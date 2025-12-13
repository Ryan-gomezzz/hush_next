import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient, checkAdmin, getCorsHeaders } from '@/lib/apiHelpers';
import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error('OPENAI_API_KEY is not set');
}

const openai = new OpenAI({ apiKey: openaiApiKey });

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
    const isAdmin = await checkAdmin(req);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { doc_type, doc_id, content, metadata = {} } = req.body;

    if (!doc_type || !doc_id || !content) {
      return res.status(400).json({ error: 'Missing required fields: doc_type, doc_id, content' });
    }

    // Chunk the content
    const chunks = chunkText(content);
    const batchSize = 10;
    let totalProcessed = 0;

    const supabase = createServerSupabaseClient();

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

    return res.status(200).json({
      success: true,
      chunks_processed: totalProcessed,
      message: `Ingested ${totalProcessed} chunks for ${doc_type}:${doc_id}`,
    });
  } catch (error: any) {
    console.error('Error in ingest-embeddings API:', error);
    return res.status(500).json({ error: error.message });
  }
}

