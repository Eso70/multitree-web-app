-- Retires the `website` link platform in favour of `custom`.
--
-- The two did the same job: both accept a bare domain and store an
-- `https://…` url, and `custom` additionally passes through any explicit
-- scheme. Offering both only made the editor ask a question with no consequence.
--
-- The destination url is deliberately left untouched. `LinksService.syncLinks`
-- matches a link to its stored row on platform + url, so rewriting the url here
-- would make every one of these links look new on the owner's next save and
-- would retire the `public_page_actions` row holding its clicks. Changing only
-- the platform keeps the destination, and therefore the click history, intact.
--
-- `links.platform` has no enum or check constraint beyond a non-empty length,
-- so no schema change is required.
--
-- Idempotent: a second run matches nothing.

UPDATE public.links
   SET platform = 'custom',
       updated_at = now()
 WHERE lower(platform) = 'website';

-- `fn_sync_link_public_action` maps both `website` and `custom` to
-- `action_type = 'link'` with `tiktok_event = 'ClickButton'`, so the registered
-- actions already carry the right values and only their recorded platform label
-- needs to follow the link.
UPDATE public.public_page_actions
   SET metadata = jsonb_set(metadata, '{platform}', '"custom"'),
       updated_at = now()
 WHERE metadata ->> 'platform' = 'website';
