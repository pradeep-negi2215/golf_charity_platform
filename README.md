# Golf Charity Platform

Full-stack monorepo for a golf subscription and charity contribution platform.

## Tech Stack

- Client: React + Vite + React Router + Axios
- Server: Node.js + Express + MongoDB + MySQL
- Auth: JWT access/refresh token flow with cookie-based refresh
- Deployment: Vercel (static client + serverless API)

## Repository Structure

- client: Frontend app
- server: Backend API
- vercel.json: Monorepo deployment routing/build config

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB database
- MySQL database

## Local Development

### 1) Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 2) Configure environment files

Create these files from examples:

- client/.env
- server/.env

Client example:

```env
VITE_API_URL=http://localhost:5000/api
```

Server example (minimum required):

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace_with_long_random_secret
JWT_REFRESH_SECRET=replace_with_long_random_refresh_secret
MONGODB_URI=your_mongodb_connection_string
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

Add remaining values from:

- server/.env.example
- server/.env.production.example

### 3) Run both apps

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5000/api

## Tests

Client tests:

```bash
cd client
npm test
```

Server tests:

```bash
cd server
npm test
```

## Production Build

Client:

```bash
cd client
npm run build
```

## Vercel Deployment

This repo is configured to deploy from root using vercel.json:

- Static frontend from client/package.json
- Serverless backend from server/api/index.js
- /api/* routed to server API
- SPA fallback routed to /index.html

### Required Vercel Environment Variables (server)

At minimum set these for Production:

- NODE_ENV=production
- CLIENT_URL=https://your-vercel-domain.vercel.app
- JWT_SECRET
- JWT_REFRESH_SECRET
- MONGODB_URI
- COOKIE_SECURE=true
- COOKIE_SAME_SITE=none

You may also need:

- MySQL variables (if MySQL-backed features are enabled)
- SMTP variables (for signup/reset emails)

Use server/.env.production.example as the full reference.

### Deploy with CLI

```bash
npx vercel --prod
```

If you get auth/token errors:

```bash
vercel login
npx vercel --prod
```

## Notes

- Client API base defaults to /api for production-style same-origin calls.
- If refresh/session behavior seems off in production, verify COOKIE_SECURE, COOKIE_SAME_SITE, and CLIENT_URL are correct.
