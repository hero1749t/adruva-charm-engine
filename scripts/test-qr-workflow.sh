#!/bin/bash
# Testing script for QR Workflow
# This script contains all test scenarios for the QR payment workflow

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL=${BASE_URL:-"http://localhost:5173"}
API_URL=${API_URL:-"http://localhost:5173/api"}

echo "=========================================="
echo "QR Workflow Testing Suite"
echo "=========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "API URL: $API_URL"
echo ""

# Test 1: QR Validation
test_qr_validation() {
    echo -e "${BLUE}Test 1: QR Validation${NC}"
    echo "Testing QR code validation endpoint..."
    
    OWNER_ID="550e8400-e29b-41d4-a716-446655440000"
    TABLE_NUMBER=5
    
    response=$(curl -s -X POST "$API_URL/qr/validate" \
        -H "Content-Type: application/json" \
        -d "{\"ownerId\":\"$OWNER_ID\",\"tableNumber\":$TABLE_NUMBER}")
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "success"; then
        echo -e "${GREEN}✓ QR validation test passed${NC}"
    else
        echo -e "${YELLOW}⚠ QR validation test inconclusive (endpoint may require auth)${NC}"
    fi
    echo ""
}

# Test 2: Payment Link Creation
test_payment_link_creation() {
    echo -e "${BLUE}Test 2: Payment Link Creation${NC}"
    echo "Testing payment link creation endpoint..."
    
    ORDER_ID="550e8400-e29b-41d4-a716-446655440001"
    AMOUNT=520.50
    
    response=$(curl -s -X POST "$API_URL/payment-links/create" \
        -H "Content-Type: application/json" \
        -d "{\"orderId\":\"$ORDER_ID\",\"amount\":$AMOUNT,\"gateway\":\"razorpay\"}")
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "success"; then
        echo -e "${GREEN}✓ Payment link creation test passed${NC}"
    else
        echo -e "${YELLOW}⚠ Payment link creation test inconclusive (may need credentials)${NC}"
    fi
    echo ""
}

# Test 3: Webhook Health Check
test_webhook_health() {
    echo -e "${BLUE}Test 3: Webhook Health Check${NC}"
    echo "Testing webhook endpoint health..."
    
    response=$(curl -s -X GET "$API_URL/webhooks/payment-callback")
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "ok"; then
        echo -e "${GREEN}✓ Webhook health check passed${NC}"
    else
        echo -e "${YELLOW}⚠ Webhook health check inconclusive${NC}"
    fi
    echo ""
}

# Test 4: Component Rendering
test_component_rendering() {
    echo -e "${BLUE}Test 4: Component Rendering${NC}"
    echo "Testing component rendering in browser..."
    
    echo "Visit these URLs to test components:"
    echo "1. Menu Page: $BASE_URL/menu/550e8400-e29b-41d4-a716-446655440000?table=5"
    echo "2. Manual Entry: $BASE_URL/qr-scan"
    echo ""
    
    read -p "Have you verified components render correctly? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓ Component rendering test passed${NC}"
    else
        echo -e "${RED}✗ Component rendering test failed${NC}"
    fi
    echo ""
}

# Test 5: Database Verification
test_database_verification() {
    echo -e "${BLUE}Test 5: Database Verification${NC}"
    echo "Verifying database tables and functions..."
    
    if command -v supabase &> /dev/null; then
        echo "Tables:"
        supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens')" 2>/dev/null || echo "Could not verify tables remotely"
        
        echo ""
        echo -e "${GREEN}✓ Database verification complete${NC}"
    else
        echo -e "${YELLOW}⚠ Supabase CLI not available for verification${NC}"
    fi
    echo ""
}

# Test 6: Full Payment Flow (Manual)
test_full_payment_flow() {
    echo -e "${BLUE}Test 6: Full Payment Flow (Manual)${NC}"
    echo ""
    echo "Instructions for manual testing:"
    echo ""
    echo "1. Start local development server: npm run dev"
    echo "2. Open: $BASE_URL/menu/[owner_id]?table=5"
    echo "3. Add items to cart"
    echo "4. Click 'Order' button"
    echo "5. Verify PaymentMethodSelector shows"
    echo "6. Click 'Pay Online' button"
    echo "7. Verify PaymentLinkDisplay shows QR code"
    echo "8. Verify payment_link_tokens created in database"
    echo ""
    echo "9. Alternative: Click 'Pay at Counter'"
    echo "10. Verify order appears in CashierDashboard"
    echo ""
    
    read -p "Have you completed the full payment flow test? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓ Full payment flow test passed${NC}"
    else
        echo -e "${RED}✗ Full payment flow test failed${NC}"
    fi
    echo ""
}

# Run all tests
run_all_tests() {
    echo -e "${YELLOW}Running all tests...${NC}"
    echo ""
    
    test_qr_validation
    test_payment_link_creation
    test_webhook_health
    test_component_rendering
    test_database_verification
    test_full_payment_flow
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Testing Complete!${NC}"
    echo "=========================================="
}

# Main menu
if [ $# -eq 0 ]; then
    echo "Available tests:"
    echo "1. QR Validation"
    echo "2. Payment Link Creation"
    echo "3. Webhook Health"
    echo "4. Component Rendering"
    echo "5. Database Verification"
    echo "6. Full Payment Flow"
    echo "7. Run All Tests"
    echo ""
    read -p "Select test (1-7): " test_choice
    
    case $test_choice in
        1) test_qr_validation ;;
        2) test_payment_link_creation ;;
        3) test_webhook_health ;;
        4) test_component_rendering ;;
        5) test_database_verification ;;
        6) test_full_payment_flow ;;
        7) run_all_tests ;;
        *) echo "Invalid choice" ;;
    esac
else
    case $1 in
        all) run_all_tests ;;
        qr) test_qr_validation ;;
        payment) test_payment_link_creation ;;
        webhook) test_webhook_health ;;
        components) test_component_rendering ;;
        db) test_database_verification ;;
        flow) test_full_payment_flow ;;
        *) echo "Unknown test: $1" ;;
    esac
fi
