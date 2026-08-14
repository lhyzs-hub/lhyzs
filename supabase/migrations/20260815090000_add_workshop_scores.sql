begin;

alter table public.game_runs
  add column if not exists game_key text not null default 'yuumi-flight',
  add column if not exists challenge_key text;

alter table public.game_runs
  drop constraint if exists game_runs_game_key_check;
alter table public.game_runs
  add constraint game_runs_game_key_check
    check (game_key in ('yuumi-flight', 'hextech-workshop'));

alter table public.game_scores
  add column if not exists game_key text not null default 'yuumi-flight',
  add column if not exists challenge_key text,
  add column if not exists parts_used integer,
  add column if not exists energy_used integer,
  add column if not exists duration_ms integer,
  add column if not exists stars integer;

alter table public.game_scores
  drop constraint if exists game_scores_game_key_check,
  drop constraint if exists game_scores_parts_used_check,
  drop constraint if exists game_scores_energy_used_check,
  drop constraint if exists game_scores_duration_ms_check,
  drop constraint if exists game_scores_stars_check;

alter table public.game_scores
  add constraint game_scores_game_key_check
    check (game_key in ('yuumi-flight', 'hextech-workshop')),
  add constraint game_scores_parts_used_check
    check (parts_used is null or parts_used between 1 and 40),
  add constraint game_scores_energy_used_check
    check (energy_used is null or energy_used between 1 and 200),
  add constraint game_scores_duration_ms_check
    check (duration_ms is null or duration_ms between 1000 and 1800000),
  add constraint game_scores_stars_check
    check (stars is null or stars between 1 and 3);

create index if not exists game_scores_workshop_daily_idx
  on public.game_scores (game_key, challenge_key, score desc, created_at asc)
  where is_visible = true and review_status = 'accepted';

grant select (game_key, challenge_key, parts_used, energy_used, duration_ms, stars)
  on table public.game_scores to anon, authenticated;

create or replace function public.claim_workshop_run(
  p_run_id uuid,
  p_fingerprint text,
  p_challenge_key text,
  p_score integer,
  p_parts integer,
  p_energy integer,
  p_duration_ms integer
)
returns table (accepted boolean, reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.game_runs%rowtype;
  v_elapsed_ms bigint;
  v_expected_score integer;
  v_reason text;
begin
  select * into v_run from public.game_runs where id = p_run_id for update;
  if not found or v_run.fingerprint <> p_fingerprint then
    return query select false, 'invalid_run'::text;
    return;
  end if;
  if v_run.used_at is not null then
    return query select false, 'run_already_used'::text;
    return;
  end if;
  if v_run.expires_at <= clock_timestamp() then
    update public.game_runs set used_at = clock_timestamp(), rejection_reason = 'expired' where id = p_run_id;
    return query select false, 'expired'::text;
    return;
  end if;

  v_elapsed_ms := floor(extract(epoch from (clock_timestamp() - v_run.started_at)) * 1000);
  v_expected_score := greatest(100, 2000 - p_parts * 70 - p_energy * 25 - ceil(p_duration_ms / 1000.0)::integer * 4);
  v_reason := case
    when v_run.game_key <> 'hextech-workshop' then 'wrong_game'
    when v_run.challenge_key is distinct from p_challenge_key then 'wrong_challenge'
    when p_parts < 1 or p_parts > 40 then 'parts_out_of_range'
    when p_energy < 1 or p_energy > 200 then 'energy_out_of_range'
    when p_duration_ms < 1000 or p_duration_ms > 1800000 then 'duration_out_of_range'
    when p_duration_ms > v_elapsed_ms + 15000 then 'invalid_duration'
    when p_score <> v_expected_score then 'invalid_score'
    else null
  end;

  update public.game_runs
    set used_at = clock_timestamp(), submitted_score = p_score, rejection_reason = v_reason
    where id = p_run_id;

  return query select v_reason is null, coalesce(v_reason, 'accepted');
end;
$$;

revoke all on function public.claim_workshop_run(uuid, text, text, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_workshop_run(uuid, text, text, integer, integer, integer, integer)
  to service_role;

commit;
