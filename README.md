# Golf Charity Subscription Platform

Step 1 scaffold for a full-stack subscription-based golf platform.

## Project Structure

- `client`: React frontend
- `server`: Node.js + Express backend

Backend MVC structure (`server/src`):

- `models/`: Mongoose data models
- `controllers/`: request handlers and business logic orchestration
- `routes/`: HTTP endpoint definitions and middleware composition
- `middleware/`: auth, validation, and centralized error middleware
- `services/`: reusable domain services (for example email delivery)

Scalability and reliability improvements:

- Centralized 404 + error middleware for consistent API error responses
- Route-level request validation middleware for auth, scores, subscriptions, charities, and admin operations
- Thin routes with middleware composition, keeping controllers focused on business logic

## Quick Start

### Server

1. `cd server`
2. `npm install`
3. Copy `.env.example` to `.env`
4. `npm run dev`

### Client

1. `cd client`
2. `npm install`
3. `npm run dev`

## Database Setup

The backend includes starter configuration for:

- MongoDB (Mongoose)
- MySQL (`mysql2/promise`)

Set connection values in `server/.env` based on `server/.env.example`.

## Deployment Preparation

Production environment templates:

- `server/.env.production.example`
- `client/.env.production.example`

Recommended production setup:

- Set `NODE_ENV=production` on the server
- Set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` when frontend and API are served over HTTPS
- Set `TRUST_PROXY=true` when running behind a reverse proxy/load balancer
- Set `CLIENT_URL` to your public frontend URL
- Set `VITE_API_URL` in the client to your public API base URL (with `/api`)

Server production runtime hardening includes:

- Environment validation at startup for required secrets and URLs
- Security headers with Helmet
- Response compression with `compression`
- Configurable CORS allow-list from `CLIENT_URL`
- Configurable JSON body limit via `JSON_BODY_LIMIT`

### Deploy Server (Production)

1. `cd server`
2. `npm install --omit=dev`
3. Copy `.env.production.example` to `.env` and fill all values
4. `npm run start:prod`

### Build Client (Production)

1. `cd client`
2. `npm install`
3. Copy `.env.production.example` to `.env.production` and set `VITE_API_URL`
4. `npm run build`
5. Serve `client/dist` from static hosting or CDN

Vite production optimization:

- Modern output target (`es2018`)
- Source maps disabled in production builds
- Manual vendor chunk splitting for core libraries (`react`, `react-dom`, `react-router-dom`, `axios`)

## Step 2 Starter Domain APIs

The backend now includes starter models and endpoints for key platform domains.

- `GET/POST /api/users`
- `GET/POST /api/subscriptions`
- `GET/POST /api/performance-logs`
- `GET/POST /api/prize-entries`
- `GET/POST /api/charity-contributions`

Supporting behavior:

- MongoDB stores operational entities (users, performance logs, subscriptions, prize entries, charity contributions).
- MySQL stores audit/ledger tables for subscriptions, prize entries, and charity contributions.
- MySQL tables auto-initialize at startup when `MYSQL_AUTO_INIT_SCHEMA=true`.

## Subscription System

Plan types:

- `monthly`
- `yearly`

MySQL table:

- `subscriptions` stores the current plan and status for each user

APIs:

- `POST /api/subscriptions` create or replace active subscription for current user
- `PATCH /api/subscriptions/status` update status (`active`, `inactive`, `cancelled`)
- `GET /api/subscriptions/status` check current subscription status

Charity contribution rule:

- Each subscription activation records a charity contribution using the member's selected charity.
- Contribution amount is calculated from `subscription amount * donationPercentage`.
- `donationPercentage` has a hard minimum of `10%`.

Subscription access middleware:

- `requireActiveSubscription` blocks member-only routes when subscription is inactive
- Applied to performance logs and prize entries routes

## Score Management

Rules:

- Each user stores only their latest 5 scores
- Score value range is `1` to `45`
- Each score includes `value` and `date`
- Adding a new score beyond 5 removes the oldest score automatically
- Score lists are returned in most-recent-first order
- Score add/trim uses transaction-aware flow when MongoDB supports transactions, with standalone-safe fallback

Backend APIs:

- `GET /api/scores` return latest scores for authenticated user
- `POST /api/scores` add score and return trimmed latest list

Frontend:

- Score management page at `/scores` for adding and viewing scores
- Dashboard includes quick navigation to score management

## Monthly Draw System

Backend behavior:

- Generates 5 random draw numbers between `1` and `45`
- Compares draw numbers against each user's latest scores
- Categorizes winners into `3-match`, `4-match`, and `5-match`
- Builds dynamic prize pool from total active subscription amount
- Prize split: `25%` (3-match), `35%` (4-match), `40%` (5-match)
- Category payouts are distributed equally among winners in that category
- If there is no `5-match` winner, the `5-match` pool rolls over to next month
- Stores draw numbers, participant results, and winner tiers in MongoDB

Backend APIs:

- `GET /api/draws/monthly/latest` get latest draw results (member/admin)
- `GET /api/draws/monthly/history` get recent draw participation history for current user (member/admin)
- `POST /api/draws/monthly/run` run monthly draw (admin only)

Frontend:

- Draw results page at `/draw-results`
- Shows draw numbers, winner categories, and user participation/winnings
- Shows dynamic prize pool split and rollover values for transparency
- Admin can trigger monthly draw generation from UI

Dashboard:

- Dashboard now includes subscription status, score entry + latest history, selected charity + donation percentage, draw participation history, and winnings overview in a responsive card-based layout

Frontend:

- Subscription management page at `/subscription` with monthly/yearly plan selection
- Dashboard shows current active/inactive subscription status and selected plan
- Subscription page shows renewal/end date and remaining days
- Plan action button adapts to `Activate`, `Upgrade`, or `Downgrade` state
- Confirmation modal appears before downgrade or marking subscription inactive
- Dashboard displays a `days left` indicator for quick subscription visibility
- Confirmation modal supports keyboard interaction (Escape to close, focus trap)
- Confirmation modal also closes on outside click with focus restore
- Success and failure actions on subscription page are shown as toast notifications

## Authentication (JWT)

Backend auth stack uses `bcryptjs` and `jsonwebtoken`.

- `POST /api/auth/register` creates a user with a hashed password and returns JWT
- `POST /api/auth/login` validates credentials and returns JWT
- `POST /api/auth/refresh` rotates refresh token cookie and returns a new access token
- `POST /api/auth/logout` revokes refresh token and clears cookie
- `GET /api/auth/me` is protected by JWT middleware

Protected examples:

- `GET /api/users` requires `Authorization: Bearer <token>`
- `GET/POST /api/performance-logs` requires `Authorization: Bearer <token>`

Frontend auth flow (React + axios):

- Signup page: `client/src/pages/SignupPage.jsx`
- Login page: `client/src/pages/LoginPage.jsx`
- Protected dashboard: `client/src/pages/DashboardPage.jsx`
- Charity selection at signup is required (`charityId`) and accepts configurable `donationPercentage` (`>= 10`).
- Axios client with auth header interceptor: `client/src/services/api.js`

JWT token is stored in `localStorage` under `authToken`.

Refresh-token behavior:

- Refresh token is sent as an `httpOnly` cookie (`refreshToken`) and is not accessible from JavaScript.
- Access token remains in `localStorage` and is attached as `Authorization: Bearer <token>`.
- Axios automatically attempts `/api/auth/refresh` on `401` for non-login/register requests.

## Email Notification System

The backend includes a Nodemailer-based notification service.

Notification triggers:

- Signup: sends welcome email after successful `POST /api/auth/register`
- Draw results: sends monthly result email to each participant when a draw is run
- Winners: sends dedicated winner notification email for `match3`, `match4`, and `match5` winners

Environment setup (`server/.env`):

- `EMAIL_ENABLED=true` to enable delivery
- `EMAIL_FROM` sender address
- `EMAIL_SMTP_HOST` SMTP host
- `EMAIL_SMTP_PORT` SMTP port (for example `587`)
- `EMAIL_SMTP_SECURE` (`true` for SMTPS, `false` for STARTTLS/plain)
- `EMAIL_SMTP_USER` SMTP username
- `EMAIL_SMTP_PASS` SMTP password

Behavior notes:

- Email delivery is non-blocking and does not fail the core API request if mail transport is unavailable.
- If `EMAIL_ENABLED=false`, notifications are skipped safely.

## Role-Based Access Control

User roles:

- `member` (default on self-registration)
- `admin`

Route protection examples:

- `GET/POST /api/users` requires `admin`
- `GET/POST /api/charity-contributions` requires `admin`
- `POST/PUT/DELETE /api/charities` requires `admin`
- `GET /api/charities` is public for signup and member browsing

## Charity System

Charity catalog APIs:

- `GET /api/charities` list charities with optional `search`, `category`, `country`, `status`
- `GET /api/charities/:id` get a charity by id
- `POST /api/charities` create charity (admin)
- `PUT /api/charities/:id` update charity (admin)
- `DELETE /api/charities/:id` delete charity (admin)

Member charity preference API:

- `PATCH /api/users/me/charity` update `charityId` and `donationPercentage` (`>= 10`)

Frontend charity experience:

- Charity listing and selection page at `/charities` with search and category filters
- Signup page includes charity search/filter, required charity select, and donation percentage field
- Dashboard displays selected charity and donation percentage

## Admin Panel (Role-Based)

Frontend:

- Admin panel route: `/admin`
- Accessible only to authenticated users with `admin` role
- Dashboard shows quick link to admin panel for admins
- Admin sections include:
	- view/manage users
	- edit scores
	- manage subscriptions
	- create/run draw
	- manage charities
	- verify winners and mark payouts

Backend admin APIs (`/api/admin`, admin-only):

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/scores`
- `PATCH /api/admin/scores/:id`
- `GET /api/admin/subscriptions`
- `PATCH /api/admin/subscriptions/:id`
- `GET /api/admin/draws`
- `GET /api/admin/draws/:drawId/winners`
- `PATCH /api/admin/draws/:drawId/winners/:tier/:userId/payout`
- `GET /api/admin/charities`

Payout verification:

- Draw winners now track payout status (`paidOut`, `paidOutAt`, `paidOutBy`, `payoutReference`)
- Admins can verify winners and mark payouts directly in the admin panel
- `GET/POST /api/subscriptions` requires `member` or `admin`
- `GET/POST /api/prize-entries` requires `member` or `admin`

Ownership enforcement:

- For `member` role, `userId` in member-access endpoints is forced to the authenticated user.
- `admin` can query or create records for any user by supplying `userId`.

First admin bootstrap:

- Endpoint: `POST /api/auth/bootstrap-admin`
- Requires `x-admin-bootstrap-key` header (or `bootstrapKey` body value)
- Key value is set by `ADMIN_BOOTSTRAP_KEY` in server env
- Endpoint only succeeds if no admin user exists yet

## Backend Integration Tests

Test stack:

- Jest
- Supertest
- mongodb-memory-server

Covered scenarios:

- first-admin bootstrap flow
- RBAC restrictions (`member` vs `admin`)
- ownership enforcement for member-access endpoints
- refresh-token rotation and revocation on logout
- subscription create/update/status flow
- active-subscription route gating
- score value validation (1-45), latest-5 retention, and recent-first ordering
- concurrent multi-insert stress test for max-5 retention invariant
- monthly draw generation, winner tier categorization, and participation winnings
- monthly draw history endpoint behavior, including min/max `limit` clamping
- monthly draw history `limit` parsing behavior for non-numeric and decimal values
- monthly draw history authorization behavior (missing token, invalid token, member/admin access)
- latest monthly draw endpoint authorization behavior (missing token, invalid token, member/admin access)
- charity CRUD APIs, public charity listing filters, and member charity preference updates
- signup validation for required charity selection and minimum donation percentage
- subscription-to-charity contribution calculation based on donation percentage

Run tests:

1. `cd server`
2. `npm install`
3. `npm test`

Frontend tests:

1. `cd client`
2. `npm install`
3. `npm test`

Included frontend integration coverage:

- `DrawResultsPage` member view rendering
- admin run-draw action and data refresh flow
- `DashboardPage` full widget rendering (subscription, scores, charity, draw history, winnings)
- `DashboardPage` inline score-entry submission and state update flow
- `DashboardPage` empty-state rendering for scores and draw history
- `DashboardPage` client-side score validation prevents invalid API submission
- `DashboardPage` logout flow clears auth storage and redirects to login
- `DashboardPage` responsive card/grid structure renders expected layout classes

CI automation:

- GitHub Actions workflow at `.github/workflows/backend-tests.yml`
- Runs backend tests on push and pull request

## UI/UX Design Refresh

The React UI now follows a modern, mobile-first visual system with:

- clean layout structure and expressive typography
- emotional gradient backgrounds and soft glass-like cards
- smooth transitions and motion (`rise-in`, hover lifts, focus transitions)
- fully responsive behavior from small screens upward
- stronger CTA emphasis (notably subscription and account actions)
- intentionally modern styling that avoids traditional sports-themed visuals
