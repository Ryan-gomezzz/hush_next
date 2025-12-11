// Supabase Edge Function: Ingest Embeddings
// This function processes documents, creates embeddings, and stores them in pgvector
// Usage: POST /functions/v1/ingest_embeddings
// Body: { doc_type, doc_id, content, metadata? }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PGVECTOR_DIMENSION = parseInt(Deno.env.get("PGVECTOR_DIMENSION") || "1536");

// Chunk text into smaller pieces for embedding (max ~8000 tokens per chunk)
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }
  
  return chunks;
}

// Create embedding using OpenAI API
async function createEmbedding(text) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user is admin (check profile.role)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { doc_type, doc_id, content, metadata = {} } = await req.json();

    if (!doc_type || !doc_id || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: doc_type, doc_id, content" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Chunk the content
    const chunks = chunkText(content);
    const results = [];

    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Create embeddings for batch
      const embeddingPromises = batch.map(chunk => createEmbedding(chunk));
      const embeddings = await Promise.all(embeddingPromises);

      // Insert into database
      const insertPromises = batch.map((chunk, idx) => {
        return supabase.from("embeddings").insert({
          doc_type,
          doc_id,
          embedding: `[${embeddings[idx].join(",")}]`, // Convert array to PostgreSQL vector format
          content: chunk,
          metadata: { ...metadata, chunk_index: i + idx, total_chunks: chunks.length },
        });
      });

      const insertResults = await Promise.all(insertPromises);
      results.push(...insertResults);
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunks_processed: chunks.length,
        message: `Ingested ${chunks.length} chunks for ${doc_type}:${doc_id}`,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in ingest_embeddings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

