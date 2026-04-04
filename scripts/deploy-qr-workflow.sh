#!/bin/bash
# Deployment script for QR Workflow
# This script deploys the database migrations and edge functions

set -e

echo "=========================================="
echo "QR Workflow Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${YELLOW}Step 1: Deploying Database Migrations${NC}"
echo "Pushing migrations..."
if supabase db push; then
    echo -e "${GREEN}✓ Migrations deployed successfully${NC}"
else
    echo -e "${RED}✗ Migration deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Verifying Database Tables${NC}"
if supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database tables verified${NC}"
else
    echo -e "${RED}✗ Database tables not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Deploying Edge Functions${NC}"

functions=("qr-validate" "payment-links-create" "payment-webhook")

for func in "${functions[@]}"; do
    echo "Deploying $func..."
    if supabase functions deploy $func; then
        echo -e "${GREEN}✓ $func deployed${NC}"
    else
        echo -e "${RED}✗ $func deployment failed${NC}"
        exit 1
    fi
    echo ""
done

echo -e "${YELLOW}Step 4: Verifying Edge Functions${NC}"
if supabase functions list | grep -q "qr-validate"; then
    echo -e "${GREEN}✓ Edge functions verified${NC}"
else
    echo -e "${RED}✗ Edge functions not deployed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Generating TypeScript Types${NC}"
if supabase gen types typescript > src/lib/database.types.ts; then
    echo -e "${GREEN}✓ Types generated${NC}"
else
    echo -e "${YELLOW}⚠ Type generation skipped (optional)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set up environment variables in .env.local:"
echo "   - RAZORPAY_KEY_ID"
echo "   - RAZORPAY_KEY_SECRET"
echo "   - BASE_URL"
echo ""
echo "2. Configure webhooks in payment gateway dashboards:"
echo "   - Razorpay: https://dashboard.razorpay.com/settings/webhooks"
echo "   - PhonePe: PhonePe Dashboard Settings"
echo ""
echo "3. Test the QR workflow:"
echo "   - npm run dev"
echo "   - Navigate to: http://localhost:5173/menu/[owner_id]?table=5"
echo ""
echo "4. Deploy to production:"
echo "   - npm run build"
echo "   - vercel deploy"
echo ""
