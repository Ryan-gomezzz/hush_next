# Netlify Environment Variables

This file lists all required environment variables for Netlify deployment.

## Required for Build (Must be set before first build)

These variables are needed during the Next.js build process:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Settings → API → anon public key |

## Required for Runtime (Netlify Functions)

These variables are needed for server-side operations:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (⚠️ SECRET) | Supabase Dashboard → Settings → API → service_role key |
| `OPENAI_API_KEY` | OpenAI API key for embeddings/chatbot | OpenAI Dashboard → API Keys |
| `PGVECTOR_DIMENSION` | Vector dimension (default: 1536) | Set to `1536` for OpenAI embeddings |

## How to Set in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Click **Add variable** for each variable above
4. Enter the exact variable name and value
5. Click **Save**
6. Trigger a new deploy (or push a commit)

## Verification

After setting variables, verify they're available:

1. Go to **Site settings** → **Environment variables**
2. Confirm all variables are listed
3. Check that values are correct (they're hidden for security)

## Troubleshooting

### Build fails with "Missing Supabase environment variables"

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check variable names match exactly (case-sensitive)
- Ensure variables are set in the correct environment (Production/Deploy previews)
- Trigger a new deploy after adding variables

### Functions fail with authentication errors

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check that the service role key is from the correct Supabase project
- Ensure the key hasn't been rotated

### Chatbot not working

- Verify `OPENAI_API_KEY` is set
- Check OpenAI API key is valid and has credits
- Review function logs for specific errors

## Security Notes

- ⚠️ **Never** commit these values to Git
- ⚠️ **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Use Netlify's environment variable encryption
- Rotate keys regularly (every 90 days recommended)

