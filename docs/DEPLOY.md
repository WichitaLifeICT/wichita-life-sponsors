# Deploy to Vercel — Step by Step

This gets the app running on a real website URL with **no terminal required**.
~5 minutes. You enter your keys in a web form, just like Supabase.

> Do the Supabase setup first (`docs/SUPABASE_SETUP.md`, Parts A–D). You need
> your Project URL and API keys.

---

## 1. Sign in to Vercel

Go to **https://vercel.com** and click **Sign Up** / **Log In**. Choose
**Continue with GitHub** and authorize it. (Use the same GitHub account that owns
the repository.)

## 2. Import the project

1. On the Vercel dashboard, click **Add New… → Project**.
2. Find **`wichita-life-sponsors`** in the list and click **Import**.
   - If you don't see it, click **Adjust GitHub App Permissions** and grant Vercel
     access to the repository, then come back.
3. Vercel auto-detects **Next.js** — leave all build settings as they are.

## 3. Add your environment variables

Before clicking Deploy, expand **Environment Variables** and add these three
(Name on the left, Value on the right). Click **Add** after each.

| Name                            | Value                                             |
| ------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | your Project URL (e.g. `https://xxxx.supabase.co`)|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your **anon public** key (the long `eyJ…` string) |
| `SUPABASE_SERVICE_ROLE_KEY`     | your **service_role** secret key                  |

Where to find these: Supabase → **Project Settings → API**.

> The app runs today with just the first two. The service_role key isn't used yet
> but add it now so future features work without redeploying. Never share it
> publicly.

## 4. Deploy

Click **Deploy**. Wait ~2 minutes for the build to finish. Vercel shows a
**Congratulations** screen with a link like
`https://wichita-life-sponsors.vercel.app`.

## 5. Log in

Open your new URL. It sends you to the login page. Sign in with the email +
password you created in Supabase (SUPABASE_SETUP Part C). You're in — the 5 demo
sponsors should appear under **Sponsors**.

---

## Updating later

Every time new work is pushed to the `main` branch on GitHub, Vercel
**automatically rebuilds and redeploys**. You don't have to do anything — just
refresh your URL after a minute.

## Changing a key later

Vercel dashboard → your project → **Settings → Environment Variables** → edit →
then **Deployments → … → Redeploy** to apply.

## Troubleshooting

- **Build fails:** open the build log; if it mentions a missing environment
  variable, re-check the three names above for typos.
- **Loads but login fails:** confirm the user exists in Supabase → Authentication
  → Users, and that `NEXT_PUBLIC_SUPABASE_URL` / anon key match your project.
- **"supabaseUrl is required":** the URL variable is missing or misspelled.
