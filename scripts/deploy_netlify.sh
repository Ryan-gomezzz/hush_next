#!/bin/bash

# Deployment script for Netlify
# Usage: ./scripts/deploy_netlify.sh

set -e

echo "🚀 Starting Netlify deployment..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Check if logged in
if ! netlify status &> /dev/null; then
    echo "🔐 Please log in to Netlify..."
    netlify login
fi

# Build the Next.js app
echo "📦 Building Next.js application..."
cd app/storefront
npm install
npm run build
cd ../..

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod

echo "✅ Deployment complete!"
echo "📝 Don't forget to:"
echo "   1. Set environment variables in Netlify dashboard"
echo "   2. Run seed script to populate database"
echo "   3. Test admin login and storefront"

