# Adruva Workflow Audit Playbook

## Why This Exists

This document is the practical audit playbook for Adruva Charm Engine.

It is not a marketing overview.
It is the working checklist for verifying that:

- the product flow is logically complete
- the database and UI are aligned
- auth and owner/staff mapping are safe
- order and billing flows do not conflict
- admin reporting reflects real operations
- each module behaves like a production restaurant SaaS system

---

## What Adruva Is Building

Adruva is a full restaurant SaaS operating system with 3 connected surfaces:

1. Public growth and QR ordering
2. Restaurant operations
3. Super Admin control plane

That means the real product is not just:

- menu
- kitchen
- cashier

It is a chain of trust:

1. lead enters system
2. owner gets activated
3. menu and tables are configured
4. customer orders from QR or staff enters counter order
5. kitchen progresses order state
6. cashier or QR payment settles the bill
7. inventory, wastage, invoices, and admin reporting stay consistent

If any one of those layers drifts from the others, the product starts feeling "patched" instead of "system-grade".

---

## Audit Philosophy

We audit phase by phase.

Each phase must answer 4 things:

1. Is the workflow logically complete?
2. Is the backend the source of truth?
3. Does the UI reflect the real allowed state?
4. Does admin visibility match the operational event?

---

## Phase Map

### Phase 1: Identity, Auth, and Access Mapping

Goal:

- verify that every owner/staff/admin screen resolves identity correctly
- verify that permission checks are consistent between UI and backend

Checklist:

- `AuthContext` restores session correctly
- owner and staff roles resolve to the right `ownerId`
- role guards match backend RPC permissions
- owner-only features do not leak to staff
- admin-only data does not leak to owners

Likely failure patterns:

- user has profile but wrong owner mapping
- UI allows action but RPC rejects it
- staff role exists in UI but not in DB lookup

---

### Phase 2: Public QR Ordering Flow

Goal:

- verify that a QR customer can place an order safely and track it without exposing private data

Checklist:

- public restaurant profile fetch works only for valid owner
- active menu categories and items load correctly
- blocked or occupied tables cannot place duplicate orders
- coupon validation is backend-controlled
- public order placement is RPC-controlled
- public receipt and tracking require secure tokens
- customer sees correct order status transitions

Likely failure patterns:

- broad public reads through direct tables
- table occupancy mismatch
- receipt or tracking leak through guessable IDs
- menu data inconsistency between owner and public side

---

### Phase 3: Order Lifecycle and Kitchen Workflow

Goal:

- ensure `new -> accepted -> preparing -> ready -> served` is consistent everywhere

Checklist:

- owner dashboard and kitchen display use the same transition rules
- invalid jumps are blocked
- realtime updates are visible on owner and kitchen screens
- inventory deduction triggers exactly once at the intended state
- cancelled orders do not re-enter active queues

Likely failure patterns:

- direct table updates bypass business logic
- different screens allow different transitions
- served state fires side effects more than once

---

### Phase 4: Cashier and Settlement Workflow

Goal:

- ensure billing is fast for staff and consistent for accounting

Checklist:

- ready/served/pending/confirmed states are clear
- counter orders can be created only on free tables
- cashier can close invoice without friction
- split, reopen, void, and cancellation rules are coherent
- payment entry, order state, invoice state, and admin discrepancy reporting match
- printed receipt reflects actual finalized bill

Likely failure patterns:

- UI field friction slows billing
- payment succeeds but order state remains stale
- reopen/void leaves inventory or admin reporting inconsistent
- QR-settled invoices remain manually editable

---

### Phase 5: Inventory, Expenses, and Wastage

Goal:

- ensure operational stock and loss numbers are trustworthy

Checklist:

- served orders deduct inventory once
- void/reopen/cancel flows restore or report loss correctly
- wastage events appear in admin reporting
- manual adjustments do not conflict with order deductions
- combo and ingredient mapping behaves correctly

Likely failure patterns:

- negative stock drift
- reopen without restoration
- wastage not visible in admin

---

### Phase 6: Admin Control Plane

Goal:

- verify that Super Admin sees real operational truth, not approximate UI numbers

Checklist:

- onboarding queue reflects real demo/lead progression
- clients, plans, payments, and reports align
- wastage and billing discrepancies surface correctly
- support and notification counts are derived from real records
- immutable invoice history is preserved

Likely failure patterns:

- admin panels showing demo data patterns
- finance totals not matching live records
- ops reports missing exceptions

---

### Phase 7: Deployment, Security, and Runtime Health

Goal:

- ensure the live system is safe, observable, and repeatable to deploy

Checklist:

- migrations are ordered and safe
- no accidental broad RLS policies remain
- public RPCs are safer than direct table access
- build and deploy docs match actual release flow
- realtime subscriptions only watch needed tables
- indexes support hot-path queries

Likely failure patterns:

- migration drift
- old RLS exceptions still active
- slow owner/cashier dashboards under real load

---

## Current High-Priority Findings

### 1. Order state transitions are not yet fully centralized

Current observation:

- owner dashboard directly updates `orders.status`
- kitchen display directly updates `orders.status`
- cashier and public flows use backend RPC-heavy logic

Why this matters:

- lifecycle rules can drift screen to screen
- future audit logging, staff attribution, and side effects become hard to guarantee

Target state:

- one backend-governed order transition function
- UI becomes a thin trigger layer

### 2. Customer and cashier flows are more hardened than owner workflow transitions

Current observation:

- public order tracking and billing got dedicated backend logic
- owner dashboard and kitchen transitions still behave more like direct admin tools

Why this matters:

- operational core should be stricter than convenience dashboards

### 3. The product is now clearly a system, so every change must be lifecycle-aware

Current observation:

- inventory, payment, invoice, and wastage are now coupled to order state

Why this matters:

- a simple status button is no longer simple
- every status move should be evaluated for downstream side effects

---

## Definition of "Industry-Level Fit"

For Adruva, "industry-level" should mean:

- staff can complete the task with minimal clicks
- backend owns the business rules
- auditability is preserved
- immutable financial history is protected
- admin sees discrepancies instead of hidden failures
- realtime views do not rely on manual refresh discipline

If a workflow is fast but unsafe, it is not industry-grade.
If a workflow is safe but too slow for rush-hour usage, it is not industry-grade either.

Adruva needs both.

---

## FAQ

### Why phase-wise audit instead of checking random screens?

Because the product is lifecycle-driven.
Random screen QA misses cross-surface bugs.

### Why is owner/staff identity a first-class audit topic?

Because almost every operational query depends on the resolved `ownerId`.
If that resolution is wrong, every later module becomes misleading.

### Why centralize order transitions?

Because order status now controls:

- kitchen visibility
- cashier billing behavior
- customer live tracking
- inventory deduction
- wastage and audit reporting

### Why keep documenting while fixing?

Because if the mental model stays only in code, the next change can easily break another surface.

---

## Next Implementation Sequence

1. Centralize order transitions through backend logic
2. Verify public QR ordering against current RLS/RPC behavior
3. Audit cashier close/reopen/void paths against inventory and admin reporting
4. Verify admin reports against live operational sources
5. Add browser-level smoke checklist for each phase
