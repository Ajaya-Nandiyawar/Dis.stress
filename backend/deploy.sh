#!/bin/bash

# Run this script only after all Checkpoint 1 local verifications pass.
# Update AI_SERVICE_URL in Railway env vars as soon as Shrinidhi deploys.

echo "=== STEP 1: Committing backend files ==="
git add .
git commit -m 'deploy: backend initial Railway deployment'

echo "=== STEP 2: Pushing to GitHub (Railway auto-deploys on push) ==="
git push origin feature/backend-api

echo "=== STEP 3: Manual Railway Environment Variables Checklist ==="
echo "Ensure the following are set in the Railway project dashboard:"
echo "  PORT=3001"
echo "  NODE_ENV=production"
echo "  DATABASE_URL=(from Railway PostgreSQL add-on)"
echo "  REDIS_URL=(from Railway Redis add-on)"
echo "  AI_SERVICE_URL=https://distress-ai.onrender.com"
echo ""

echo "=== STEP 4: Running database migration on Railway ==="
# Note: Ensure the Railway CLI is authenticated
railway run node db/migrate.js

echo "=== STEP 5: Verifying Railway deployment ==="
echo "After Railway finishes building, run this to verify:"
echo "curl https://<RAILWAY_URL>/health"
echo "Expected: {status:'ok', db:'connected', redis:'connected'}"
echo ""

echo "=== STEP 6: Starting ngrok tunnel for local development ==="
echo "Copy the https://xxxx.ngrok-free.app URL from the output below"
echo "Paste this URL in the team WhatsApp chat with label: BACKEND URL (temporary)"
ngrok http 3001
