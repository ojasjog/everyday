-- Everyday v1 schema.
-- Core rule: no engagement numbers anywhere. Likes are readable only by the
-- person who made them; no view, function or policy exposes them to anyone else.
-- Column-level grants decide WHICH columns clients may write; RLS decides WHICH rows.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 50),
  bio          text check (char_length(bio) <= 500),
  location     text check (char_length(location) <= 100),
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.invite_codes (
  code       text primary key,
  used_by    uuid, -- no FK on purpose: deleting a user must not make the code reusable
  created_at timestamptz not null default now()
);

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 2000),
  image_path text,
  created_at timestamptz not null default now(),
  is_removed boolean not null default false
);
create index posts_author_created_idx on public.posts (author_id, created_at desc);

create table public.likes (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table public.seen_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index seen_posts_user_seen_idx on public.seen_posts (user_id, seen_at desc);

create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid references public.posts (id) on delete set null, -- keep the note if the post is deleted
  sender_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(trim(body)) between 1 and 1000),
  created_at   timestamptz not null default now()
);
create index notes_recipient_idx on public.notes (recipient_id, created_at desc);
create index notes_sender_idx on public.notes (sender_id, created_at desc);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id     uuid not null references public.posts (id) on delete cascade,
  reason      text not null check (char_length(trim(reason)) between 1 and 500),
  created_at  timestamptz not null default now(),
  resolved    boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create function public.is_banned(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u where u.id = uid and u.banned_until > now());
$$;
revoke execute on function public.is_banned(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Signup: require a valid unused invite code, then create the profile.
-- Raising here aborts the auth.users insert, so the signup fails.
-- ---------------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  invite text := upper(trim(new.raw_user_meta_data ->> 'invite_code'));
begin
  update public.invite_codes set used_by = new.id
   where code = invite and used_by is null;
  if not found then
    raise exception 'Invalid or already used invite code';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Someone'), 50));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Posts: max 3 per rolling 24h, enforced in the database.
-- ---------------------------------------------------------------------------

create function public.enforce_post_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialise inserts per author so two parallel requests can't both pass the count.
  perform pg_advisory_xact_lock(hashtext('post:' || new.author_id::text));

  if public.is_banned(new.author_id) then
    raise exception 'This account can no longer post.';
  end if;

  if (select count(*) from public.posts
       where author_id = new.author_id
         and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'You can share up to 3 posts a day. Come back later.';
  end if;

  new.created_at := now();
  new.is_removed := false;
  return new;
end;
$$;

create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_post_limit();

-- ---------------------------------------------------------------------------
-- Notes: recipient is always the post's author; max 10 per rolling 24h.
-- ---------------------------------------------------------------------------

create function public.prepare_note() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('note:' || new.sender_id::text));

  if public.is_banned(new.sender_id) then
    raise exception 'This account can no longer send notes.';
  end if;

  select p.author_id into new.recipient_id
    from public.posts p
   where p.id = new.post_id and not p.is_removed;

  if new.recipient_id is null then
    raise exception 'That post is no longer available.';
  end if;
  if new.recipient_id = new.sender_id then
    raise exception 'You can''t send a note to yourself.';
  end if;

  if (select count(*) from public.notes
       where sender_id = new.sender_id
         and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'You can send up to 10 notes a day. Come back later.';
  end if;

  new.created_at := now();
  return new;
end;
$$;

create trigger notes_prepare
  before insert on public.notes
  for each row execute function public.prepare_note();

-- ---------------------------------------------------------------------------
-- Feed
-- A "session" is a rolling 12-hour window. Each window holds at most 20 posts.
-- Posts already shown are recorded in seen_posts and never picked again.
-- Calling get_feed again in the same window returns the same posts (so
-- refreshing or navigating back is stable) and only tops up to 20.
-- No like data is returned.
-- ---------------------------------------------------------------------------

create function public.get_feed("limit" int default 20)
returns table (
  id           uuid,
  body         text,
  image_path   text,
  created_at   timestamptz,
  author_id    uuid,
  display_name text,
  location     text
)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  uid          uuid := auth.uid();
  window_start timestamptz := now() - interval '12 hours';
  remaining    int;
begin
  if uid is null then
    return;
  end if;

  select least(greatest(get_feed."limit", 0), 20) - count(*)
    into remaining
    from public.seen_posts s
   where s.user_id = uid and s.seen_at > window_start;

  if remaining > 0 then
    -- Weighted random sample (Efraimidis-Spirakis): key = -ln(U) / weight,
    -- smallest keys win. Authors the viewer has liked before get weight 3.
    -- shortcut: scans every unseen post per call; add sampling (TABLESAMPLE) past ~100k posts.
    insert into public.seen_posts (user_id, post_id)
    select uid, p.id
      from public.posts p
     where p.author_id <> uid
       and not p.is_removed
       and not exists (select 1 from public.seen_posts s
                        where s.user_id = uid and s.post_id = p.id)
     order by -ln(1 - random()) /
              case when p.author_id in (select lp.author_id
                                          from public.likes l
                                          join public.posts lp on lp.id = l.post_id
                                         where l.user_id = uid)
                   then 3 else 1 end
     limit remaining
    on conflict do nothing;
  end if;

  return query
    select p.id, p.body, p.image_path, p.created_at, p.author_id, pr.display_name, pr.location
      from public.seen_posts s
      join public.posts p     on p.id = s.post_id
      join public.profiles pr on pr.id = p.author_id
     where s.user_id = uid
       and s.seen_at > window_start
       and not p.is_removed
     order by s.seen_at, p.id; -- ids are random uuids, so this is a stable shuffle
end;
$$;
revoke execute on function public.get_feed(int) from public, anon;
grant execute on function public.get_feed(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin functions (each checks is_admin itself)
-- ---------------------------------------------------------------------------

create function public.admin_remove_post(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  update public.posts set is_removed = true where id = target;
  update public.reports set resolved = true where post_id = target;
end;
$$;

create function public.admin_remove_user_posts(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  update public.posts set is_removed = true where author_id = target;
  update public.reports set resolved = true
   where post_id in (select id from public.posts where author_id = target);
end;
$$;

create function public.admin_create_invites(n int default 5) returns setof text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  return query
    insert into public.invite_codes (code)
    select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
      from generate_series(1, least(greatest(n, 1), 50))
    returning code;
end;
$$;

revoke execute on function public.admin_remove_post(uuid), public.admin_remove_user_posts(uuid),
  public.admin_create_invites(int) from public, anon;
grant execute on function public.admin_remove_post(uuid), public.admin_remove_user_posts(uuid),
  public.admin_create_invites(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: start from nothing, grant only what the app needs.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.invite_codes, public.posts, public.likes,
  public.seen_posts, public.notes, public.reports from anon, authenticated;

-- is_admin is deliberately not readable; use the is_admin() function.
grant select (id, display_name, bio, location, created_at) on public.profiles to anon, authenticated;
grant update (display_name, bio, location) on public.profiles to authenticated;

grant select on public.posts to anon, authenticated;
grant insert (body, image_path) on public.posts to authenticated;
grant update (body) on public.posts to authenticated;
grant delete on public.posts to authenticated;

grant select, delete on public.likes to authenticated;
grant insert (post_id) on public.likes to authenticated;

grant select on public.seen_posts to authenticated;

grant select on public.notes to authenticated;
grant insert (post_id, body) on public.notes to authenticated;

grant insert (post_id, reason) on public.reports to authenticated;
grant select, update (resolved) on public.reports to authenticated;

grant select on public.invite_codes to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.invite_codes enable row level security;
alter table public.posts        enable row level security;
alter table public.likes        enable row level security;
alter table public.seen_posts   enable row level security;
alter table public.notes        enable row level security;
alter table public.reports      enable row level security;

create policy "profiles: public read" on public.profiles
  for select using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "posts: public read" on public.posts
  for select using (not is_removed or author_id = (select auth.uid()) or (select public.is_admin()));
create policy "posts: insert as self" on public.posts
  for insert to authenticated with check (
    author_id = (select auth.uid())
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
  );
create policy "posts: update own" on public.posts
  for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "posts: delete own" on public.posts
  for delete to authenticated using (author_id = (select auth.uid()));

-- Own rows only, for every operation. Nobody can read or count anyone else's likes.
create policy "likes: own select" on public.likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "likes: own insert" on public.likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "likes: own delete" on public.likes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "seen_posts: own select" on public.seen_posts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "notes: sender or recipient read" on public.notes
  for select to authenticated using ((select auth.uid()) in (sender_id, recipient_id));
create policy "notes: send as self" on public.notes
  for insert to authenticated with check (sender_id = (select auth.uid()));

create policy "reports: insert as self" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "reports: admin read" on public.reports
  for select to authenticated using ((select public.is_admin()));
create policy "reports: admin update" on public.reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "invite_codes: admin read" on public.invite_codes
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Storage: public-read bucket, 5MB images, users write only to "<their uid>/..."
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "post-images: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "post-images: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
