# Everyday

A quiet, public-by-default place to see ordinary people's lives.
No followers, no public likes, no comments, no reposts, no trending, no numbers.
Each person sees up to 20 posts from random people per 12-hour window, then:
"That's enough for today. Come back later."

Stack: Next.js 16 (App Router) on Vercel + Supabase (Postgres, Auth, Storage, RLS).
There is no other backend.

## How the rules are enforced

All in `supabase/migrations/001_init.sql`, not in the client:

- **Likes**: each user can only select, insert and delete their own rows. No function, view or policy
  exposes likes to anyone else, admins included. They only raise the chance of seeing that author again (3x weight in `get_feed`).
- **Posts**: max 3 per rolling 24h (trigger). Clients can only write `body` and `image_path`, so they
  can't backdate `created_at`, post as someone else, or un-remove a post.
- **Notes**: the recipient is always the post's author (trigger), max 10 per rolling 24h. Only the sender and recipient can read a note.
- **Reports**: users can only insert. Only admins can read or resolve them.
- **Signup**: the `auth.users` trigger rejects the signup unless the invite code exists and is unused, then marks it used.
- **`is_admin`** can't be read or written through the API; the app calls the `is_admin()` function.

## Setup

### 1. Create a Supabase project

At [supabase.com](https://supabase.com), create a new project. From **Project Settings → API**, copy:
the Project URL, the `anon` public key, and the `service_role` key.

### 2. Run the migration

Open **SQL Editor → New query**, paste all of `supabase/migrations/001_init.sql` and click **Run**.

(With the Supabase CLI instead: `supabase link --project-ref <ref>` then `supabase db push`.)

### 3. Storage bucket

The migration creates the `post-images` bucket (public read, 5MB, JPEG/PNG/WebP/GIF only) and its
policies (signed-in users can upload or delete only inside a folder named after their user id).
Check it under **Storage**. If your project doesn't allow creating buckets from SQL, create it by hand
with exactly those settings: name `post-images`, Public on, file size limit 5MB, allowed MIME types
`image/jpeg, image/png, image/webp, image/gif`.

### 4. Configure Auth

Under **Authentication → Sign In / Providers**, keep **Email** enabled. Under
**Authentication → URL Configuration**:

- **Site URL**: your production URL, e.g. `https://everyday.vercel.app`
- **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

Supabase's built-in email sender allows only about 2 emails per hour for the whole project, and only
to addresses of your Supabase team members. Before inviting anyone, set up custom SMTP under
**Authentication → Emails → SMTP Settings** (e.g. Resend, Postmark or Brevo, all with free tiers).
Then raise **Authentication → Rate Limits → emails sent per hour** (e.g. to 100). Each address also
has a 60-second cooldown between links.

### 5. Seed invite codes

Run `supabase/seed.sql` in the SQL Editor. It adds 5 codes: `WELCOME001` … `WELCOME005`.

### 6. Seed the first admin

1. Run the app (below), open `/login`, choose **I have an invite code**, and sign up with one of
   the codes.
2. In the SQL Editor:

   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Visit `/admin`. From there you can generate more invite codes.

Note: every new user needs an invite code, including users created with **Add user** in the Supabase
dashboard (the signup trigger rejects them otherwise).

### 7. Run locally

```bash
cp .env.example .env.local   # fill in the three values
npm install
npm run dev                  # http://localhost:3000
```

### 8. Deploy to Vercel

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. In **Settings → Environment Variables**, add these for Production (and Preview if you use it):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (do **not** prefix with `NEXT_PUBLIC_`; it's only used server-side by `/admin` to ban users)
3. Deploy. Then put the production URL into Supabase's Site URL and Redirect URLs (step 4).

## Pages

| Path | What it is |
| --- | --- |
| `/` | Feed: up to 20 random posts per 12h, with a private like, a private note, and a report action |
| `/login` | Magic-link login; first signup needs an invite code |
| `/new` | Share a post (text, optional image) |
| `/me` | Your profile and your own archive, with edit and delete. No stats. |
| `/u/[id]` | Someone's public profile and posts |
| `/inbox` | Private notes you've received |
| `/admin` | Admins only: open reports, remove posts, ban users, invite codes |

## Moderation notes

- **Ban** uses Supabase Auth's ban (blocks sign-in and token refresh) and removes all of that person's
  posts. Their current session can last up to an hour, but the database already refuses their new posts
  and notes. To undo a ban, go to **Authentication → Users** in Supabase.
- Removed posts are hidden from everyone except their author (who sees a "removed" note) and admins.
