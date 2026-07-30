# Supabase Setup — Step by Step

A plain-English walkthrough to get your database running. ~10 minutes.
No coding required — you're copying text into a web form.

---

## Part A — Create the project

1. Go to **https://supabase.com** and sign in (use your Google account if you like).
2. Click **New project**.
3. Fill in:
   - **Name:** `wichita-life-sponsors`
   - **Database Password:** click **Generate a password**, then copy it somewhere
     safe (a password manager). You rarely need it, but don't lose it.
   - **Region:** **East US (North Virginia)** — closest to Kansas.
4. Click **Create new project**. Wait ~2 minutes while it sets up (the page will
   say "Setting up project…").

## Part B — Create the tables (run 3 files, in order)

In the left sidebar, click **SQL Editor**, then **+ New query**. You'll paste and
run three files, **one at a time, in this order**. For each: open the link, click
the **Copy raw file** button (top-right of the code), paste into the SQL editor,
and click **Run** (or press Ctrl/Cmd + Enter). Wait for "Success" before the next.

1. **Schema** (tables + fields):
   https://github.com/WichitaLifeICT/wichita-life-sponsors/blob/main/supabase/migrations/20260101000001_schema.sql
2. **Security & triggers** (Row Level Security):
   https://github.com/WichitaLifeICT/wichita-life-sponsors/blob/main/supabase/migrations/20260101000002_functions_and_rls.sql
3. **Demo data** (5 sponsors, 3 packages, sample records):
   https://github.com/WichitaLifeICT/wichita-life-sponsors/blob/main/supabase/seed.sql

> Each file shows **"Success. No rows returned"** — that's the correct result.
> If any step shows a red error, copy the full message and send it to me.

**Check it worked:** click **Table Editor** in the sidebar. Open the `sponsors`
table — you should see **5 rows** (Prairie Fire Coffee, Sunflower Realty, etc.).
Open `packages` — **3 rows**.

## Part C — Create your login

1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter your **email** and a **password** you'll remember. Leave "Auto Confirm
   User" **on** (checked) so you can log in immediately.
3. Click **Create user**.

> The **first** user you create automatically becomes the **owner** of Wichita
> Life (a database trigger handles this). That's you.

## Part D — Get your API keys

1. Left sidebar → **Project Settings** (gear icon) → **API**.
2. You'll copy **three** values (keep this tab open):
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public** key (a long string, under "Project API keys")
   - **service_role** key (click the eye/reveal icon; **keep this one secret**)

## Part E — Put the keys in the app

On your computer, in the project folder:

1. Copy the example file to a real one:
   ```bash
   cp .env.local.example .env.local
   ```
2. Open `.env.local` in any text editor and paste your three values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=... (your Project URL)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=... (your anon public key)
   SUPABASE_SERVICE_ROLE_KEY=... (your service_role key)
   ```
3. Save the file. (It's git-ignored — it will never be committed. Never share the
   service_role key.)

## Part F — Run it

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. It sends you to the login page. Sign in with the
email + password from Part C. You should land on the dashboard and be able to open
every section in the sidebar.

---

### If something goes wrong

- **Red error while running SQL:** copy the whole message and send it over. The
  files are safe to re-run, so we can fix and re-run without harm.
- **"Invalid login credentials":** the email/password must match the user you made
  in Part C. You can reset it under Authentication → Users.
- **App won't start / blank error about `supabaseUrl`:** a value in `.env.local` is
  missing or has a typo. Re-copy from Project Settings → API.
