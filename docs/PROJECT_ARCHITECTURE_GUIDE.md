# Adruva Charm Engine Architecture Guide

## Purpose

This document explains the full structure of the Adruva Charm Engine project so you can understand:

- what the product is trying to do
- how the major user flows work
- which folders/files are responsible for which features
- how frontend, Supabase, and deployment fit together
- where future work should happen safely

This guide is written for both product understanding and technical onboarding.

---

## 1. Product Vision

Adruva is not just a single restaurant app. It is a restaurant SaaS platform with three big layers:

1. Public marketing and lead capture
2. Restaurant owner and outlet operations
3. Super Admin platform management

In simple terms, the product tries to cover this full lifecycle:

1. A restaurant owner discovers Adruva on the website
2. They fill an enquiry/demo form
3. The request appears in the Super Admin panel
4. Admin reviews, schedules demo, approves, and manages plan/subscription
5. The owner logs in and configures restaurant operations
6. The restaurant uses menu, QR ordering, cashier, kitchen, inventory, expenses, staff, analytics
7. Admin continues managing billing, support, onboarding, notifications, reports, and activity

So the project is a full SaaS operating system for restaurant-tech operations.

---

## 2. High-Level Architecture

The app is a Vite + React + TypeScript frontend deployed on Vercel, backed by Supabase.

### Frontend stack

- React + TypeScript
- React Router
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Framer Motion
- Recharts

### Backend stack

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Edge Functions
- Supabase RPC functions
- Row Level Security (RLS)

### Deployment stack

- Vercel for frontend hosting
- Supabase for data/auth/storage/functions

---

## 3. Main Runtime Layers

### Public Layer

Used by:

- marketing website visitors
- leads/prospects
- restaurant customers scanning QR

Main features:

- landing page
- pricing/demo sections
- enquiry form
- website score tool
- QR customer menu
- order placement
- receipt/review flow

### Owner Layer

Used by:

- restaurant owner
- manager
- kitchen staff
- cashier

Main features:

- owner dashboard
- menu manager
- table and room QR management
- kitchen display
- cashier billing
- analytics
- inventory
- expenses
- staff
- settings

### Admin Layer

Used by:

- super admin/platform ops team

Main features:

- client portfolio
- subscriptions/plans
- payments/invoices
- onboarding queue
- outlet directory
- support tickets
- users and roles
- module matrix
- notifications
- reports
- activity logs
- platform operations views

---

## 4. Main Entry Files

### [`src/main.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/main.tsx)

Bootstraps the entire React app.

Responsibilities:

- mounts React app
- loads global CSS
- initializes Sentry integration
- wraps app with global providers and error boundary

### [`src/App.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/App.tsx)

This is the main route map and app shell orchestrator.

Responsibilities:

- creates TanStack Query client
- wraps app with:
  - `ThemeProvider`
  - `LanguageProvider`
  - `AuthProvider`
  - `TooltipProvider`
- defines all routes
- handles lazy loading
- handles route prefetching for performance

Important route groups:

- `/` public landing page
- `/menu/:ownerId` customer menu
- `/owner/*` owner and outlet operations
- `/admin/*` super admin console

---

## 5. Authentication and Identity

### [`src/contexts/AuthContext.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/contexts/AuthContext.tsx)

This is the central auth state manager.

Responsibilities:

- sign up / sign in / sign out
- session restoration on refresh
- keep `user`, `session`, and `loading` in sync
- normalize auth errors
- ensure profile exists after login
- auto-claim pending staff invitations
- send user context to Sentry

Important meaning:

- This is the source of truth for current logged-in identity.
- If login/session logic breaks, owner/admin pages break too.

### Role resolution

### [`src/hooks/useStaffRole.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useStaffRole.ts)

This hook decides:

- who the current user is in restaurant terms
- whether they are:
  - owner
  - manager
  - kitchen
  - cashier
- which owner account they belong to

This hook is critical because many owner screens use `ownerId`, not just `user.id`.

### Owner plan resolution

### [`src/hooks/useOwnerPlan.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useOwnerPlan.ts)

Used to decide feature availability by subscription plan.

Examples:

- can analytics be shown?
- how many tables are allowed?
- how many staff are allowed?
- is inventory enabled?

This is the main feature-gating layer on owner side.

---

## 6. Layout System

### Public layout pieces

Mainly composed inside the landing page using components like:

- [`Navbar.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/Navbar.tsx)
- [`HeroSection.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/HeroSection.tsx)
- [`CTASection.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/CTASection.tsx)
- [`WebsiteScoreTool.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/WebsiteScoreTool.tsx)

### Owner shell

### [`src/components/OwnerLayout.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/OwnerLayout.tsx)

This is the shared owner application frame.

Responsibilities:

- owner sidebar
- mobile left drawer
- top header
- logout
- owner identity/logo
- dashboard theme application
- support links
- new-order badge in sidebar

Owner pages are rendered inside this layout.

### Admin shell

### [`src/components/AdminLayout.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/AdminLayout.tsx)

This is the super admin console frame.

Responsibilities:

- collapsible fixed sidebar
- mobile left drawer
- global search
- quick actions
- notification shortcut
- admin identity panel
- logout

Admin module pages render inside this layout.

---

## 7. Route and Section Map

## Public Pages

### [`src/pages/Index.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/Index.tsx)

Main marketing site.

Sections generally include:

- hero
- services
- demo
- pricing
- why choose
- testimonials
- CTA / lead capture

### [`src/components/CTASection.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/CTASection.tsx)

Lead form logic.

Current behavior:

- collects restaurant lead details
- writes into `demo_requests`
- opens WhatsApp with prefilled message to sales/admin number

### [`src/components/WebsiteScoreTool.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/WebsiteScoreTool.tsx)

Website analysis UI.

Backend dependency:

- Supabase Edge Function: `analyze-website`

### [`src/pages/CustomerMenu.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/CustomerMenu.tsx)

This is one of the most important runtime pages.

Responsibilities:

- fetch public restaurant profile
- fetch categories and menu items
- fetch public menu customization
- handle QR table number flow
- block occupied tables
- cart logic
- combo ordering
- variants/addons
- coupon validation
- public order placement
- public order tracking
- receipt hydration
- review flow

This page is the heart of customer ordering.

---

## Owner Pages

### [`src/pages/OwnerLogin.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerLogin.tsx)

Owner authentication UI.

### [`src/pages/OwnerDashboard.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerDashboard.tsx)

Restaurant operations overview.

Includes:

- order metrics
- order state tabs
- active tables
- kitchen queue
- live operational widgets

### [`src/pages/OwnerMenu.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerMenu.tsx)

Menu management workspace.

Includes:

- category management
- menu item management
- item images
- availability
- veg/non-veg
- featured items
- stock metadata
- time windows
- tags
- variants
- addons
- combos
- CSV import

This page is one of the most complex owner management pages.

### [`src/pages/OwnerTables.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerTables.tsx)

Table creation and QR management.

### [`src/pages/OwnerRooms.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerRooms.tsx)

Room/private dining QR setup.

### [`src/pages/KitchenDisplay.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/KitchenDisplay.tsx)

Kitchen queue and order progression.

### [`src/pages/CashierDashboard.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/CashierDashboard.tsx)

Billing-oriented operational dashboard.

### [`src/pages/OwnerInventory.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerInventory.tsx)

Inventory and stock operations.

### [`src/pages/OwnerExpenses.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerExpenses.tsx)

Expense entry and expense reporting.

### [`src/pages/OwnerAnalytics.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerAnalytics.tsx)

Restaurant-level analytics.

Chart rendering is separated to:

- [`OwnerAnalyticsCharts.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/analytics/OwnerAnalyticsCharts.tsx)
- [`OwnerExpenseCharts.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/analytics/OwnerExpenseCharts.tsx)

### [`src/pages/OwnerStaff.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerStaff.tsx)

Staff management and invitation flow.

### [`src/pages/OwnerSettings.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerSettings.tsx)

Restaurant profile, branding, logo, settings, menu personalization, and dashboard theme controls.

### [`src/pages/OwnerCustomers.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerCustomers.tsx)

Customer data/review related view depending on plan features.

### [`src/pages/OwnerChain.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/OwnerChain.tsx)

Used for multi-outlet/chain-related owner view where plan supports it.

---

## Admin Pages

### [`src/pages/AdminLogin.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminLogin.tsx)

Super admin authentication screen.

### [`src/pages/AdminDashboard.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminDashboard.tsx)

Platform-level health dashboard.

Shows:

- total clients
- active/trial clients
- outlets
- subscriptions
- expiring soon
- MRR estimate
- pending onboarding
- tickets
- failed payments
- latest leads
- latest alerts
- onboarding focus
- charts

Heavy chart rendering moved into:

- [`AdminDashboardCharts.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/admin/AdminDashboardCharts.tsx)

### [`src/pages/AdminOwners.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminOwners.tsx)

Client portfolio list.

This is effectively the `Clients` module.

### [`src/pages/AdminOwnerDetail.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminOwnerDetail.tsx)

Single client detail workspace.

Tabs generally cover:

- overview
- outlets
- subscription
- payments
- modules
- users
- support
- activity

### [`src/pages/AdminPlans.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminPlans.tsx)

Subscription and plan assignment center.

### [`src/pages/AdminPayments.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminPayments.tsx)

Invoices and payment operations.

### [`src/pages/AdminOutlets.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminOutlets.tsx)

All outlet/branch visibility across clients.

### [`src/pages/AdminOnboarding.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminOnboarding.tsx)

Onboarding queue and lead progression management.

### [`src/pages/AdminSupport.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminSupport.tsx)

Support ticket queue.

### [`src/pages/AdminUsers.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminUsers.tsx)

Platform user and role visibility.

### [`src/pages/AdminModules.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminModules.tsx)

Read-oriented module access matrix by plans/features.

### [`src/pages/AdminNotifications.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminNotifications.tsx)

Operational alert center.

### [`src/pages/AdminReports.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminReports.tsx)

Platform analytics and reports.

Heavy chart rendering moved into:

- [`AdminReportsCharts.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/admin/AdminReportsCharts.tsx)

### [`src/pages/AdminActivity.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminActivity.tsx)

Operational action trail / audit style view.

### Bounded operational views

These pages exist, but they are intentionally truthful operational views instead of fake full-save systems:

- [`AdminTemplates.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminTemplates.tsx)
- [`AdminIntegrations.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminIntegrations.tsx)
- [`AdminSystemSettings.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminSystemSettings.tsx)
- [`AdminProfile.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/AdminProfile.tsx)

Meaning:

- UI is present
- structure is ready
- but not every setting is backed by a complete database/control plane yet

---

## 8. Folder-by-Folder Explanation

## `src/components`

Reusable UI and feature components.

Main groups:

- `admin/` admin-specific widgets and charts
- `menu/` owner menu management pieces
- `settings/` owner settings sub-panels
- `analytics/` owner analytics chart components
- `billing/` printer/billing support pieces
- `inventory/` stock history components
- `ui/` shadcn/ui primitives

Examples:

- [`src/components/menu/MenuItemCard.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/menu/MenuItemCard.tsx)
- [`src/components/menu/ComboManager.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/menu/ComboManager.tsx)
- [`src/components/admin/AdminPrimitives.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/admin/AdminPrimitives.tsx)

## `src/pages`

Route-level pages only.

Think of this folder as:

- each file = a major screen
- page composes components, hooks, and data calls

## `src/hooks`

Domain-specific data and permissions hooks.

Examples:

- auth/role resolution
- admin data fetching
- owner plan logic
- toast helpers

Important hooks:

- [`useStaffRole.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useStaffRole.ts)
- [`useAdminClients.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useAdminClients.ts)
- [`useAdminSubscriptions.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useAdminSubscriptions.ts)
- [`useAdminPayments.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useAdminPayments.ts)
- [`useAdminOperations.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useAdminOperations.ts)
- [`useAdminOpsCenter.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useAdminOpsCenter.ts)

## `src/contexts`

Global app contexts.

- [`AuthContext.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/contexts/AuthContext.tsx)
- [`LanguageContext.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/contexts/LanguageContext.tsx)

## `src/lib`

Project-level helpers and shared logic.

Examples:

- image compression
- number sanitization
- theme presets
- lazy loading retry
- admin query defaults
- profile/logo helpers
- Sentry setup

Important files:

- [`menu-image.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/menu-image.ts)
- [`number-input.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/number-input.ts)
- [`dashboardThemes.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/dashboardThemes.ts)
- [`lazyWithRetry.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/lazyWithRetry.ts)
- [`restaurantLogo.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/restaurantLogo.ts)
- [`adminQuery.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/adminQuery.ts)

## `src/integrations/supabase`

Supabase wiring.

- [`client.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/integrations/supabase/client.ts)
- [`types.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/integrations/supabase/types.ts)

`client.ts` creates typed Supabase client.
`types.ts` is the generated database type map and is extremely important for type-safe queries.

## `supabase/migrations`

Database evolution history.

This folder contains all database changes:

- tables
- columns
- RPC functions
- RLS policies
- security fixes
- admin modules
- order flow hardening

## `supabase/functions`

Supabase Edge Functions.

Current important functions:

- [`analyze-website/index.ts`](/d:/Adruva_Resto/adruva-charm-engine/supabase/functions/analyze-website/index.ts)
- [`create-test-kitchen-staff/index.ts`](/d:/Adruva_Resto/adruva-charm-engine/supabase/functions/create-test-kitchen-staff/index.ts)

## `docs`

Operational documentation folder.

Includes:

- deployment docs
- release notes
- smoke test checklist
- technical handoff

---

## 9. Database / Supabase Architecture

This project uses Supabase as the primary backend.

### Core database responsibilities

- authentication identities
- restaurant profiles
- plans and subscriptions
- menu/categories/items
- tables/rooms/orders
- inventory/expenses/staff
- admin platform operations
- leads / demo requests

### Important data patterns used in this project

#### `profiles`

Primary restaurant/owner profile table.

Used for:

- restaurant name
- logo
- branding fields
- contact fields
- GPS details
- plan-linked profile data

#### `staff_members` and `staff_invitations`

Used for role-based owner-side access.

#### Menu model

- `menu_categories`
- `menu_items`
- `variant_groups`
- `variant_options`
- `addon_groups`
- `addon_options`
- `menu_item_addon_groups`
- `menu_item_tags`
- `item_tags`
- `menu_combos`
- `combo_items`

#### Operations model

- `restaurant_tables`
- `restaurant_rooms`
- `orders`
- `order_items`
- coupon-related tables

#### Admin platform model

- `demo_requests`
- plan/subscription structures
- admin invoices
- support tickets
- notifications
- activity logs

### RPC-heavy architecture

This project uses RPC functions extensively for safer business flows.

Examples:

- public coupon validation
- public order placement
- public receipt hydration
- public order tracking
- white-label checks
- admin client/subscription/payment/operations reporting

This is good because complex logic is centralized on backend instead of open client-side direct table access.

---

## 10. Main Business Workflows

## Workflow A: Website lead to admin queue

1. User opens landing page
2. Fills consultation form in [`CTASection.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/CTASection.tsx)
3. Data inserts into `demo_requests`
4. Admin sees it in dashboard and onboarding workflows
5. Admin updates lead state:
   - new
   - contacted
   - demo scheduled
   - approved
   - rejected
   - converted

## Workflow B: Owner login and feature gating

1. Owner logs in via Supabase Auth
2. [`AuthContext.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/contexts/AuthContext.tsx) restores session
3. [`useStaffRole.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useStaffRole.ts) resolves owner or staff context
4. [`useOwnerPlan.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/hooks/useOwnerPlan.ts) resolves plan
5. [`OwnerLayout.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/OwnerLayout.tsx) shows only allowed modules

## Workflow C: Customer QR ordering

1. Customer scans table QR
2. `/menu/:ownerId?table=...` opens
3. [`CustomerMenu.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/pages/CustomerMenu.tsx) loads:
   - public profile
   - categories
   - items
   - customization
   - table status
4. If table is occupied, ordering is blocked
5. Customer adds items, variants, addons, combos
6. Coupon validated through RPC
7. Order placed through secure public RPC
8. Receipt hydrated from backend
9. Order status tracked until ready/served

## Workflow D: Owner operations

1. Owner manages menu
2. Tables/rooms generate QR flows
3. Kitchen/cashier update order lifecycle
4. Inventory and expense records support business monitoring
5. Analytics surfaces performance based on plan permissions

## Workflow E: Super admin operations

1. Admin logs into `/admin`
2. Admin dashboard shows platform health
3. Clients page shows real client portfolio
4. Client detail shows per-account state
5. Plans/subscriptions assign or update billing state
6. Payments shows invoices and finance actions
7. Onboarding tracks activation progress
8. Support/notifications/activity/reporting provide ops visibility

---

## 11. Performance Strategy

The app already uses several performance techniques:

- route-level lazy loading
- retry-safe lazy imports
- selective route prefetching
- admin query caching defaults
- chart components separated from page shells
- owner/admin mobile layout optimization
- manual Vite chunk splitting
- image compression to WebP for menu/combo uploads

Important files:

- [`src/App.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/App.tsx)
- [`src/lib/lazyWithRetry.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/lazyWithRetry.ts)
- [`src/lib/adminQuery.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/adminQuery.ts)
- [`vite.config.ts`](/d:/Adruva_Resto/adruva-charm-engine/vite.config.ts)

---

## 12. Safety and Validation Strategy

The project already contains several guardrails:

- RLS policies on Supabase
- public reads narrowed through RPCs
- public order flow shifted to backend RPC
- negative number blocking in forms
- plan-based feature gating
- role-based route guards
- safe owner/admin auth redirects
- occupied table blocking
- secure lead visibility for admins only

Important files:

- [`src/components/ProtectedRoute.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/ProtectedRoute.tsx)
- [`src/components/AdminGuard.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/AdminGuard.tsx)
- [`src/components/RoleGuard.tsx`](/d:/Adruva_Resto/adruva-charm-engine/src/components/RoleGuard.tsx)
- [`src/lib/number-input.ts`](/d:/Adruva_Resto/adruva-charm-engine/src/lib/number-input.ts)

---

## 13. Deployment Architecture

### Frontend

- hosted on Vercel
- SPA rewrites enabled through `vercel.json`

### Backend

- Supabase project handles auth/db/storage/functions

### Production helpers

See these docs:

- [`SUPABASE_DEPLOYMENT.md`](/d:/Adruva_Resto/adruva-charm-engine/docs/SUPABASE_DEPLOYMENT.md)
- [`RELEASE_COMMANDS.md`](/d:/Adruva_Resto/adruva-charm-engine/docs/RELEASE_COMMANDS.md)
- [`RELEASE_CHECKLIST.md`](/d:/Adruva_Resto/adruva-charm-engine/docs/RELEASE_CHECKLIST.md)
- [`FINAL_SMOKE_TEST_CHECKLIST.md`](/d:/Adruva_Resto/adruva-charm-engine/docs/FINAL_SMOKE_TEST_CHECKLIST.md)

---

## 14. Where to Make Changes Safely

If you want to change a specific product area, use this map:

### Public website copy/design

- `src/pages/Index.tsx`
- `src/components/*Section.tsx`
- `src/components/Navbar.tsx`

### Customer QR ordering

- `src/pages/CustomerMenu.tsx`
- `src/components/menu/ItemCustomizeModal.tsx`
- public order/coupon/receipt RPC migrations

### Owner menu management

- `src/pages/OwnerMenu.tsx`
- `src/components/menu/*`

### Owner branding/settings/logo/theme

- `src/pages/OwnerSettings.tsx`
- `src/components/OwnerLayout.tsx`
- `src/lib/dashboardThemes.ts`
- `src/lib/restaurantLogo.ts`

### Owner analytics/performance

- `src/pages/OwnerAnalytics.tsx`
- `src/pages/OwnerExpenses.tsx`
- `src/components/analytics/*`

### Admin client/subscription/payment flows

- `src/pages/AdminOwners.tsx`
- `src/pages/AdminOwnerDetail.tsx`
- `src/pages/AdminPlans.tsx`
- `src/pages/AdminPayments.tsx`
- `src/hooks/useAdmin*.ts`
- admin migrations/RPCs in `supabase/migrations`

### Platform onboarding / leads

- `src/components/CTASection.tsx`
- `src/pages/AdminOnboarding.tsx`
- `src/hooks/useAdminOperations.ts`
- `demo_requests` migrations

---

## 15. Current Mental Model of the Codebase

The easiest way to understand the app is:

### Think of it as 3 apps in 1

1. Public website and lead engine
2. Restaurant operating app
3. SaaS admin operating console

### And 3 backend styles

1. direct typed Supabase table access for simple CRUD
2. TanStack Query hooks for admin and owner data orchestration
3. RPC-based protected business flows for public and sensitive logic

That is the real architecture.

---

## 16. Recommended Next Documentation Layer

If you want even deeper understanding after this, the next best documents would be:

1. `database-table-map`
2. `route-by-route workflow map`
3. `owner flow SOP`
4. `admin flow SOP`
5. `future roadmap + missing systems`

This guide is the big-picture architecture document. The next layer would be more operational and deeper.

