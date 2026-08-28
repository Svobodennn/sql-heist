-- RLS does not apply to TRUNCATE, and browser roles never need schema-shaping
-- table privileges. Keep private base-table reads authenticated-only and expose
-- anonymous data solely through the curated public views.
revoke truncate, trigger, references
  on table public.profiles, public.case_progress, public.profile_consent_events
  from public, anon, authenticated;

revoke select
  on table public.profiles, public.case_progress, public.profile_consent_events
  from public, anon;

-- Availability probing reveals private usernames. Profile creation's unique
-- constraint remains the sole collision check and is caller-bound by RLS.
revoke all on function public.username_available(extensions.citext)
  from public, anon, authenticated;
