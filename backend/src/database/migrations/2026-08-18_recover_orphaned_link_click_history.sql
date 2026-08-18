-- Recovers per-button click history orphaned by the old link-sync behaviour.
--
-- `LinksService.syncLinks` used to delete every link of a linktree and
-- re-insert the submitted set. Each surviving button came back with a new uuid,
-- so `fn_sync_link_public_action` registered a fresh `public_page_actions` row
-- for it and the previous row was archived (`source_link_id = NULL`,
-- `status = 'archived'`). Clicks already recorded stayed in
-- `analytics_action_daily` against the archived id, and the breakdown query
-- excludes archived actions -- so every click a page had recorded vanished the
-- first time its owner edited it. Page-level totals were never affected:
-- `analytics_page_daily` is keyed by `public_pages.id`, which never changed.
--
-- This migration folds those orphaned rollups back onto the live action that
-- replaced them. The service no longer destroys link rows, so this is a
-- one-time repair of damage already done.
--
-- Deliberately conservative:
--   * only archived, detached, `link:%` actions are considered;
--   * a match must be the *only* active action on the same public page with the
--     same destination -- anything ambiguous is left untouched rather than
--     guessed at;
--   * counters are summed into the surviving row for the same (day, timezone),
--     never overwritten;
--   * orphan rows are deleted once folded in, so re-running is a no-op.

-- The forward-migration runner wraps each file in its own transaction, so
-- this file declares none of its own.

CREATE TEMP TABLE recovered_action_daily ON COMMIT DROP AS
WITH orphan AS (
  SELECT archived.id AS archived_action_id,
         archived.public_page_id,
         archived.destination
    FROM public.public_page_actions archived
   WHERE archived.status = 'archived'
     AND archived.source_link_id IS NULL
     AND archived.action_key LIKE 'link:%'
     AND archived.destination IS NOT NULL
),
-- The live replacement, only where it is unambiguous.
resolved AS (
  SELECT orphan.archived_action_id,
         MIN(live.id::text)::uuid AS live_action_id
    FROM orphan
    JOIN public.public_page_actions live
      ON live.public_page_id = orphan.public_page_id
     AND live.destination = orphan.destination
     AND live.status = 'active'
     AND live.source_link_id IS NOT NULL
     AND live.action_key LIKE 'link:%'
   GROUP BY orphan.archived_action_id
  HAVING COUNT(*) = 1
)
SELECT daily.business_id,
       daily.public_page_id,
       resolved.live_action_id,
       daily.day,
       daily.timezone,
       daily.total_clicks,
       daily.new_clickers,
       daily.conversions,
       daily.conversion_value,
       daily.public_page_action_id AS orphan_action_id
  FROM public.analytics_action_daily daily
  JOIN resolved ON resolved.archived_action_id = daily.public_page_action_id;

INSERT INTO public.analytics_action_daily (
  business_id, public_page_id, public_page_action_id, day, timezone,
  total_clicks, new_clickers, conversions, conversion_value
)
SELECT business_id,
       public_page_id,
       live_action_id,
       day,
       timezone,
       SUM(total_clicks),
       SUM(new_clickers),
       SUM(conversions),
       SUM(conversion_value)
  FROM recovered_action_daily
 GROUP BY business_id, public_page_id, live_action_id, day, timezone
ON CONFLICT (public_page_action_id, day, timezone) DO UPDATE SET
  total_clicks = public.analytics_action_daily.total_clicks + EXCLUDED.total_clicks,
  new_clickers = public.analytics_action_daily.new_clickers + EXCLUDED.new_clickers,
  conversions = public.analytics_action_daily.conversions + EXCLUDED.conversions,
  conversion_value = public.analytics_action_daily.conversion_value + EXCLUDED.conversion_value,
  updated_at = now();

-- Folded in, so the orphan rows must go or a second run would double them.
DELETE FROM public.analytics_action_daily daily
 USING recovered_action_daily recovered
 WHERE daily.public_page_action_id = recovered.orphan_action_id
   AND daily.day = recovered.day
   AND daily.timezone = recovered.timezone;

-- Re-point the event log too, so a per-button drill-down reaches the same
-- events the rollup now counts.
UPDATE public.analytics_events event
   SET public_page_action_id = recovered.live_action_id
  FROM (
    SELECT DISTINCT orphan_action_id, live_action_id
      FROM recovered_action_daily
  ) recovered
 WHERE event.public_page_action_id = recovered.orphan_action_id;

