# Final Smoke Test Checklist

Use this checklist after production deploys to verify the live Adruva platform end to end.

Production URL:
`https://adruva-charm-engine.vercel.app`

## 1. Public Website

- Open home page and verify hero, website score tool, pricing, contact, and free consultation sections load.
- Submit the free consultation form with test data.
- Confirm success toast appears.
- Confirm WhatsApp handoff opens for `8383877088`.
- Log in as admin and verify the new lead appears in `Admin Dashboard -> Latest Website Leads`.

## 2. Website Score Tool

- Test with a valid URL like `https://google.com`.
- Confirm the score result loads without `Edge Function returned a non-2xx status code`.
- Test with an invalid domain.
- Confirm a user-readable error message appears instead of a generic failure.

## 3. Owner Authentication

- Log in with a real owner account.
- Confirm owner dashboard opens without redirect loops or blank screen.
- Refresh the page on:
  - `/owner/dashboard`
  - `/owner/menu`
  - `/owner/settings`
- Confirm session stays valid and pages still render.

## 4. Owner Settings

- Update restaurant name and phone.
- Confirm typing is smooth and cursor does not jump.
- Upload a restaurant logo.
- Refresh the page.
- Confirm logo remains visible in Settings and in the top bar.
- Change dashboard theme preset.
- Confirm owner shell updates and remains readable.
- Confirm menu personalization settings are separate from dashboard theme.

## 5. Owner Menu Management

- Add a category with image.
- Edit the category name and image.
- Delete a test category with confirmation.
- Drag categories to reorder and confirm order persists after refresh.
- Add a menu item with:
  - name
  - description
  - price
  - MRP
  - category
  - veg or non-veg
  - featured
  - image
  - stock values
  - availability times
- Edit the item and confirm updates persist after refresh.
- Delete a test item.
- Add and edit a combo with image.

## 6. Customer QR Flow

- Scan an available table QR.
- Confirm customer menu opens directly.
- Add a normal item to cart and place an order.
- Add a customized item and place an order.
- Add a combo and place an order.
- Apply a valid coupon and confirm discount is reflected.
- Confirm receipt view loads after order.
- Scan an occupied table QR.
- Confirm the user sees an occupied-table message and ordering does not continue.

## 7. Kitchen and Cashier

- Open `/owner/kitchen`.
- Confirm queue loads and page does not hang.
- Open `/owner/cashier`.
- Confirm orders load and actions are available.
- Serve a completed order.
- Confirm status updates properly.

## 8. Inventory and Expenses

- Open `/owner/inventory`.
- Confirm page loads for owner or manager roles with access.
- Open `/owner/expenses`.
- Confirm there is no spinner loop or flicker.
- Add an expense and confirm it appears immediately.

## 9. Admin Authentication

- Log in with the super admin account.
- Confirm `/admin/dashboard` opens without white screen.
- Refresh on admin pages and confirm no auth bounce happens.

## 10. Admin Operations

- Use topbar search to search a client.
- Confirm it routes to `/admin/clients` with filtered results.
- Open notifications from the bell icon.
- Confirm it routes to `/admin/notifications`.
- Check the following modules load:
  - Dashboard
  - Clients
  - Client Detail
  - Outlets
  - Subscriptions
  - Payments
  - Onboarding
  - Support
  - Users
  - Modules
  - Templates
  - Integrations
  - Notifications
  - Reports
  - Activity
  - System Settings
  - Profile

## 11. Admin Data Integrity

- Confirm `Clients` shows real client rows.
- Confirm `Subscriptions` manage dialog saves plan and renewal updates.
- Confirm `Payments` actions work for mark paid, resend, and refund notes.
- Confirm `Support` assign and resolve flows work.
- Confirm `Notifications` mark read and resolve flows work.
- Confirm `Reports` charts and summary cards load.
- Confirm `Latest Website Leads` widget shows recent form submissions.

## 12. Final UI Sanity

- Check there is no invisible text on owner or admin pages.
- Check buttons and badges remain readable in light theme.
- Check logo, sidebar, and topbar alignments on desktop.
- Check mobile menu on customer pages and owner bottom nav.

## 13. Deployment Sanity

- Confirm latest Vercel deployment is aliased to production.
- Confirm latest Supabase migrations are applied.
- Confirm no new runtime blocker is visible in live usage.

## Pass Criteria

Release is considered safe when:

- no blank screens appear
- no route returns unexpected `Not Found`
- no critical flow hangs on infinite loader
- owner, customer, and admin can complete their core actions
- data persists correctly after refresh
- no sensitive admin-only data is visible to owners
