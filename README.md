# Wichita Life — Sponsor Management

A private web app for **Wichita Life** to manage sponsors end to end: sponsor
records, packages, monthly deliverables, a content calendar, and manual billing.
Built to become a multi-organization product later, but focused today on running
one media company's sponsorships.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui ·
Supabase (Postgres, Auth, Storage) · Vercel · Vitest.

> **Project status:** Under active construction, built in stages. See
> [`PLAN.md`](./PLAN.md), [`DATABASE.md`](./DATABASE.md), and [`TASKS.md`](./TASKS.md)
> for the roadmap and progress.

---

## 1. Prerequisites

- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) account
- (Later, for deploy) a [Vercel](https://vercel.com) account

## 2. Install

```bash
npm install
```

## 3. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name
   (e.g. `wichita-life-sponsors`), a strong database password, and a region near
   Kansas (e.g. **East US**). Wait ~2 minutes for it to provision.
2. Open **Project Settings → API** and copy three values:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep this secret)

## 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable                         | Where it comes from      | Exposed to browser? |
| -------------------------------- | ------------------------ | ------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Project URL              | Yes (safe)          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | anon public key          | Yes (safe)          |
| `SUPABASE_SERVICE_ROLE_KEY`      | service_role key         | **No — server only**|

> ⚠️ The **service_role** key bypasses all security rules. Never prefix it with
> `NEXT_PUBLIC_`, never use it in client code, and never commit `.env.local`.

## 5. Database setup (migrations + demo data)

You can use the Supabase dashboard (easiest) **or** the Supabase CLI.

### Option A — Dashboard SQL editor (recommended, no CLI needed)

In your project, open **SQL Editor → New query** and run these files **in order**,
copy-pasting the contents of each:

1. `supabase/migrations/20260101000001_schema.sql` — tables, enums, indexes
2. `supabase/migrations/20260101000002_functions_and_rls.sql` — security & triggers
3. `supabase/seed.sql` — demo data (5 sponsors, 3 packages, sample records)

All three files are **safe to re-run** — they will not create duplicates.

### Option B — Supabase CLI

```bash
npm i -g supabase
supabase link --project-ref <your-project-ref>
supabase db push                       # applies both migration files
# then run supabase/seed.sql in the SQL editor for demo data
```

### Create your login

Supabase → **Authentication → Users → Add user** (email + password), or sign up
through the app's login page once it's running. **The first user automatically
becomes the `owner` of the Wichita Life organization** (handled by a database
trigger). Every other new user joins the same organization as a `team_member`.

## 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 7. Scripts

| Command             | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the dev server                     |
| `npm run build`     | Production build                         |
| `npm start`         | Run the production build                 |
| `npm run lint`      | ESLint                                   |
| `npm test`          | Vitest unit tests (business logic)       |

---

## Authentication (how it works)

- Auth is handled by **Supabase Auth** (email + password to start).
- `proxy.ts` (Next.js 16's request-proxy convention) refreshes the session on
  every request and **redirects unauthenticated users to `/login`** for all
  protected routes.
- Server code uses `lib/supabase/server.ts`; client components use
  `lib/supabase/client.ts`. Both use only the public anon key.
- Access to data is enforced by **Postgres Row Level Security** — every table is
  filtered to the signed-in user's organization via the `auth_org_id()` helper.
  The UI never has to be trusted for isolation; the database enforces it.

## Security notes

- The service-role key is server-only and is **not** referenced by any browser
  code.
- RLS is enabled on every table; authenticated users can only read/write rows in
  their own organization.
- `.env.local` is git-ignored.

## Multi-organization readiness

Every business table carries `organization_id`, and all access is organization
scoped. Today there is one organization (Wichita Life) and one user (you), but the
structure supports adding organizations and team members later without a rewrite.
