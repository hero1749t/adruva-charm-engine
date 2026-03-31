

## Admin Panel — SaaS Package & Owner Management System

### What You're Building

A separate **Admin Panel** (`/admin/*`) where you (the developer/admin) can:
1. Create and manage **subscription plans** (packages with feature limits)
2. **Appoint plans to restaurant owners** — each owner only sees features their plan allows
3. Control **limits** (tables, menu items, staff, orders/month, etc.)
4. Set **validity periods** (plan expiry dates)
5. View all owners and their usage
6. Full data isolation — owners only see their own data, admin sees everything

---

### Database Schema (5 new tables)

**1. `admin_users`** — Who is an admin (you)
```sql
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
-- RLS: Only admin can read (security definer function)
```

**2. `subscription_plans`** — Packages admin creates
```sql
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- "Basic", "Pro", "Enterprise"
  price numeric NOT NULL DEFAULT 0,
  billing_period text DEFAULT 'monthly', -- monthly/yearly/lifetime
  max_tables integer DEFAULT 5,
  max_rooms integer DEFAULT 0,
  max_menu_items integer DEFAULT 50,
  max_staff integer DEFAULT 2,
  max_orders_per_month integer DEFAULT 500,
  feature_analytics boolean DEFAULT false,
  feature_inventory boolean DEFAULT false,
  feature_expenses boolean DEFAULT false,
  feature_chain boolean DEFAULT false,
  feature_coupons boolean DEFAULT false,
  feature_online_orders boolean DEFAULT false,
  feature_kitchen_display boolean DEFAULT true,
  feature_customer_reviews boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**3. `owner_subscriptions`** — Which plan is assigned to which owner
```sql
CREATE TABLE public.owner_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text DEFAULT 'active',          -- active/expired/suspended
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  assigned_by uuid NOT NULL,             -- admin user_id
  created_at timestamptz DEFAULT now()
);
```

**4. Security definer function: `is_admin()`**
```sql
CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
  AS $$ SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = _user_id) $$
  LANGUAGE sql STABLE SECURITY DEFINER;
```

**5. Security definer function: `get_owner_features()`**
Returns the active plan's feature flags + limits for a given owner — used by the owner panel to hide/show sidebar items and enforce limits.

---

### Admin Panel Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/admin/login` | AdminLogin | Separate login (same auth, checks admin_users) |
| `/admin/dashboard` | AdminDashboard | Overview: total owners, active plans, revenue |
| `/admin/plans` | AdminPlans | CRUD subscription plans with feature toggles & limits |
| `/admin/owners` | AdminOwners | List all owners, assign/change plans, set expiry |
| `/admin/owner/:id` | AdminOwnerDetail | View owner's usage, data, plan status |

**Admin Layout** — Separate sidebar with admin-specific navigation, completely isolated from owner panel.

---

### Owner Panel Integration

**New hook: `useOwnerPlan()`**
- Fetches the owner's active subscription via `owner_subscriptions` → `subscription_plans`
- Returns feature flags (`feature_analytics`, `feature_inventory`, etc.) and limits
- Caches result

**OwnerLayout.tsx changes:**
- Sidebar items filtered by plan features (e.g., hide "Analytics" if `feature_analytics = false`)
- Show plan name + expiry in sidebar footer

**Limit enforcement:**
- When creating tables → check `count < max_tables`
- When adding menu items → check `count < max_menu_items`
- When adding staff → check `count < max_staff`
- Show toast: "Your plan allows max X items. Upgrade to add more."

---

### Security Architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Admin User  │────▶│  admin_users     │     │  RLS: is_admin() │
│  (you)       │     │  table check     │────▶│  gates all admin │
└─────────────┘     └──────────────────┘     │  table access    │
                                              └─────────────────┘

┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Owner User  │────▶│  owner_subs +    │────▶│  Feature flags   │
│              │     │  plan lookup     │     │  limit checks    │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

- **Admin tables** have RLS: only `is_admin(auth.uid())` can SELECT/INSERT/UPDATE
- **Owners cannot see** `admin_users`, `subscription_plans` (admin-only), or other owners' `owner_subscriptions`
- **Owner can read** their own subscription record (RLS: `owner_id = auth.uid()`)
- Plans table: public SELECT (owners need to see their plan name), admin-only write

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/AdminLogin.tsx` | Admin login page |
| `src/pages/AdminDashboard.tsx` | Admin overview stats |
| `src/pages/AdminPlans.tsx` | Plan CRUD with feature toggles |
| `src/pages/AdminOwners.tsx` | Owner list + plan assignment |
| `src/pages/AdminOwnerDetail.tsx` | Single owner view |
| `src/components/AdminLayout.tsx` | Admin sidebar layout |
| `src/components/AdminGuard.tsx` | Route guard checking is_admin() |
| `src/hooks/useAdminCheck.ts` | Hook to verify admin status |
| `src/hooks/useOwnerPlan.ts` | Hook for owner's active plan features/limits |
| Migration file | 3 tables + 2 functions + RLS policies |

### Files to Edit

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/admin/*` routes |
| `src/components/OwnerLayout.tsx` | Filter sidebar by plan features |
| Various owner pages | Add limit checks before create operations |

---

### Implementation Order
1. Migration (tables, functions, RLS)
2. Admin guard + layout
3. Admin pages (login, dashboard, plans, owners)
4. `useOwnerPlan` hook
5. Owner sidebar filtering by plan
6. Limit enforcement on owner pages

