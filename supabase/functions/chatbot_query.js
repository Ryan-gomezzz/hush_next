// Supabase Edge Function: Chatbot Query with RAG
// This function handles chatbot queries using RAG (Retrieval Augmented Generation)
// Usage: POST /functions/v1/chatbot_query
// Body: { message, session_id?, top_k? }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PGVECTOR_DIMENSION = parseInt(Deno.env.get("PGVECTOR_DIMENSION") || "1536");

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Create embedding for user query
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

// Query LLM with context
async function queryLLM(systemPrompt, context, userMessage) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "system", content: `Relevant context:\n${context}` },
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { message, session_id, top_k = 5 } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create embedding for user query
    const queryEmbedding = await createEmbedding(message);

    // Vector search in embeddings table
    // Using pgvector cosine distance operator (<->)
    const embeddingStr = `[${queryEmbedding.join(",")}]`;
    
    const { data: similarDocs, error: searchError } = await supabase.rpc("match_embeddings", {
      query_embedding: embeddingStr,
      match_threshold: 0.7,
      match_count: top_k,
    });

    // Fallback to direct SQL if RPC function doesn't exist
    let contextDocs = similarDocs;
    if (searchError || !similarDocs) {
      // Direct query using vector distance
      const { data, error } = await supabase
        .from("embeddings")
        .select("content, metadata, doc_type, doc_id")
        .limit(top_k);
      
      if (error) {
        console.error("Error querying embeddings:", error);
        contextDocs = [];
      } else {
        // Simple fallback: return top results (in production, use proper vector search)
        contextDocs = data || [];
      }
    }

    // Build context from retrieved documents
    const context = contextDocs
      .map((doc, idx) => `[${idx + 1}] ${doc.content}`)
      .join("\n\n");

    // Extract product IDs from metadata for suggestions
    const productIds = contextDocs
      .filter(doc => doc.doc_type === "product" && doc.doc_id)
      .map(doc => doc.doc_id)
      .filter((id, idx, arr) => arr.indexOf(id) === idx) // unique
      .slice(0, 3);

    // System prompt for the chatbot
    const systemPrompt = `You are a helpful customer service assistant for a cosmetics e-commerce store. 
Answer questions about products, ingredients, usage, and general inquiries. 
Be friendly, concise, and helpful. If you mention a product, reference it by name.
If you don't know something, say so honestly.`;

    // Query LLM
    const answer = await queryLLM(systemPrompt, context, message);

    // Log the query for analytics (optional)
    await supabase.from("events").insert({
      event_type: "chatbot_query",
      payload: {
        session_id,
        message_length: message.length,
        results_count: contextDocs.length,
      },
    }).catch(err => console.error("Failed to log event:", err));

    return new Response(
      JSON.stringify({
        answer,
        suggestions: productIds,
        sources: contextDocs.map(doc => ({
          doc_type: doc.doc_type,
          doc_id: doc.doc_id,
          preview: doc.content.substring(0, 100) + "...",
        })),
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
    console.error("Error in chatbot_query:", error);
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

