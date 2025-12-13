# Vercel Setup Instructions

## ⚠️ IMPORTANT: Set Root Directory in Vercel Dashboard

For the build to work correctly, you **MUST** set the Root Directory in your Vercel project settings:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **General**
4. Scroll down to **Root Directory**
5. Click **Edit**
6. Enter: `app/storefront`
7. Click **Save**

This tells Vercel where your Next.js application is located, so it can:
- Auto-detect Next.js framework
- Install dependencies in the correct location
- Build from the correct directory

## Why This Is Needed

The `vercel.json` file can specify build commands, but Vercel's framework detection happens **before** those commands run. By setting the Root Directory in the dashboard, Vercel knows where to look for your `package.json` and `next.config.js` files.

## After Setting Root Directory

Once you've set the Root Directory:
1. Vercel will automatically detect Next.js
2. It will install dependencies from `app/storefront/package.json`
3. It will run the build command from that directory
4. The deployment should succeed

## Current vercel.json Configuration

The `vercel.json` file is configured with:
```json
{
  "buildCommand": "cd app/storefront && npm run build",
  "outputDirectory": "app/storefront/.next",
  "framework": "nextjs"
}
```

However, **you still need to set the Root Directory in the dashboard** for framework detection to work properly.

## Troubleshooting

If the build still fails after setting Root Directory:

1. **Check the build logs** - Look for any error messages
2. **Verify environment variables** - Make sure all required variables are set (see `VERCEL_ENV_VARS.md`)
3. **Check Root Directory setting** - Ensure it's exactly `app/storefront` (no trailing slash)
4. **Clear build cache** - In Vercel dashboard, go to Deployments → Settings → Clear Build Cache

