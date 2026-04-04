# QR Workflow - Integration Checklist & Next Steps

Complete checklist for verifying all components are integrated correctly and ready for deployment.

---

## Pre-Integration Verification

### Code Files Created ✅
- [ ] Database migrations in `supabase/migrations/`
  - [ ] `20260404110000_create_qr_workflow_tables.sql` (206 lines)
  - [ ] `20260404110500_create_qr_validation_functions.sql` (245 lines)

- [ ] Backend services
  - [ ] `src/services/PaymentLinkGenerator.ts` (321 lines)

- [ ] Edge Functions in `supabase/functions/`
  - [ ] `qr-validate/index.ts` (101 lines)
  - [ ] `payment-links-create/index.ts` (206 lines)
  - [ ] `payment-webhook/index.ts` (281 lines)

- [ ] React components in `src/components/`
  - [ ] `PaymentMethodSelector.tsx` (145 lines)
  - [ ] `ManualEntryForm.tsx` (188 lines)
  - [ ] `PaymentLinkDisplay.tsx` (236 lines)

- [ ] Custom hooks in `src/hooks/`
  - [ ] `useQRValidation.ts` (70 lines)
  - [ ] `usePaymentLinks.ts` (122 lines)
  - [ ] `useOrderAbandonment.ts` (112 lines)

- [ ] API routes in `src/app/api/`
  - [ ] `payment-links/create/route.ts` (58 lines)
  - [ ] `qr/validate/route.ts` (55 lines)
  - [ ] `webhooks/payment-callback/route.ts` (107 lines)

- [ ] Configuration & Scripts
  - [ ] `.env.example` (QR workflow vars)
  - [ ] `scripts/deploy-qr-workflow.sh`
  - [ ] `scripts/test-qr-workflow.sh`

- [ ] Documentation
  - [ ] `docs/QR_WORKFLOW_TESTING_GUIDE.md`
  - [ ] `docs/QR_WORKFLOW_PRODUCTION_DEPLOYMENT.md`
  - [ ] `docs/QR_WORKFLOW_TROUBLESHOOTING.md`
  - [ ] `docs/QR_WORKFLOW_TECHNICAL_GUIDE.md`

### Integration Points Verified ✅
- [ ] `CustomerMenu.tsx` modified to:
  - [ ] Import PaymentMethodSelector component
  - [ ] Import PaymentLinkDisplay component
  - [ ] Add payment state variables
  - [ ] Integrate payment flow after order placement
  - [ ] Show payment method selection
  - [ ] Display payment link when UPI selected

- [ ] Database integration:
  - [ ] RLS policies configured for multi-tenant
  - [ ] Indexes created for performance
  - [ ] Functions created for business logic

- [ ] API routes created:
  - [ ] /api/qr/validate endpoint
  - [ ] /api/payment-links/create endpoint
  - [ ] /api/webhooks/payment-callback endpoint

---

## Local Development Checklist

### Environment Setup
```bash
# ✅ Before proceeding, complete these steps:
```

- [ ] Copy environment template
  ```bash
  cp .env.example .env.local
  ```

- [ ] Configure Razorpay keys (test keys for development)
  ```env
  RAZORPAY_KEY_ID=rzp_test_xxxxx
  RAZORPAY_KEY_SECRET=test_xxxxx
  RAZORPAY_WEBHOOK_SECRET=test_webhook_secret
  ```

- [ ] Configure Supabase
  ```env
  VITE_SUPABASE_URL=http://localhost:54321
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```

- [ ] Install dependencies
  ```bash
  npm install
  ```

- [ ] Start local Supabase
  ```bash
  supabase start
  ```

- [ ] Deploy migrations locally
  ```bash
  supabase db push
  ```

- [ ] Deploy Edge Functions locally
  ```bash
  supabase functions deploy qr-validate
  supabase functions deploy payment-links-create
  supabase functions deploy payment-webhook
  ```

### Code Verification
- [ ] TypeScript compilation passes
  ```bash
  npm run type-check
  ```

- [ ] No ESLint errors
  ```bash
  npm run lint
  ```

- [ ] All imports resolved
  ```bash
  npm run build
  ```

### Local Component Testing
- [ ] PaymentMethodSelector renders correctly
  ```bash
  npm run dev
  # Navigate to /menu/[owner-id]?table=5
  # Place order and verify component appears
  ```

- [ ] PaymentLinkDisplay renders QR code
  ```bash
  # After clicking "Pay Online"
  # Verify QR code is visible
  # Verify timer shows "15:00"
  ```

- [ ] ManualEntryForm works
  ```bash
  # Navigate to manual entry page
  # Test form validation
  # Test table lookup
  ```

### Database Verification

Run these queries to verify tables exist:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens');

-- Check policies exist
SELECT tablename, policyname, qual 
FROM pg_policies 
WHERE tablename IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens');

-- Check indexes exist
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens');

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema='public' 
AND (routine_name LIKE '%qr%' OR routine_name LIKE '%payment%' OR routine_name LIKE '%abandonment%');
```

- [ ] All tables created successfully
- [ ] RLS enabled on all tables
- [ ] RLS policies configured
- [ ] Indexes created for performance
- [ ] Functions deployed and accessible

---

## Integration Test Scenarios

Run these tests locally before deployment:

### Test 1: QR Validation Flow
```bash
# 1. Navigate to menu with valid table
curl -X POST http://localhost:5173/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"valid-uuid","tableNumber":5}'

# Expected: Success with menu URL
# 2. Check qr_scan_logs table
SELECT * FROM qr_scan_logs ORDER BY created_at DESC LIMIT 1;
# Expected: Entry with is_successful=true
```

- [ ] QR validation returns success
- [ ] qr_scan_logs table updated
- [ ] Manual entry form works
- [ ] Invalid table returns error

### Test 2: Payment Link Generation
```bash
# 1. Create payment link
curl -X POST http://localhost:5173/api/payment-links/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId":"test-order",
    "amount":520.50,
    "gateway":"razorpay",
    "customerPhone":"919876543210",
    "customerEmail":"test@example.com"
  }'

# Expected: Payment URL with QR code
# 2. Check payment_link_tokens table
SELECT * FROM payment_link_tokens ORDER BY created_at DESC LIMIT 1;
# Expected: Entry with status='pending'
```

- [ ] Razorpay link generated
- [ ] QR code returned
- [ ] payment_link_tokens created
- [ ] Expiry time set correctly

### Test 3: Manual Payment Flow
```bash
# 1. Place order
# 2. Select "Pay at Counter"
# 3. Check order_abandonment_tracking
SELECT * FROM order_abandonment_tracking 
WHERE order_id = 'your-test-order';
# Expected: Entry with status='active'

# 4. Simulate cashier marking as paid
SELECT mark_order_paid_from_tracking('your-test-order');
# Expected: status='paid'
```

- [ ] Order placed successfully
- [ ] Abandonment tracking created
- [ ] Cashier payment marking works
- [ ] Order status updates

### Test 4: Component Integration
- [ ] CustomerMenu loads correctly
- [ ] Order placement works
- [ ] PaymentMethodSelector appears after order
- [ ] UPI button shows PaymentLinkDisplay
- [ ] Cashier button completes flow
- [ ] "Order More" resets payment state

### Test 5: Error Scenarios
- [ ] Invalid table shows error
- [ ] Missing credentials handled gracefully
- [ ] Network timeout manages state
- [ ] Expired links show message
- [ ] Duplicate payments prevented

---

## Staging Deployment Checklist

Deploy to staging environment BEFORE production:

### Pre-Staging
- [ ] All local tests passing
- [ ] Code review completed
- [ ] No critical warnings in build

### Staging Deployment Steps
```bash
# 1. Deploy to staging branch
git push origin feature/qr-workflow

# 2. Deploy migrations to staging database
supabase db push --linked

# 3. Deploy Edge Functions to staging project
supabase functions deploy qr-validate
supabase functions deploy payment-links-create
supabase functions deploy payment-webhook

# 4. Deploy application to staging
vercel --prod --scope your-org  # or equivalent for your hosting

# 5. Run smoke tests
bash scripts/test-qr-workflow.sh all
```

### Staging Verification
- [ ] All migrations applied successfully
- [ ] Edge Functions deployed and accessible
- [ ] API routes responding correctly
- [ ] PaymentMethodSelector renders
- [ ] QR codes display
- [ ] Payment links generate
- [ ] Database tables populated with test data
- [ ] RLS policies working correctly

### Staging Testing (Minimum 4 hours)
- [ ] End-to-end QR flow tested
- [ ] Payment gateway integration tested
- [ ] Manual entry fallback tested
- [ ] Error scenarios tested
- [ ] Mobile responsiveness verified
- [ ] Performance acceptable

---

## Production Deployment Checklist

Ready for production only after staging passes:

### Pre-Production
- [ ] Staging testing completed successfully
- [ ] All issues resolved
- [ ] Database backup taken
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] On-call engineer assigned

### Production Deployment
```bash
# 1. Merge to main branch
git merge feature/qr-workflow
git push origin main

# 2. Tag version
git tag -a v2.1.0 -m "Deploy QR workflow"

# 3. Backup production database
supabase db dump --db-url production-url > backups/pre-qr-workflow-backup.sql

# 4. Deploy migrations
supabase db push --linked

# 5. Deploy Edge Functions
supabase functions deploy qr-validate
supabase functions deploy payment-links-create
supabase functions deploy payment-webhook

# 6. Deploy application
vercel deploy --prod

# 7. Configure webhooks (manual in dashboards)
# Razorpay: Settings → Webhooks → Add/Update webhook
# PhonePe: Settings → Webhooks → Add/Update webhook
```

### Production Verification (30 minutes)
- [ ] API endpoints responding (200 status)
- [ ] No 5xx errors in logs
- [ ] Database tables accessible
- [ ] RLS policies enforcing correctly
- [ ] Webhooks receiving test events
- [ ] Performance metrics normal
- [ ] Error rate < 0.1%

### Post-Production (24 hours)
- [ ] Monitor error logs
- [ ] Check webhook delivery success rate
- [ ] Verify payment processing working
- [ ] Monitor database performance
- [ ] Check disk space usage
- [ ] Verify backups completing
- [ ] Team standby for issues

---

## Rollback Criteria

Automatically trigger rollback if:

- [ ] Error rate exceeds 5%
- [ ] Payment processing stops working
- [ ] Database becomes inaccessible
- [ ] Critical security vulnerability found
- [ ] Response times exceed 5 seconds
- [ ] Webhook failures exceed 50%

Rollback command:
```bash
# In Vercel dashboard:
# Deployments → (previous working version) → Promote to Production

# Or via CLI:
vercel rollback --confirmed
```

---

## Feature Flags (Optional - for safer rollout)

For even safer deployment, wrap new features in flags:

```typescript
// In environment or config
const featureFlags = {
  qrWorkflow: process.env.FEATURE_QR_WORKFLOW === 'true', // Default: false
  abandonmentTracking: process.env.FEATURE_ABANDONMENT === 'true',
  paymentWebhooks: process.env.FEATURE_WEBHOOKS === 'true'
};

// Usage in CustomerMenu:
if (featureFlags.qrWorkflow) {
  showPaymentMethodSelector();
}
```

- [ ] Feature flags created (optional)
- [ ] Flags set to false initially
- [ ] Flags tested locally
- [ ] Gradual rollout plan (10% → 50% → 100%)

---

## Monitoring & Alerts (After Deployment)

Set up monitoring for:

1. **API Performance**
   - [ ] /api/qr/validate response time
   - [ ] /api/payment-links/create response time
   - [ ] /api/webhooks/payment-callback response time

2. **Error Tracking**
   - [ ] API error rate
   - [ ] Webhook failure rate
   - [ ] Database errors

3. **Business Metrics**
   - [ ] Payment success rate
   - [ ] QR scans per hour
   - [ ] Abandoned orders
   - [ ] Payment processing time

4. **Database Metrics**
   - [ ] Connection pool utilization
   - [ ] Slow query log
   - [ ] Disk space usage
   - [ ] Backup completion

---

## Documentation Review

- [ ] All guides reviewed and accurate
- [ ] Testing guide tested and working
- [ ] Deployment guide followed successfully
- [ ] Troubleshooting guide covers common issues
- [ ] Technical guide matches implementation
- [ ] README updated with new features
- [ ] Team trained on new workflow

---

## Sign-Off

**Development Complete:**
- [ ] Developer: QR workflow fully implemented
  - Date: ___________
  - Signature: ___________

**Code Review Approved:**
- [ ] Tech Lead: Code reviewed and approved
  - Date: ___________
  - Signature: ___________

**Testing Passed:**
- [ ] QA Lead: All tests passed, ready for production
  - Date: ___________
  - Signature: ___________

**Staging Verified:**
- [ ] DevOps: Staging deployment successful
  - Date: ___________
  - Signature: ___________

**Production Ready:**
- [ ] Product Manager: Feature meets requirements
  - Date: ___________
  - Signature: ___________

**Deployed to Production:**
- [ ] DevOps: Deployed successfully
  - Date: ___________
  - Version: ___________
  - Signature: ___________

---

## Final Checklist - Ready to Deploy?

Answer these questions before deploying:

1. **Are all components implemented?**
   - [ ] Database migrations: YES
   - [ ] Edge Functions: YES
   - [ ] React components: YES
   - [ ] API routes: YES
   - [ ] Integration with CustomerMenu: YES

2. **Are all tests passing?**
   - [ ] Local tests: YES
   - [ ] Component tests: YES
   - [ ] Integration tests: YES
   - [ ] E2E tests: YES

3. **Is the code production-ready?**
   - [ ] No console.errors: YES
   - [ ] No TypeScript errors: YES
   - [ ] No ESLint warnings: YES
   - [ ] Proper error handling: YES
   - [ ] Security measures in place: YES

4. **Is staging verified?**
   - [ ] Deployed successfully: YES
   - [ ] All features working: YES
   - [ ] Performance acceptable: YES
   - [ ] No critical issues: YES

5. **Is the team ready?**
   - [ ] Support trained: YES
   - [ ] Monitoring configured: YES
   - [ ] Rollback plan documented: YES
   - [ ] On-call assigned: YES

**If ALL answers are YES → Proceed with production deployment**

---

## Deployment Window

**Recommended Timing:**
- Low traffic period (off-peak hours)
- Avoid customer peak times (meal times)
- Tuesday-Thursday preferred (avoid weekends)
- Evening/night hours safer than business hours

**Deployment Duration:**
- Database migrations: 5-10 minutes
- Edge Functions deployment: 5-10 minutes
- Application deployment: 5-10 minutes
- Verification: 10-15 minutes
- **Total: ~30-45 minutes**

**Maintenance Window Notification:**
```
We're updating our payment system from [TIME] to [TIME]. 
Orders may take longer to process during this time.
Thank you for your patience!
```

---

## Success Criteria

Deployment is successful when:

✅ All components deployed without errors
✅ No critical errors in logs
✅ API endpoints responding normally
✅ QR validation working
✅ Payment link generation working
✅ Webhook signatures verifying
✅ Database performing normally
✅ Customer menu loading correctly
✅ First 10 test orders processed successfully
✅ Team confirms no customer-facing issues

---

## Next Phase - Continuous Improvement

After successful deployment:

1. **Monitor for 48 hours**
   - Watch error logs
   - Monitor webhook delivery
   - Check payment success rate

2. **Gather feedback (Week 1-2)**
   - Customer feedback
   - Staff feedback
   - Support ticket analysis

3. **Optimize based on data (Week 3-4)**
   - Improve performance if needed
   - Add missing features
   - Fix UX issues
   - Enhance security if needed

4. **Plan next iteration**
   - Additional payment gateways
   - Enhanced analytics
   - Machine learning for abandonment prediction
   - Mobile app integration
