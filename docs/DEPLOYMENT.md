# EventEase — Deployment Plan

Target (matches Chapter 2): **Vercel** (frontend) · **Render** (backend) · **Supabase** (database).
Nothing in the app needs rewriting — but a few config changes and one prerequisite are required first.

---

## Prerequisite: the code must be on GitHub

Both Vercel and Render deploy **from a Git repository**. The project currently has no version control
(chosen deliberately). So the first real step is:

1. `git init` in `C:\Users\RAHUL\projects\eventease-v2`, add a root `.gitignore`
   (ignore `node_modules`, `.env`, `dist`, `.vite`).
2. Commit, create a GitHub repo, and push.

Bonus: this also makes the "we use Git and GitHub" line in Chapter 2 actually true.

---

## Code changes to make BEFORE deploying (small, ~4 edits)

1. **Frontend API URL is hardcoded.** `client/src/lib/api.ts` has
   `baseURL: "http://localhost:5000/api"`. Change to read an env var, falling back to local:
   ```ts
   baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api"
   ```
2. **Prisma needs the direct URL for Supabase.** `server/prisma/schema.prisma` datasource currently has
   only `url`. Supabase runs normal queries through a pooler but **migrations must bypass it**, so add:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")   // pooled (port 6543, ?pgbouncer=true)
     directUrl = env("DIRECT_URL")     // direct (port 5432) — for migrations
   }
   ```
3. **CORS** in `server/src/index.ts` — restrict to the deployed frontend instead of allowing all:
   ```ts
   app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));
   ```
4. **Server build must generate the Prisma client.** Ensure Render runs `prisma generate` + `migrate deploy`
   (see Render step below).

---

## Step 1 — Database on Supabase

1. Create a Supabase project (region: Asia-Pacific, free tier). Set a DB password.
2. Project Settings → Database → Connection string. Grab **two** URLs:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`, append `?pgbouncer=true`.
   - **Session / direct** (port 5432) → `DIRECT_URL`.
   - If the password has `@` or a space, percent-encode it (`@` → `%40`, space → `%20`).
3. **Disable the Supabase Data API** (so tables aren't publicly readable — all access goes through our API).
4. From your machine, with those URLs in `server/.env`, push the schema and seed:
   ```
   cd server
   npx prisma migrate deploy
   npm run seed
   ```

## Step 2 — Backend on Render

1. New **Web Service** → connect the GitHub repo → **Root Directory: `server`**.
2. **Build command:** `npm install && npx prisma generate && npm run build && npx prisma migrate deploy`
3. **Start command:** `npm start`  (runs `node dist/index.js`; `PORT` is provided by Render).
4. **Environment variables:** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
   `FRONTEND_URL` (set after Vercel gives you the URL).
5. Deploy → note the URL, e.g. `https://eventease-api.onrender.com`.

## Step 3 — Frontend on Vercel

1. New Project → import the GitHub repo → **Root Directory: `client`**. Framework preset: **Vite**.
   (Build `npm run build`, output `dist` — Vercel detects these.)
2. **Environment variable:** `VITE_API_URL = https://eventease-api.onrender.com/api`  (the Render URL + `/api`).
3. Deploy → note the URL, e.g. `https://eventease.vercel.app`.
4. Go back to Render and set `FRONTEND_URL` to that Vercel URL (for CORS), then redeploy the backend.

---

## Env var summary

| Where    | Variable        | Value |
|----------|-----------------|-------|
| Render   | DATABASE_URL    | Supabase pooled URL (6543, `?pgbouncer=true`) |
| Render   | DIRECT_URL      | Supabase direct URL (5432) |
| Render   | JWT_SECRET      | a long random string |
| Render   | JWT_EXPIRES_IN  | `7d` |
| Render   | FRONTEND_URL    | the Vercel app URL |
| Vercel   | VITE_API_URL    | the Render API URL + `/api` |

## Gotchas (already learned on this project)
- **Free Render sleeps** after inactivity — the first request after idle takes ~30s to wake. Fine for a demo.
- Supabase password encoding (see Step 1).
- `migrate deploy`, **not** `migrate dev`, in any deployed/CI context.
- Seed only once; re-running is safe (it upserts).
