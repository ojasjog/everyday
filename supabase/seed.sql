-- Inserts 5 sample invite codes. Safe to run more than once.
-- Run in the Supabase SQL editor (or automatically via `supabase db reset`).
insert into public.invite_codes (code) values
  ('WELCOME001'),
  ('WELCOME002'),
  ('WELCOME003'),
  ('WELCOME004'),
  ('WELCOME005')
on conflict (code) do nothing;
