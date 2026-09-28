# Golfish

## Overview

Golfish is a premium, subscription-based golf performance tracking and monthly draw platform. Subscribed users track their latest five Stableford scores, which double as their entry ticket into an automated monthly draw featuring a progressive prize pool and a charity contribution component.

This repository constitutes the 2-day MVP built for the final selection assignment.

## Features

- **Custom JWT Authentication:** Secure role-based access control (User/Admin).
- **Subscription Engine (Stripe TEST):** Monthly/Yearly plans with variable charity contribution (10% - 100%).
- **Score System:** Dynamic rolling list of a user's 5 latest valid Stableford scores.
- **Draw Engine:** Monthly automated drawing simulation, 5/4/3-match matching logic, and Jackpot Rollovers.
- **Winner Verification:** Secure private Supabase Storage upload for score cards.
- **Admin Dashboard:** Full command-center for Users, Charities, Draws, Winners, and Reports.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Lucide React, Axios
- **Backend:** Node.js, Express, JavaScript, REST API
- **Database & Storage:** Supabase PostgreSQL & Supabase Storage (Private Buckets)
- **Payments:** Stripe (TEST MODE ONLY)

## Architecture

- The **Vite React Frontend** acts as a stateless SPA, communicating strictly via REST endpoints.
- The **Express API Backend** is the sole source of truth and authority, orchestrating business logic and payment webhooks.
- The **Supabase Database** is queried securely exclusively through the backend using the privileged Service Role Key. The frontend never talks to the DB directly.

## Local Setup

### Prerequisites

Node.js (v18+)

### 1. Database Setup

Create a new Supabase project. Execute the provided SQL migration in the Supabase SQL Editor:
`supabase/migrations/00001_initial_schema.sql`

Create a private storage bucket named `winner-proofs` in the Supabase Dashboard.

### 2. Stripe Test Setup

1. Create a Stripe account in **Test Mode**.
2. Create two products:
   - Monthly Plan
   - Yearly Plan
3. Note their respective Price IDs (`price_xxx`).
4. For local development, authenticate the Stripe CLI:

```bash
stripe login
```

## 🔄 Stripe Webhook Listener

When running the application locally, start the Stripe CLI webhook listener in a separate terminal:

```bash
stripe listen --events checkout.session.completed --events customer.subscription.updated --events customer.subscription.deleted --forward-to http://localhost:5000/api/stripe/webhook
```

### 3. Server Setup

```bash
cd server
npm install
cp .env.example .env
```

Fill out the variables in `.env` based on your Supabase and Stripe dashboard values.
Start the development server:

```bash
npm run dev
```

### 4. Client Setup

```bash
cd client
npm install
cp .env.example .env
```

Start the frontend dev server:

```bash
npm run dev
```

### Local URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- Backend health check: `http://localhost:5000/api/health`

## Environment Variables

### Server (`server/.env`)

Required variables (Do NOT expose secrets publicly):

- `PORT`: Usually 5000
- `CLIENT_URL`: `http://localhost:5173` or your Vercel URL
- `SUPABASE_URL`: Your Supabase API URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret (DO NOT USE ANON KEY)
- `JWT_SECRET`: Random 32+ character string
- `JWT_EXPIRES_IN`: e.g. `7d`
- `STRIPE_SECRET_KEY`: `sk_test_...`
- `STRIPE_WEBHOOK_SECRET`: `whsec_...`
- `STRIPE_PRICE_MONTHLY`: `price_...`
- `STRIPE_PRICE_YEARLY`: `price_...`
- `PRIZE_POOL_CONTRIBUTION_PER_USER`: Integer (e.g. `100`), auto-calculates base prize pool.

> For local development, `STRIPE_WEBHOOK_SECRET` is the `whsec_...` value displayed by `stripe listen`.
>
> For a deployed environment, use the signing secret generated for the webhook endpoint in the Stripe Dashboard.

### Client (`client/.env`)

- `VITE_API_URL`: Points to the deployed API URL or localhost.

## Deployment

**Frontend (Vercel):**

- Import the `client` directory as a new project in Vercel.
- The included `vercel.json` ensures SPA routes redirect correctly to `index.html`.
- Add `VITE_API_URL` to the Environment Variables.

**Backend (Render/Railway):**

- Import the `server` directory.
- Start Command: `npm start`
- Add all required `.env` variables in the dashboard configuration.

**Database (Supabase):**

- Use the existing Supabase instance. Ensure RLS is enabled (it is by default in the schema).

## Important MVP Assumptions

1. **Score Mapping:** Stableford scores (1-45) map directly to the five draw numbers.
2. **Matching Logic:** Duplicate score values count uniquely (they collapse into a Set when checking for draw matches).
3. **Prize Calculation:** Prize contribution amount is configurable through `PRIZE_POOL_CONTRIBUTION_PER_USER` rather than deriving an explicit percentage out of varying monthly/yearly cashflow.
4. **Charities:** No real charity money transfer occurs. Selections are stored and calculated conceptually.
5. **Stripe:** Exclusively operates in TEST MODE.
6. **Draws:** Admin manually publishes monthly draws via the dashboard. There is no automated cron draw execution to prevent unattended environment runaway.

## 🧪 Testing Credentials

Use the following accounts to test the deployed application.

> **Note:** These are demo/test accounts only. Do not use real passwords or
> production credentials here.

### 👤 Regular Subscriber

| Field        | Value                                   |
| ------------ | --------------------------------------- |
| Email        | `sub_overview_1_1789908270512@test.com` |
| Password     | `password123`                           |
| Role         | User                                    |
| Subscription | Active                                  |
| Scores       | 5 scores                                |

### 👤 New User

| Field        | Value             |
| ------------ | ----------------- |
| Email        | `user2@gmail.com` |
| Password     | `123456`          |
| Role         | User              |
| Subscription | -                 |
| Scores       | 0 scores          |

### 🏆 Winner Test Account 1

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Email        | `user_flow_1789911756811@test.com` |
| Password     | `password123`                      |
| Role         | User                               |
| Subscription | Active                             |
| Draw Status  | Test winner                        |
| Proof        | Already uploaded and approved      |

### 🏆 Winner Test Account 2

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Email        | `user_flow_1789911735258@test.com` |
| Password     | `password123`                      |
| Role         | User                               |
| Subscription | Active                             |
| Draw Status  | Test winner                        |
| Proof        | Available for upload               |

### 🛡️ Administrator

| Field    | Value                               |
| -------- | ----------------------------------- |
| Email    | `admin_flow_1789911756811@test.com` |
| Password | `password123`                       |
| Role     | Administrator                       |

### Recommended Testing Flow

1. Login as the **Regular Subscriber**.
2. Check the dashboard, subscription, scores and charity information.
3. Login as the **Winner Test Account**.
4. Check the winning draw and upload winner proof.
5. Login as **Administrator**.
6. Go to **Winners** and review the submitted proof.
7. Approve the winner.
8. Mark the payout as **Paid**.
9. Login again as the winner and verify the updated payout status.

## 💳 Stripe Test Payment

The project uses **Stripe Test Mode** for subscription payments.  
No real money is charged when using the test card below.

### Test Card Details

| Field             | Value                 |
| ----------------- | --------------------- |
| Card number       | `4242 4242 4242 4242` |
| Expiry date       | `12/34`               |
| CVC               | `123`                 |
| ZIP / Postal code | `12345`               |

> Use the **New User** test account when testing a fresh subscription checkout.
> **Note:** These are Stripe's test card details. Use them only when Stripe is running in **Test/Sandbox Mode**.
>
> Do not enter real card details while testing this project.

### How to Test a Payment

1. Register or log in to a user account.
2. Go to the **Subscribe** page.
3. Select the desired subscription plan.
4. Select a charity and contribution percentage.
5. Continue to Stripe Checkout.
6. Enter the test card details above.
7. Complete the payment.
8. You will be redirected back to the application.
9. The subscription status should update after the Stripe webhook is processed.

> **Important:** These credentials are intended only for the deployed
> demonstration environment. If the database is reset or recreated, these
> accounts may need to be recreated.

## ✅ Testing Status

The MVP has been tested across the following flows:

- User registration and login
- JWT authentication and protected routes
- Stripe test subscription checkout
- Subscription webhook processing
- Charity selection and contribution percentage
- Latest 5 score rolling logic
- Draw simulation
- Draw simulation → publish consistency
- Prize pool calculation
- 5/4/3-match winner calculation
- Jackpot rollover
- Winner proof upload
- Admin proof verification
- Payout status tracking
- Admin dashboard
- Reports and analytics
- Private Supabase Storage access
- User ownership and authorization checks
- Responsive frontend
- Production frontend build
- Backend linting and tests

## ⚠️ Known MVP Limitations

- Charity contributions are tracked conceptually; no real charity payment is processed.
- Payouts are tracked as payment states; no real bank/payment payout integration is implemented.
- Draw publication is manually triggered by an administrator.
- Large admin tables do not currently use server-side pagination.
- Stripe operates in Test Mode only.
