begin;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
set search_path = public, auth, pg_temp
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = '3178287074@qq.com';
$$;

revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;

grant select (is_visible, moderation_reason, moderated_at)
  on table public.site_comments to authenticated;

drop policy if exists "Site admin can read all comments" on public.site_comments;
create policy "Site admin can read all comments"
  on public.site_comments
  for select
  to authenticated
  using (public.is_site_admin());

create or replace function public.admin_moderate_site_comment(
  p_comment_id bigint,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_site_admin() then
    raise insufficient_privilege using message = 'site admin access required';
  end if;

  if p_action = 'hide' then
    update public.site_comments
      set is_visible = false,
          moderation_reason = nullif(btrim(p_reason), ''),
          moderated_at = timezone('utc', now())
      where id = p_comment_id;
  elsif p_action = 'show' then
    update public.site_comments
      set is_visible = true,
          moderation_reason = null,
          moderated_at = timezone('utc', now())
      where id = p_comment_id;
  elsif p_action = 'delete' then
    delete from public.site_comments where id = p_comment_id;
  else
    raise exception 'unsupported moderation action';
  end if;
end;
$$;

revoke all on function public.admin_moderate_site_comment(bigint, text, text)
  from public, anon;
grant execute on function public.admin_moderate_site_comment(bigint, text, text)
  to authenticated;

commit;
