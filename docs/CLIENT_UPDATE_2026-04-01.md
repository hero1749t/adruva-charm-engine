# Client Update - 2026-04-01

The platform has gone through a major stabilization and production-hardening pass.

## What was improved

- Core bugs in owner, staff, dashboard, cashier, kitchen, and customer menu flows were fixed.
- Customer ordering is now more secure and server-validated.
- Promo code validation and customer receipts are now based on server-side data.
- Public database access was tightened to reduce exposure of internal data.
- Staff invite and claim flow was made safer.
- Performance was improved through lazy loading and bundle optimization.

## What this means in practice

- The app is more reliable in daily restaurant operations.
- Customer-facing ordering is safer and more accurate.
- Owner and staff data now resolve more consistently.
- Combo orders and inventory deductions now behave more correctly.
- Deployment and verification documentation is now in place for safer releases.

## Current verification status

- Lint checks pass
- TypeScript checks pass
- Production build passes

## Important release note

The latest database migrations must be applied before the frontend release so the new secure order and public-access flows work correctly.
