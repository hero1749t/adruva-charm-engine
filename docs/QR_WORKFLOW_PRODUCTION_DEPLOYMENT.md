# QR Workflow Production Deployment Guide

Complete step-by-step guide for deploying the QR-to-Payment workflow to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Steps](#deployment-steps)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Rollback Procedures](#rollback-procedures)
6. [Production Troubleshooting](#production-troubleshooting)

---

## Pre-Deployment Checklist

### Code & Testing
- [ ] All code committed to main branch
- [ ] All unit tests passing: `npm run test`
- [ ] All integration tests passing: `npm run test:integration`
- [ ] Code reviewed and approved
- [ ] No console.errors or warnings in production build
- [ ] Manual testing completed on staging

### Configuration
- [ ] Environment variables configured in production
- [ ] Razorpay credentials verified (live keys, not test)
- [ ] PhonePe credentials verified (live keys, not test)
- [ ] Supabase production URL set correctly
- [ ] Webhook secrets configured in payment gateways
- [ ] CORS settings updated for production domain

### Database
- [ ] Database backup taken before deployment
- [ ] Migrations tested on staging successfully
- [ ] RLS policies verified (no data leaks)
- [ ] Connection pool settings optimized
- [ ] Read replicas configured (if needed)

### Infrastructure
- [ ] SSL certificate valid and not expiring
- [ ] DNS records updated if using new domain
- [ ] CDN configured for static assets
- [ ] Rate limiting configured on API endpoints
- [ ] DDoS protection enabled

### Communication
- [ ] Stakeholders notified of deployment window
- [ ] Support team briefed on new features
- [ ] Monitoring team on standby
- [ ] Rollback plan communicated
- [ ] Release notes prepared

---

## Deployment Steps

### Phase 1: Pre-Deployment (1-2 hours before)

#### 1.1 Create Database Backup

```bash
# Backup Supabase production database
supabase db dump --db-url postgresql://... > backups/production_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
pg_restore --list backups/production_*.sql | head -20
```

#### 1.2 Verify All Credentials

```bash
# Check environment variables are correct
echo "API URL: $VITE_SUPABASE_URL"
echo "Razorpay Key ID: ${RAZORPAY_KEY_ID:0:20}..."
echo "App URL: $BASE_URL"
```

#### 1.3 Pre-Stage Database Migrations

On staging environment:
```bash
supabase db push --linked --db-url postgresql://...
```

---

### Phase 2: Database Deployment (10-15 minutes)

#### 2.1 Deploy Migrations to Production

```bash
# Command 1: Push only new migrations (safe)
supabase db push --linked

# Expected output:
# ✓ Running migrations: 1 migration
# ✓ Migration 20260404110000_create_qr_workflow_tables completed
# ✓ Migration 20260404110500_create_qr_validation_functions completed

# Verify in Supabase dashboard:
# 1. Go to SQL Editor
# 2. Run: SELECT * FROM migrations;
# 3. Verify 2 new rows with migration timestamps
```

#### 2.2 Verify Tables Created

```sql
-- Run in production database
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens')
ORDER BY table_name;

-- Expected output:
-- order_abandonment_tracking
-- payment_link_tokens
-- qr_scan_logs
```

#### 2.3 Verify Functions Created

```sql
-- Run in production database
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema='public' 
AND routine_name LIKE '%qr%' OR routine_name LIKE '%payment%' OR routine_name LIKE '%abandonment%'
ORDER BY routine_name;

-- Expected functions:
-- check_abandoned_orders
-- create_payment_link
-- initialize_abandonment_tracking
-- mark_order_paid_from_tracking
-- update_payment_link_status
-- validate_qr_scan
```

#### 2.4 Verify RLS Policies

```sql
-- Check RLS policies for all tables
SELECT schemaname, tablename FROM pg_tables 
WHERE tablename IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens')
ORDER BY tablename;

-- For each table, verify policies exist:
SELECT policyname, USING, WITH CHECK FROM pg_policies 
WHERE tablename = 'qr_scan_logs';
-- Expected: Multiple policies for select, insert, update
```

---

### Phase 3: Edge Functions Deployment (5-10 minutes)

#### 3.1 Deploy Edge Functions

```bash
# Deploy all three functions
supabase functions deploy qr-validate
supabase functions deploy payment-links-create
supabase functions deploy payment-webhook

# Expected output:
# ✓ Function qr-validate deployed successfully
# ✓ Function payment-links-create deployed successfully
# ✓ Function payment-webhook deployed successfully
```

#### 3.2 Verify Functions Accessible

```bash
# Get function invocation URLs
supabase functions list

# Expected output:
# qr-validate           | https://project-ref.supabase.co/functions/v1/qr-validate
# payment-links-create  | https://project-ref.supabase.co/functions/v1/payment-links-create
# payment-webhook       | https://project-ref.supabase.co/functions/v1/payment-webhook
```

#### 3.3 Test Edge Function Endpoints

```bash
# Test qr-validate function
curl -X POST https://project-ref.supabase.co/functions/v1/qr-validate \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"550e8400-e29b-41d4-a716-446655440000","tableNumber":5}'

# Test payment-links-create function
curl -X POST https://project-ref.supabase.co/functions/v1/payment-links-create \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test-order","amount":520.50,"gateway":"razorpay"}'

# Expected: Both return 200 OK with response data
```

---

### Phase 4: Application Deployment (5-10 minutes)

#### 4.1 Build Production Bundle

```bash
# Clean previous builds
rm -rf .next dist build

# Build optimized production bundle
npm run build

# Expected output:
# ✓ Compiled successfully
# ✓ Bundle size: ~XXX KB (gzipped: ~YYY KB)
```

#### 4.2 Verify Build Artifacts

```bash
# Check built files exist
ls -la .next/
ls -la src/app/api/

# Verify API routes in build
ls -la .next/server/app/api/

# Expected:
# payment-links/create/route.js
# qr/validate/route.js
# webhooks/payment-callback/route.js
```

#### 4.3 Deploy to Vercel (or your hosting)

**Option A: Vercel CLI**
```bash
# Deploy to production
vercel deploy --prod

# Expected output:
# ✓ Production deployment: https://your-domain.com
# ✓ Runtime: Node.js
# ✓ Regions: US, EU (if configured)
```

**Option B: Docker/Manual**
```bash
# Build Docker image
docker build -t adruva-charm-engine:latest .

# Push to registry
docker push your-registry/adruva-charm-engine:latest

# Deploy to production server
docker run -d \
  --env-file .env.production \
  --expose 3000 \
  your-registry/adruva-charm-engine:latest
```

#### 4.4 Verify Application Deployment

```bash
# Check application is running
curl https://your-domain.com/api/health
# Expected: 200 OK - { "status": "ok" }

# Check API routes are accessible
curl https://your-domain.com/api/qr/validate
# Expected: 400 Bad Request (missing params - indicates route exists)

# Check pages load
curl https://your-domain.com
# Expected: 200 OK with HTML
```

---

### Phase 5: Webhook Configuration (10 minutes)

#### 5.1 Configure Razorpay Webhook

1. Log in to Razorpay Dashboard (live mode)
2. Go to **Settings → Webhooks**
3. Click **Add Webhook**
4. Configure:
   ```
   URL: https://your-domain.com/api/webhooks/payment-callback
   Events: payment.authorized, payment.failed, payment.captured
   Active: ✓ Enabled
   ```
5. Copy webhook secret
6. Update `.env.production`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=webhook_secret_from_dashboard
   ```
7. Redeploy application
8. Test webhook:
   ```bash
   # Send test webhook
   curl -X POST https://your-domain.com/api/webhooks/payment-callback \
     -H "X-Razorpay-Signature: test-signature" \
     -H "Content-Type: application/json" \
     -d '{"event":"payment.authorized","payload":{}}'
   ```

#### 5.2 Configure PhonePe Webhook (if using)

1. Log in to PhonePe Merchant Dashboard
2. Go to **Settings → Webhooks**
3. Click **Add Webhook**
4. Configure:
   ```
   Webhook URL: https://your-domain.com/api/webhooks/payment-callback
   Events: PAYMENT_SUCCESS, PAYMENT_FAILED
   Active: ✓ Enabled
   ```
5. Verify webhook handler responds correctly

---

### Phase 6: Final Verification (5 minutes)

#### 6.1 Smoke Test

```bash
# Test critical paths in production
BASE_URL=https://your-domain.com

# 1. Test QR validation
curl -X POST $BASE_URL/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"operational-restaurant-id","tableNumber":1}'

# 2. Test payment link creation
curl -X POST $BASE_URL/api/payment-links/create \
  -H "Content-Type: application/json" \
  -d '{"orderId":"smoke-test","amount":100,"gateway":"razorpay"}'

# 3. Check database connectivity
# Go to Supabase dashboard → SQL Editor
# Run: SELECT COUNT(*) FROM restaurants;
```

#### 6.2 Monitor Error Logs

```bash
# Check for deployment errors
curl -X GET https://your-domain.com/api/logs \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: No critical errors in the last 5 minutes
```

---

## Post-Deployment Verification

### Immediate (First 30 minutes)

- [ ] QR validation working
- [ ] Payment link generation working
- [ ] Manual fallback form accessible
- [ ] Webhook signatures verifying correctly
- [ ] No 500 errors in logs
- [ ] Response times normal (<1s)

### Short-term (First 2 hours)

- [ ] Complete order flow working end-to-end
- [ ] Payment notifications received
- [ ] Order status updates in real-time
- [ ] Abandonment tracking recording correctly
- [ ] Staff notifications working

### Long-term (First 24 hours)

- [ ] Webhook failures investigated and resolved
- [ ] Payment reconciliation complete
- [ ] Analytics data populated
- [ ] Performance baseline established
- [ ] No critical issues reported

---

## Monitoring & Alerting

### Enable Production Monitoring

```bash
# Set up application monitoring with Sentry (if configured)
SENTRY_DSN=https://your-sentry-dsn
ENVIRONMENT=production

# Enable database monitoring
# In Supabase dashboard: Settings → Database → Monitoring
```

### Key Metrics to Monitor

1. **API Response Times**
   - `/api/qr/validate`: Target <200ms
   - `/api/payment-links/create`: Target <500ms
   - `/api/webhooks/payment-callback`: Target <100ms

2. **Error Rates**
   - API errors: Target <0.1%
   - Webhook failures: Target <0.5%
   - Database errors: Target <0.01%

3. **Database Performance**
   - Connection pool utilization: Target <70%
   - Query execution time: Target <100ms
   - Slow query log: Review daily

4. **Payment Processing**
   - Payment success rate: Target >99%
   - Average payment processing time: Target <2s
   - Webhook delivery success: Target >99%

### Alert Configuration

```yaml
# Example alert thresholds
alerts:
  api_error_rate_high:
    threshold: 1%  # Alert if >1% errors
    duration: 5m   # For 5 minutes
    action: page_oncall
  
  payment_webhook_failure:
    threshold: 5   # Alert if 5 webhooks fail
    duration: 10m
    action: page_oncall
  
  database_connection_pool_exhausted:
    threshold: 90% # Alert if >90% utilization
    duration: 1m
    action: warning
  
  response_time_degradation:
    threshold: 1s  # Alert if response >1s
    duration: 5m
    action: warning
```

---

## Rollback Procedures

### Scenario: Critical Bug Detected

**Time Estimate: 15 minutes**

#### Step 1: Stop Production Traffic (if needed)

```bash
# Route traffic to previous version
# Using load balancer or DNS:
# Point your-domain.com → previous-deployment-url

# Alternatively, in Vercel:
# Deployments → (previous working version) → Promote to Production
```

#### Step 2: Revert Code Changes

```bash
# In production manually (if not using automated rollback)
# Option A: Deploy previous commit
git checkout previous-stable-commit
npm run build && vercel deploy --prod

# Option B: Use Vercel automatic rollback
# Vercel dashboard → Deployments → (previous) → Promote to Production
```

#### Step 3: Revert Database (if schema changed)

**WARNING: Only if migrations caused issues**

```bash
# DO NOT delete tables, only revert if migration failed
# In Supabase dashboard → Migrations

# Option 1: Reset to previous migration (DEV ONLY)
# This will DELETE new tables - only use if no data
supabase db reset  # This resets entire database!

# Option 2: Better - Keep data, disable new features
# In code, wrap new functionality in feature flags:
if (featureFlags.qrWorkflow) {
  // Use new QR components
}

# Default: featureFlags.qrWorkflow = false (until verified)
```

#### Step 4: Verify Rollback

```bash
# 1. Test API endpoints
curl https://your-domain.com/api/qr/validate

# 2. Check error logs
# Verify no rollback-related errors

# 3. Confirm customer impact is minimal
# Check order processing, payments received, etc.
```

#### Step 5: Post-Mortem

```bash
# Document what went wrong
# Root cause analysis
# Prevention measures for future

# Example rollback checklist:
- [ ] Root cause identified
- [ ] Fix tested locally
- [ ] Fix tested on staging
- [ ] Fix deployed to production
- [ ] Verified working in production
- [ ] Monitoring alerts configured
- [ ] Team updated
- [ ] Customer communication sent
```

---

## Production Troubleshooting

### Issue: QR Validation Returns 404

**Diagnosis:**
```bash
# Check Edge Function is deployed
supabase functions list | grep qr-validate

# Check function code
supabase functions download qr-validate

# Check Supabase logs
supabase functions delete qr-validate --force
supabase functions deploy qr-validate
```

**Resolution:**
```bash
# Redeploy qr-validate function
supabase functions deploy qr-validate
```

### Issue: Payment Links Not Generating

**Diagnosis:**
```bash
# Check Razorpay credentials
echo $RAZORPAY_KEY_ID  # Should start with "rzp_live_"
echo $RAZORPAY_KEY_SECRET

# Check database connection
supabase db query "SELECT NOW();"

# Check payment-links-create function logs
# Monitor Payment link creation API calls
```

**Resolution:**
```bash
# Verify Razorpay credentials in production environment
# Redeploy function with correct env vars:
supabase functions deploy payment-links-create --env-file .env.production
```

### Issue: Webhooks Not Processing

**Diagnosis:**
```bash
# Check webhook logs
supabase functions logs payment-webhook

# Test webhook signature verification
# Verify that webhook secret matches in:
# 1. Razorpay dashboard
# 2. Production .env file
# 3. Function code

# Check if webhook is being called
# In Razorpay dashboard → Webhooks → Recent Events
```

**Resolution:**
```bash
# 1. Verify webhook URL in Razorpay is correct
#    Should be: https://your-domain.com/api/webhooks/payment-callback

# 2. Verify webhook secret is updated:
echo $RAZORPAY_WEBHOOK_SECRET

# 3. Redeploy webhook function:
supabase functions deploy payment-webhook

# 4. Test webhook delivery in Razorpay dashboard
```

### Issue: High API Response Times

**Diagnosis:**
```bash
# Check database performance
supabase db query "
  SELECT query, mean_time FROM pg_stat_statements
  ORDER BY mean_time DESC LIMIT 10;
"

# Check connection pool status
supabase db query "SELECT count(*) FROM pg_stat_activity;"
```

**Resolution:**
```bash
# Optimize database queries
# Add indexes if missing (should already exist from migrations)

# Increase connection pool size (if available)
# Implement caching layer (Redis)
# Optimize Edge Function execution time
```

### Issue: Memory/CPU Spikes

**Diagnosis:**
```bash
# Monitor server resources
# In hosting platform (Vercel, etc.):
# Deployments → (current) → Monitoring

# Check for memory leaks in functions
# Review Edge Function logs for long-running operations
```

**Resolution:**
```bash
# Optimize Edge Function code
# Implement timeout for long operations
# Use streaming responses for large data
# Increase serverless function memory allocation
```

---

## Production Deployment Checklist

**Pre-Deployment:**
- [ ] Database backup taken
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Credentials verified
- [ ] Team notified

**During Deployment:**
- [ ] Migrations deployed successfully
- [ ] Functions deployed successfully
- [ ] Application deployed successfully
- [ ] Webhooks configured

**Post-Deployment:**
- [ ] API endpoints responding
- [ ] Smoke tests passing
- [ ] No critical errors in logs
- [ ] Metrics normal
- [ ] Team confirmed working

**Sign-Off:**
- [ ] Product Manager: Feature verified working
- [ ] QA: No critical issues
- [ ] Tech Lead: Architecture sound
- [ ] DevOps: Monitoring in place
- [ ] Support: Team trained

**Date:** _________  
**Version:** _________ (e.g., 2.1.0)  
**Deployed By:** _________  
**Approved By:** _________

---

## Quick Reference

**Emergency Contacts:**
- On-Call Engineer: [Phone/Slack]
- Payment Team Lead: [Phone/Slack]
- Database Admin: [Phone/Slack]

**Important URLs:**
- Production: https://your-domain.com
- Supabase Dashboard: https://supabase.com/dashboard
- Razorpay Dashboard: https://dashboard.razorpay.com
- Vercel Dashboard: https://vercel.com/dashboard

**Critical Commands:**
```bash
# View production logs
supabase functions logs payment-webhook --limit 100

# Emergency rollback
vercel rollback --confirmed

# Restart application
vercel deploy --prod

# Database backup
supabase db dump --db-url postgresql://... > emergency_backup.sql
```
