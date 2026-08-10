begin;

alter table public.site_comments
  add column if not exists submission_fingerprint text,
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz;

create index if not exists site_comments_fingerprint_created_idx
  on public.site_comments (submission_fingerprint, created_at desc)
  where submission_fingerprint is not null;

revoke insert on table public.site_comments from anon, authenticated;
revoke usage, select on sequence public.site_comments_id_seq from anon, authenticated;
grant select, insert on table public.site_comments to service_role;
grant usage, select on sequence public.site_comments_id_seq to service_role;
drop policy if exists "Visitors can create valid comments" on public.site_comments;

create table if not exists public.public_submission_limits (
  action text not null,
  fingerprint text not null,
  window_started_at timestamptz not null default timezone('utc', now()),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (action, fingerprint),
  constraint public_submission_limits_action_length check (char_length(action) between 1 and 40),
  constraint public_submission_limits_fingerprint_length check (char_length(fingerprint) = 64)
);

alter table public.public_submission_limits enable row level security;
revoke all on table public.public_submission_limits from anon, authenticated;

create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '30 minutes',
  used_at timestamptz,
  submitted_score integer,
  rejection_reason text,
  constraint game_runs_fingerprint_length check (char_length(fingerprint) = 64)
);

create index if not exists game_runs_expiry_idx on public.game_runs (expires_at);
alter table public.game_runs enable row level security;
revoke all on table public.game_runs from anon, authenticated;
grant select, insert on table public.game_runs to service_role;

alter table public.game_scores
  add column if not exists run_id uuid references public.game_runs(id) on delete set null,
  add column if not exists submission_fingerprint text,
  add column if not exists is_visible boolean not null default true,
  add column if not exists review_status text not null default 'accepted',
  add column if not exists risk_reason text;

alter table public.game_scores
  drop constraint if exists game_scores_review_status_check;
alter table public.game_scores
  add constraint game_scores_review_status_check
    check (review_status in ('accepted', 'flagged', 'rejected'));

create unique index if not exists game_scores_run_id_unique_idx
  on public.game_scores (run_id)
  where run_id is not null;
create index if not exists game_scores_public_rank_idx
  on public.game_scores (score desc, created_at asc)
  where is_visible = true and review_status = 'accepted';

revoke insert on table public.game_scores from anon, authenticated;
revoke usage, select on sequence public.game_scores_id_seq from anon, authenticated;
grant select, insert on table public.game_scores to service_role;
grant usage, select on sequence public.game_scores_id_seq to service_role;
drop policy if exists "Visitors can submit valid game scores" on public.game_scores;
drop policy if exists "Public game scores are readable" on public.game_scores;
create policy "Public game scores are readable"
  on public.game_scores
  for select
  to anon, authenticated
  using (is_visible = true and review_status = 'accepted');

create or replace function public.consume_public_rate_limit(
  p_action text,
  p_fingerprint text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_record public.public_submission_limits%rowtype;
  v_elapsed double precision;
begin
  if p_limit < 1 or p_window_seconds < 1 or char_length(p_fingerprint) <> 64 then
    raise exception 'invalid rate limit parameters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_action || ':' || p_fingerprint, 0));
  select * into v_record
    from public.public_submission_limits
    where action = p_action and fingerprint = p_fingerprint
    for update;

  if not found then
    insert into public.public_submission_limits(action, fingerprint, window_started_at, request_count)
    values (p_action, p_fingerprint, v_now, 1);
    return query select true, 0;
    return;
  end if;

  v_elapsed := extract(epoch from (v_now - v_record.window_started_at));
  if v_elapsed >= p_window_seconds then
    update public.public_submission_limits
      set window_started_at = v_now, request_count = 1
      where action = p_action and fingerprint = p_fingerprint;
    return query select true, 0;
  end if;

  if v_record.request_count >= p_limit then
    return query select false, greatest(1, ceil(p_window_seconds - v_elapsed)::integer);
    return;
  end if;

  update public.public_submission_limits
    set request_count = request_count + 1
    where action = p_action and fingerprint = p_fingerprint;
  return query select true, 0;
end;
$$;

create or replace function public.claim_game_run(
  p_run_id uuid,
  p_fingerprint text,
  p_score integer
)
returns table (accepted boolean, reason text, max_score integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.game_runs%rowtype;
  v_elapsed double precision;
  v_max_score integer;
  v_reason text;
begin
  select * into v_run from public.game_runs where id = p_run_id for update;
  if not found or v_run.fingerprint <> p_fingerprint then
    return query select false, 'invalid_run'::text, 0;
    return;
  end if;
  if v_run.used_at is not null then
    return query select false, 'run_already_used'::text, 0;
    return;
  end if;
  if v_run.expires_at <= clock_timestamp() then
    update public.game_runs set used_at = clock_timestamp(), rejection_reason = 'expired' where id = p_run_id;
    return query select false, 'expired'::text, 0;
    return;
  end if;

  v_elapsed := greatest(0, extract(epoch from (clock_timestamp() - v_run.started_at)));
  v_max_score := least(10000, ceil(v_elapsed * 22 + 25)::integer);
  v_reason := case
    when p_score < 1 or p_score > 10000 then 'score_out_of_range'
    when p_score > v_max_score then 'impossible_score'
    else null
  end;

  update public.game_runs
    set used_at = clock_timestamp(), submitted_score = p_score, rejection_reason = v_reason
    where id = p_run_id;

  return query select v_reason is null, coalesce(v_reason, 'accepted'), v_max_score;
end;
$$;

create or replace function public.moderate_site_comment(
  p_comment_id bigint,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_action = 'hide' then
    update public.site_comments
      set is_visible = false, moderation_reason = nullif(btrim(p_reason), ''), moderated_at = timezone('utc', now())
      where id = p_comment_id;
  elsif p_action = 'show' then
    update public.site_comments
      set is_visible = true, moderation_reason = null, moderated_at = timezone('utc', now())
      where id = p_comment_id;
  elsif p_action = 'delete' then
    delete from public.site_comments where id = p_comment_id;
  else
    raise exception 'unsupported moderation action';
  end if;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_game_run(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.moderate_site_comment(bigint, text, text) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.claim_game_run(uuid, text, integer) to service_role;
grant execute on function public.moderate_site_comment(bigint, text, text) to service_role;

commit;
