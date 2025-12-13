# Vercel Environment Variables Guide

This guide lists all environment variables you need to set in Vercel for your Supabase ecommerce application.

## 📍 Where to Set Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New** for each variable
4. Select the environments (Production, Preview, Development) where it should apply
5. Click **Save**

## 🔑 Required Environment Variables

### Public Variables (Exposed to Client)

These variables are prefixed with `NEXT_PUBLIC_` and are included in the client-side bundle. They're required for the build process.

| Variable | Description | Where to Find | Required For |
|----------|-------------|---------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → **Settings** → **API** → **Project URL** | ✅ Build & Runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → **Settings** → **API** → **anon public** key | ✅ Build & Runtime |

**Example values:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Private Variables (Server-Only)

These variables are only available in server-side code (API routes, server components). They are **NOT** exposed to the client.

| Variable | Description | Where to Find | Required For |
|----------|-------------|---------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (⚠️ **SECRET**) | Supabase Dashboard → **Settings** → **API** → **service_role** key | ✅ Admin operations, server-side queries |
| `OPENAI_API_KEY` | OpenAI API key for chatbot/embeddings | [OpenAI Dashboard](https://platform.openai.com/api-keys) → **API Keys** | ⚠️ Only if using chatbot |
| `PGVECTOR_DIMENSION` | Vector dimension for embeddings | Set to `1536` for OpenAI embeddings | ⚠️ Only if using chatbot |

**Example values:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (very long key)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PGVECTOR_DIMENSION=1536
```

## 📋 Complete List for Quick Copy

### Minimum Required (Storefront Only)
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Full Setup (With Chatbot)
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
PGVECTOR_DIMENSION=1536
```

## 🔍 How to Get Your Supabase Keys

1. **Go to Supabase Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Select your project**
3. **Navigate to**: **Settings** → **API**
4. **Copy the following**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep this secret!

## 🔍 How to Get Your OpenAI Key

1. **Go to OpenAI Dashboard**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Sign in** or create an account
3. **Click** "Create new secret key"
4. **Copy the key** → `OPENAI_API_KEY`
5. **Save it immediately** (you won't see it again!)

## ⚙️ Environment-Specific Settings

In Vercel, you can set different values for different environments:

- **Production**: Your live site (production domain)
- **Preview**: Pull request previews
- **Development**: Local development (if using Vercel CLI)

**Recommendation**: Set all variables for all environments, or at least Production and Preview.

## ✅ Verification Checklist

After setting variables, verify:

- [ ] All variables are listed in Vercel dashboard
- [ ] Variable names match exactly (case-sensitive!)
- [ ] `NEXT_PUBLIC_*` variables are set for Production
- [ ] Private variables are set for Production
- [ ] No typos in variable names or values
- [ ] Triggered a new deployment after adding variables

## 🚨 Common Issues

### Build Fails: "next: command not found"
- ✅ Fixed by setting `rootDirectory` in `vercel.json`
- Make sure you've committed the updated `vercel.json`

### Build Fails: "Missing environment variables"
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check variable names are exact (case-sensitive)
- Ensure variables are set for the correct environment

### Runtime Error: "Cannot connect to Supabase"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check your Supabase project is active (not paused)
- Ensure the URL format is: `https://xxxxx.supabase.co`

### Admin Features Not Working
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check the service role key is from the correct project
- Ensure it hasn't been rotated

### Chatbot Not Working
- Verify `OPENAI_API_KEY` is set
- Check OpenAI API key is valid and has credits
- Verify `PGVECTOR_DIMENSION=1536` is set

## 🔒 Security Best Practices

1. **Never commit** environment variables to Git
2. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to client-side code
3. **Rotate keys** regularly (every 90 days recommended)
4. **Use different keys** for different environments if possible
5. **Restrict access** to Vercel project settings
6. **Monitor usage** in Supabase and OpenAI dashboards

## 📝 Notes

- **`NEXT_PUBLIC_*` variables** are embedded in the client bundle - only use for non-sensitive data
- **Private variables** are only available server-side - use for secrets
- **Vercel automatically** encrypts environment variables
- **Changes take effect** after the next deployment
- **You can preview** variables in Vercel's build logs (values are masked)

## 🆘 Need Help?

- Check build logs in Vercel dashboard for specific errors
- Verify Supabase project is active
- Review [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed setup
- Check [SUPABASE_SETUP_COMPLETE.md](SUPABASE_SETUP_COMPLETE.md) for database setup status

