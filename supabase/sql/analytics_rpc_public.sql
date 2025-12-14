-- Analytics RPC Functions (public schema)
--
-- Purpose:
--   Fix PGRST202 "function not found" errors by ensuring all RPC functions
--   referenced by the app exist in schema `public`, which is exposed by default
--   via Supabase PostgREST.
--
-- Notes:
--   - Tables live in schema `park_connect` (per Prisma schema).
--   - These functions intentionally read from `park_connect.*` tables.
--   - Grant EXECUTE only to `authenticated` + `service_role` by default.
--   - After running this file, you may need to refresh PostgREST schema cache.

begin;

-- -------------------------
-- Admin analytics (no args)
-- -------------------------

create or replace function public.ad_get_active_bookings_now()
returns table(active_bookings bigint)
language sql
stable
as $$
  select
    count(*)::bigint as active_bookings
  from park_connect.bookings b
  where
    b.booking_status in ('CONFIRMED', 'COMPLETED')
    and now() >= b.start_time
    and now() < b.end_time;
$$;

create or replace function public.ad_get_active_users_last_30_days()
returns table(active_users bigint)
language sql
stable
as $$
  with recent_bookings as (
    select
      b.driver_id,
      a.owner_id
    from park_connect.bookings b
    join park_connect.availability a
      on a.availability_id = b.availability_id
    where
      b.booking_status in ('CONFIRMED', 'COMPLETED')
      and b.start_time >= (now() - interval '30 days')
  )
  select
    (
      select count(*)::bigint
      from (
        select distinct driver_id as user_id from recent_bookings where driver_id is not null
        union
        select distinct owner_id as user_id from recent_bookings where owner_id is not null
      ) u
    ) as active_users;
$$;

create or replace function public.ad_get_platform_revenue_this_month()
returns table(month_start date, total_platform_revenue numeric, total_bookings bigint)
language sql
stable
as $$
  with bounds as (
    select
      date_trunc('month', now())::date as month_start,
      (date_trunc('month', now()) + interval '1 month') as next_month_start
  )
  select
    bnd.month_start,
    coalesce(sum(coalesce(b.service_fee, 0)), 0)::numeric as total_platform_revenue,
    count(*)::bigint as total_bookings
  from bounds bnd
  left join park_connect.bookings b
    on b.start_time >= bnd.month_start
   and b.start_time < bnd.next_month_start
   and b.booking_status in ('CONFIRMED', 'COMPLETED')
  group by bnd.month_start;
$$;

create or replace function public.ad_get_total_platform_revenue()
returns table(total_platform_revenue numeric, total_bookings bigint)
language sql
stable
as $$
  select
    coalesce(sum(coalesce(b.service_fee, 0)), 0)::numeric as total_platform_revenue,
    count(*)::bigint as total_bookings
  from park_connect.bookings b
  where b.booking_status in ('CONFIRMED', 'COMPLETED');
$$;

create or replace function public.ad_get_total_spaces_listed()
returns table(total_spaces bigint)
language sql
stable
as $$
  select count(*)::bigint as total_spaces
  from park_connect.parking_spaces;
$$;

create or replace function public.ad_get_total_users()
returns table(total_users bigint)
language sql
stable
as $$
  select count(*)::bigint as total_users
  from park_connect.users;
$$;

create or replace function public.get_monthly_platform_revenue_past_12_months()
returns table(month_year text, month_start date, total_platform_revenue numeric, booking_count bigint)
language sql
stable
as $$
  with months as (
    select
      generate_series(
        date_trunc('month', now()) - interval '11 months',
        date_trunc('month', now()),
        interval '1 month'
      ) as month_start_ts
  )
  select
    to_char(m.month_start_ts, 'Mon YYYY') as month_year,
    m.month_start_ts::date as month_start,
    coalesce(sum(coalesce(b.service_fee, 0)), 0)::numeric as total_platform_revenue,
    count(b.booking_id)::bigint as booking_count
  from months m
  left join park_connect.bookings b
    on b.start_time >= m.month_start_ts
   and b.start_time < (m.month_start_ts + interval '1 month')
   and b.booking_status in ('CONFIRMED', 'COMPLETED')
  group by m.month_start_ts
  order by m.month_start_ts;
$$;

-- -------------------------
-- Host analytics (p_owner_id)
-- -------------------------

create or replace function public.get_current_month_earnings(p_owner_id integer)
returns table(owner_id integer, month_start date, total_earnings numeric)
language sql
stable
as $$
  with bounds as (
    select
      date_trunc('month', now())::date as month_start,
      (date_trunc('month', now()) + interval '1 month') as next_month_start
  )
  select
    p_owner_id as owner_id,
    bnd.month_start,
    coalesce(sum(b.owner_payout), 0)::numeric as total_earnings
  from bounds bnd
  left join park_connect.bookings b
    on b.start_time >= bnd.month_start
   and b.start_time < bnd.next_month_start
   and b.booking_status in ('CONFIRMED', 'COMPLETED')
  left join park_connect.availability a
    on a.availability_id = b.availability_id
  where a.owner_id = p_owner_id
  group by bnd.month_start;
$$;

create or replace function public.get_total_lifetime_revenue(p_owner_id integer)
returns table(owner_id integer, total_revenue numeric, booking_count bigint)
language sql
stable
as $$
  select
    p_owner_id as owner_id,
    coalesce(sum(b.owner_payout), 0)::numeric as total_revenue,
    count(*)::bigint as booking_count
  from park_connect.bookings b
  join park_connect.availability a
    on a.availability_id = b.availability_id
  where
    a.owner_id = p_owner_id
    and b.booking_status in ('CONFIRMED', 'COMPLETED');
$$;

create or replace function public.get_total_bookings_this_month(p_owner_id integer)
returns table(owner_id integer, month_start date, total_bookings bigint)
language sql
stable
as $$
  with bounds as (
    select
      date_trunc('month', now())::date as month_start,
      (date_trunc('month', now()) + interval '1 month') as next_month_start
  )
  select
    p_owner_id as owner_id,
    bnd.month_start,
    count(*)::bigint as total_bookings
  from bounds bnd
  join park_connect.bookings b
    on b.start_time >= bnd.month_start
   and b.start_time < bnd.next_month_start
   and b.booking_status in ('CONFIRMED', 'COMPLETED')
  join park_connect.availability a
    on a.availability_id = b.availability_id
  where a.owner_id = p_owner_id
  group by bnd.month_start;
$$;

create or replace function public.get_owner_2weeks_bookings(p_owner_id integer)
returns table(current_count bigint, diff_count bigint)
language sql
stable
as $$
  with base as (
    select b.start_time
    from park_connect.bookings b
    join park_connect.availability a
      on a.availability_id = b.availability_id
    where
      a.owner_id = p_owner_id
      and b.booking_status in ('CONFIRMED', 'COMPLETED')
  ),
  counts as (
    select
      count(*) filter (where start_time >= (now() - interval '14 days'))::bigint as current_count,
      count(*) filter (where start_time >= (now() - interval '28 days') and start_time < (now() - interval '14 days'))::bigint as prev_count
    from base
  )
  select
    c.current_count,
    (c.current_count - c.prev_count)::bigint as diff_count
  from counts c;
$$;

create or replace function public.get_owner_2weeks_income(p_owner_id integer)
returns table(current_income numeric, diff_income numeric)
language sql
stable
as $$
  with base as (
    select b.start_time, b.owner_payout
    from park_connect.bookings b
    join park_connect.availability a
      on a.availability_id = b.availability_id
    where
      a.owner_id = p_owner_id
      and b.booking_status in ('CONFIRMED', 'COMPLETED')
  ),
  sums as (
    select
      coalesce(sum(owner_payout) filter (where start_time >= (now() - interval '14 days')), 0)::numeric as current_income,
      coalesce(sum(owner_payout) filter (where start_time >= (now() - interval '28 days') and start_time < (now() - interval '14 days')), 0)::numeric as prev_income
    from base
  )
  select
    s.current_income,
    (s.current_income - s.prev_income)::numeric as diff_income
  from sums s;
$$;

create or replace function public.get_owner_average_rating(p_owner_id integer)
returns table(owner_id integer, avg_rating numeric, review_count bigint)
language sql
stable
as $$
  select
    p_owner_id as owner_id,
    coalesce(avg(r.rating)::numeric, 0)::numeric as avg_rating,
    count(r.review_id)::bigint as review_count
  from park_connect.reviews r
  where
    r.reviewee_id = p_owner_id
    and coalesce(r.review_type, 'DRIVER_TO_OWNER') = 'DRIVER_TO_OWNER';
$$;

create or replace function public.get_monthly_occupancy_rate(p_owner_id integer)
returns table(owner_id integer, month_start date, month_end date, occupied_days integer, total_days integer, occupancy_rate numeric)
language sql
stable
as $$
  with bounds as (
    select
      date_trunc('month', now())::date as month_start,
      ((date_trunc('month', now()) + interval '1 month')::date - 1) as month_end
  ),
  days as (
    select generate_series(b.month_start, b.month_end, interval '1 day')::date as d, b.month_start, b.month_end
    from bounds b
  ),
  occupied as (
    select
      count(*)::int as occupied_days,
      (max(d.month_end) - min(d.month_start) + 1)::int as total_days
    from days d
    where exists (
      select 1
      from park_connect.bookings b
      join park_connect.availability a
        on a.availability_id = b.availability_id
      where
        a.owner_id = p_owner_id
        and b.booking_status in ('CONFIRMED', 'COMPLETED')
        and tsrange(b.start_time, b.end_time, '[)') && tsrange(d.d::timestamp, (d.d + 1)::timestamp, '[)')
    )
  )
  select
    p_owner_id as owner_id,
    b.month_start,
    b.month_end,
    o.occupied_days,
    o.total_days,
    case when o.total_days > 0 then round((o.occupied_days::numeric / o.total_days::numeric) * 100, 2) else 0 end as occupancy_rate
  from bounds b
  cross join occupied o;
$$;

create or replace function public.get_current_space_status(p_owner_id integer)
returns table(space_id integer, space_title text, is_available boolean, current_booking_status text, current_status text)
language sql
stable
as $$
  with owner_spaces as (
    select distinct ps.space_id, ps.title
    from park_connect.parking_spaces ps
    join park_connect.availability a
      on a.space_id = ps.space_id
    where a.owner_id = p_owner_id
  )
  select
    os.space_id,
    os.title as space_title,
    coalesce(av.is_available_now, false) as is_available,
    coalesce(bk.booking_status, 'NONE') as current_booking_status,
    case
      when bk.booking_status is not null then 'BOOKED'
      when coalesce(av.is_available_now, false) then 'AVAILABLE'
      else 'UNAVAILABLE'
    end as current_status
  from owner_spaces os
  left join lateral (
    select true as is_available_now
    from park_connect.availability a
    where
      a.owner_id = p_owner_id
      and a.space_id = os.space_id
      and a.is_available = true
      and now() >= a.available_start
      and now() < a.available_end
    limit 1
  ) av on true
  left join lateral (
    select b.booking_status
    from park_connect.bookings b
    join park_connect.availability a
      on a.availability_id = b.availability_id
    where
      a.owner_id = p_owner_id
      and a.space_id = os.space_id
      and b.booking_status in ('CONFIRMED', 'COMPLETED')
      and now() >= b.start_time
      and now() < b.end_time
    order by b.start_time desc
    limit 1
  ) bk on true
  order by os.space_id;
$$;

-- -------------------------
-- Permissions
-- -------------------------

do $$
begin
  -- RPC requires USAGE on schema `public` in addition to EXECUTE on functions.
  -- Some projects lock down schema privileges; ensure the app roles can resolve `public.*`.
  grant usage on schema public to anon, authenticated, service_role;

  -- Admin functions
  revoke all on function public.ad_get_active_bookings_now() from public;
  revoke all on function public.ad_get_active_users_last_30_days() from public;
  revoke all on function public.ad_get_platform_revenue_this_month() from public;
  revoke all on function public.ad_get_total_platform_revenue() from public;
  revoke all on function public.ad_get_total_spaces_listed() from public;
  revoke all on function public.ad_get_total_users() from public;
  revoke all on function public.get_monthly_platform_revenue_past_12_months() from public;

  grant execute on function public.ad_get_active_bookings_now() to authenticated, service_role;
  grant execute on function public.ad_get_active_users_last_30_days() to authenticated, service_role;
  grant execute on function public.ad_get_platform_revenue_this_month() to authenticated, service_role;
  grant execute on function public.ad_get_total_platform_revenue() to authenticated, service_role;
  grant execute on function public.ad_get_total_spaces_listed() to authenticated, service_role;
  grant execute on function public.ad_get_total_users() to authenticated, service_role;
  grant execute on function public.get_monthly_platform_revenue_past_12_months() to authenticated, service_role;

  -- Host functions
  revoke all on function public.get_current_month_earnings(integer) from public;
  revoke all on function public.get_total_lifetime_revenue(integer) from public;
  revoke all on function public.get_total_bookings_this_month(integer) from public;
  revoke all on function public.get_owner_2weeks_bookings(integer) from public;
  revoke all on function public.get_owner_2weeks_income(integer) from public;
  revoke all on function public.get_owner_average_rating(integer) from public;
  revoke all on function public.get_monthly_occupancy_rate(integer) from public;
  revoke all on function public.get_current_space_status(integer) from public;

  grant execute on function public.get_current_month_earnings(integer) to authenticated, service_role;
  grant execute on function public.get_total_lifetime_revenue(integer) to authenticated, service_role;
  grant execute on function public.get_total_bookings_this_month(integer) to authenticated, service_role;
  grant execute on function public.get_owner_2weeks_bookings(integer) to authenticated, service_role;
  grant execute on function public.get_owner_2weeks_income(integer) to authenticated, service_role;
  grant execute on function public.get_owner_average_rating(integer) to authenticated, service_role;
  grant execute on function public.get_monthly_occupancy_rate(integer) to authenticated, service_role;
  grant execute on function public.get_current_space_status(integer) to authenticated, service_role;

  -- Ask PostgREST to reload schema cache (Supabase listens for these notifications)
  perform pg_notify('pgrst', 'reload schema');
end $$;

commit;
