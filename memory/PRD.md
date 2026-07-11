# Clengo — Laundry Service App PRD

## Original Problem Statement
Develop a laundry service application "Clengo" (brand). Domain: www.clengo.in (from GoDaddy).
Users are connected to different local laundry houses. Features required:
1. Geographical selectivity — only serviceable pincodes can place orders
2. Book service for wash, iron, dry clean (per-article counts)
3. Login via phone number + email + 6-digit OTP for auth (implemented as Google Sign-In per user choice)
4. Phase 1: only users place orders; admin/us tell laundry houses manually
5. No online payment — Cash on Delivery (COD) only
6. Complaint system with Order ID + feedback
7. Unique Order ID per order (implemented: CLG-YYMMDD-XXXXXX)
8. Admin dashboard with orders overview, Excel export with filters
9. Admin can manually toggle/mark orders as complete
10. Tech: (originally Spring Boot + SQL) → switched to React + FastAPI + MongoDB per user consent (Jan 2026)

## Architecture
- **Frontend**: React 19 + React Router 7 + Tailwind CSS + Radix/shadcn + Lucide icons + sonner (toast)
- **Backend**: FastAPI + Motor (async MongoDB) + Emergent-managed Google OAuth
- **Database**: MongoDB (collections: users, user_sessions, pincodes, catalog, orders, complaints)
- **Auth**: Emergent Google Sign-In (session cookie, 7-day expiry). Admin role assigned by email allowlist (`admin@clengo.in`).

## Design System
- **Brand**: Golden yellow #D4A017 (Clengo gold) with black text; soft "fresh linen" off-white bg #FDFDFB
- **Fonts**: Outfit (headings), Manrope (body), JetBrains Mono (order IDs)
- **Style**: Bento grid layouts, generous spacing, rounded-3xl cards, glassmorphism nav, subtle grain overlay, animated sparkle logo mark
- Guidelines: `/app/design_guidelines.json`

## User Personas
- **Customer (default role)**: Delhi/Noida/Gurgaon resident who books laundry via web. Signs in with Google, completes profile (phone + address + pincode), places COD orders, tracks status, raises complaints.
- **Admin (admin@clengo.in)**: Clengo operations team. Views all orders, filters by status/pincode/service/date, exports Excel to hand off to laundry partners, manually marks orders complete, manages complaints and serviceable pincodes.

## Core Requirements (static)
- Geographical serviceability gate before ordering
- Wash / Iron / Dry Clean services with per-item catalog pricing
- Google Sign-In (no passwords)
- COD only (no payment gateway in Phase 1)
- Unique human-friendly Order IDs
- Complaint system tied to Order ID with admin response
- Admin ops: filters, Excel export, manual status toggle, pincode CRUD

## What's Been Implemented (2026-01-11)
- ✅ Full-stack scaffolding with React + FastAPI + MongoDB
- ✅ Emergent Google OAuth (session cookie + Authorization header fallback)
- ✅ Admin role via email allowlist: `admin@clengo.in`, `shubham2710gupta@gmail.com`
- ✅ WhatsApp integration via `wa.me` deep links (Clengo business number: +91 63070 74843)
  - Floating WhatsApp support FAB on every page
  - "Confirm on WhatsApp" button on order confirmation with prefilled order details
  - "Chat about this order" link on each My Orders card
  - Admin: "WhatsApp customer" quick action on each order row
- ✅ Pincode serviceability API + 12 seeded areas (Delhi/Noida/Gurgaon)
- ✅ Catalog with 16 items across daily/ethnic/household/premium categories
- ✅ 4-step order booking flow (pincode → items → pickup → confirm)
- ✅ Unique order ID format: CLG-YYMMDD-XXXXXX
- ✅ COD-only checkout with order confirmation screen
- ✅ My Orders page with copy-to-clipboard order ID + timeline stepper
- ✅ Complaint page with order-ownership validation + list of user's complaints
- ✅ Profile page (phone, address, default pincode)
- ✅ Full Admin dashboard:
  - Stats cards (7 KPIs)
  - Orders tab with 6 filters (search, status, service, pincode, date range) + Excel export + mark-complete action + detail modal with all status transitions
  - Complaints tab with response + resolve
  - Pincodes tab with CRUD + activate/deactivate toggle
- ✅ Landing page: hero with pincode checker, service cards, how-it-works, bento why-clengo, footer
- ✅ Backend testing: 43/43 tests pass (pytest)

## Backlog / Future
### P1 (next iteration)
- Server-side price recomputation from catalog to prevent client-side tampering
- Store timestamps as BSON Date instead of ISO strings for indexed date range queries
- Unique index on `orders.order_id`
- Pagination on admin orders list
- Add lifespan handler instead of deprecated `@app.on_event`

### P2
- Delivery partner app (Phase 2) — accept/reject orders, status updates from field
- Real SMS OTP fallback (Twilio/MSG91) for users without Google
- Payment gateway (Razorpay / UPI) alongside COD
- Referral / promo codes
- Push notifications / WhatsApp order updates
- Multi-address book per user
- Recurring subscription (weekly laundry pickup)
- Ratings & reviews for laundry partners
- Custom domain routing to www.clengo.in

### Enhancements
- Per-service pricing overrides per laundry partner
- Weight-based bulk pricing (₹99/kg)
- Loyalty rewards / cashback wallet

## Next Action Items
- Deploy to production and point www.clengo.in DNS
- Onboard first laundry partners in Delhi NCR
- Set up admin email allowlist for operations team members
