--
-- MultiTree baseline catalog data
--
-- The rows the application cannot boot without: the permission catalogue, the
-- billing plans and their grants, the access rules, and the platform
-- administrator. Split out of `full_schema.sql` so structure and seed data can
-- be read and reviewed separately -- they change for entirely different
-- reasons, and 500 lines of INSERTs sitting between the tables and their
-- constraints made both harder to follow.
--
-- Applied immediately after `full_schema.sql`, inside the same transaction, by
-- `db-migrate.ts` and `db-reset.ts`. It is NOT a forward migration: the runner
-- only picks up dated `YYYY-MM-DD_*.sql` files.
--
-- Note the ordering difference from a pg_dump: these rows now land after the
-- primary keys, unique constraints and foreign keys exist, so they must be in
-- dependency order, and a violation fails loudly here instead of silently
-- loading bad rows.
--

--
-- Data for Name: access_rules; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('26fc6418-e097-4a56-9659-5236952c5a45', 'deny', 'multitree', '192.0.2.0/24', NULL, NULL, 'Simulated malicious web scraper network (TEST-NET-1)', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');
INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('fab41f72-eaa9-4b4e-a041-ae58dc14624b', 'deny', 'multitree', '198.51.100.0/24', NULL, NULL, 'Simulated comment spam botnet segment (TEST-NET-2)', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');
INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('4eb09659-a0e9-4617-99b4-6dc245f46184', 'deny', 'multitree', '203.0.113.42/32', NULL, NULL, 'Simulated brute-force attack source (TEST-NET-3)', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');
INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('e55c05d9-3e6c-4119-9a5d-0e2c640d75d6', 'allow', 'multitree', '127.0.0.1/32', NULL, NULL, 'Whitelist localhost loopback address for development testing', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');
INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('e86a9887-4e27-47cd-a783-79ef1705ba16', 'allow', 'multitree', '192.0.2.100/32', NULL, NULL, 'Developer proxy office IP (TEST-NET-1)', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');


--
-- Data for Name: auth_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('4da8ea76-7679-4d7b-9dcf-dc71dae83575', 'business:pages:linktrees-access', 'business.pages', 'linktrees-access', 'Open the linktrees page', 'standard', '2026-07-16 22:06:14.312012+03', 'Business navigation', 11, '{}', false, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('db78a685-cb71-40ad-b2d9-4ca6b2de62e4', 'business:pages:templates-access', 'business.pages', 'templates-access', 'Open the templates page', 'standard', '2026-07-16 22:06:14.312012+03', 'Business navigation', 12, '{}', false, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5ba6c5f9-12af-4573-9db6-990a74943aa0', 'business:pages:profile-access', 'business.pages', 'profile-access', 'Open the business profile page', 'standard', '2026-07-16 22:06:14.312012+03', 'Business navigation', 13, '{}', false, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('071506c7-4c6d-46e2-bb8a-12ef55ae5ea6', 'business:pages:settings-access', 'business.pages', 'settings-access', 'Open the business settings page', 'standard', '2026-07-16 22:06:14.312012+03', 'Business navigation', 14, '{}', false, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('b5e9d58c-3c70-4f0a-9684-2ee2f20efc41', 'business:pages:mini-websites-access', 'business.pages', 'mini-websites-access', 'Open and manage the mini websites page', 'standard', '2026-07-27 00:00:00+03', 'Business navigation', 19, '{}', false, 'active', '2026-07-27 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f11', 'business:pages:advertising-access', 'business.pages', 'advertising-access', 'Open the advertising page', 'standard', '2026-08-05 00:00:00+03', 'Business navigation', 20, '{}', false, 'active', '2026-08-05 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f12', 'business:advertising:read', 'business.advertising', 'read', 'View the advertising service page', 'standard', '2026-08-05 00:00:00+03', 'Advertising', 246, '{}', false, 'active', '2026-08-05 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f13', 'business:advertising:update', 'business.advertising', 'update', 'Edit the advertising service page', 'sensitive', '2026-08-05 00:00:00+03', 'Advertising', 247, '{}', false, 'active', '2026-08-05 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f14', 'business:advertising:publish', 'business.advertising', 'publish', 'Publish or unpublish the advertising service page', 'sensitive', '2026-08-05 00:00:00+03', 'Advertising', 248, '{}', false, 'active', '2026-08-05 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('6e795805-5513-4c2b-a29a-ea50d3d9bcbf', 'business:security:username-update', 'business.security', 'username-update', 'Change the business owner username', 'sensitive', '2026-07-16 22:06:14.312012+03', 'Business account', 75, '{"username": "Username"}', true, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('dc4467b8-45d0-4672-a1ae-962670c4ea10', 'business:profile:update', 'business.profile', 'update', 'business profile update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Profile', 30, '{"logo": "Business logo", "name": "Business name", "phone": "Phone number", "favicon": "Browser favicon", "username": "Username", "website_color": "Website color", "default_avatar": "Default page avatar"}', true, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('4e81f943-2177-43eb-ae9b-93359ea72b1a', 'business:dashboard:view', 'business.dashboard', 'view', 'business dashboard view', 'standard', '2026-07-16 21:31:41.92101+03', 'Dashboard', 10, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('4545c9eb-2fd0-441b-937e-21f1dea9bf51', 'business:profile:read', 'business.profile', 'read', 'View the business profile', 'standard', '2026-07-16 21:31:41.849762+03', 'Profile', 20, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('2862c342-354e-4589-89ca-705720f8e082', 'business:profile-assets:upload', 'business.profile-assets', 'upload', 'business profile-assets upload', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Profile Assets', 40, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('58bbca30-f652-42e2-857d-3f5082e87bb9', 'business:defaults:read', 'business.defaults', 'read', 'business defaults read', 'standard', '2026-07-16 21:31:41.92101+03', 'Defaults', 50, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('3b044300-e0cc-45d3-8ff8-9db06386a794', 'business:defaults:update', 'business.defaults', 'update', 'business defaults update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Defaults', 60, '{"default_template": "Default template", "default_footer_text": "Default footer text", "default_footer_phone": "Default footer phone", "default_footer_hidden": "Hide footer by default", "default_background_color": "Default background color", "default_whatsapp_enabled": "Enable WhatsApp by default"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('84484813-6b91-4fa1-8f25-e579cc221d6c', 'business:security:email-update', 'business.security', 'email-update', 'business security email-update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Security', 70, '{"email": "Email address"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a95b87eb-6585-45b8-9faf-2ca2c2505952', 'business:security:sessions-revoke', 'business.security', 'sessions-revoke', 'Revoke business login sessions', 'critical', '2026-07-16 21:31:41.92101+03', 'Security', 80, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('94bc7644-adfe-4eca-a9b0-094885900e30', 'business:templates:browse', 'business.templates', 'browse', 'business templates browse', 'standard', '2026-07-16 21:31:41.92101+03', 'Templates', 90, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('ebea69bb-5bc5-454a-b9be-0c430e720e7d', 'business:templates:use', 'business.templates', 'use', 'business templates use', 'standard', '2026-07-16 21:31:41.92101+03', 'Templates', 100, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5a726536-4ae9-44d8-9451-b2b8a7d2b39f', 'business:templates:set-default', 'business.templates', 'set-default', 'business templates set-default', 'standard', '2026-07-16 21:31:41.92101+03', 'Templates', 110, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('eeebdd59-e782-4fcc-92c1-a53dd1c9a1f7', 'business:tiktok:read', 'business.tiktok', 'read', 'business tiktok read', 'standard', '2026-07-16 21:31:41.92101+03', 'Tiktok', 120, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('0fc5f2d5-7251-4e74-8bb8-a0e3e9d05b4e', 'business:tiktok:create', 'business.tiktok', 'create', 'business tiktok create', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Tiktok', 130, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('da2a9e74-3f92-4d23-856d-90f54ce0b97e', 'business:tiktok:update', 'business.tiktok', 'update', 'business tiktok update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Tiktok', 140, '{"status": "Status", "pixel_id": "Pixel ID", "events_token": "Events API token", "display_order": "Display order"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5649b298-7825-4c82-aeb7-efb5f82111ba', 'business:tiktok:delete', 'business.tiktok', 'delete', 'business tiktok delete', 'critical', '2026-07-16 21:31:41.92101+03', 'Tiktok', 150, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('e9bd236d-89c8-4984-9cab-b8a1c25a778c', 'business:tiktok:secret-read', 'business.tiktok', 'secret-read', 'business tiktok secret-read', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Tiktok', 160, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('c38a2902-fbc2-45fe-954d-891966da9bb9', 'business:linktrees:read', 'business.linktrees', 'read', 'View linktrees and links', 'standard', '2026-07-16 21:31:41.849762+03', 'Linktrees', 170, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('35912012-f370-4553-bdcb-f58c2222aa90', 'business:linktrees:create', 'business.linktrees', 'create', 'business linktrees create', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Linktrees', 180, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('ef30a5a5-0216-434e-88c1-99083dc99ffe', 'business:linktrees:update', 'business.linktrees', 'update', 'business linktrees update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Linktrees', 190, '{"name": "Page name", "image": "Page image", "seo_name": "SEO name", "subtitle": "Page subtitle", "footer_text": "Footer text", "footer_phone": "Footer phone", "footer_hidden": "Footer visibility", "whatsapp_modal": "WhatsApp modal", "template_config": "Template configuration", "background_color": "Background color"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('d0c0394f-0980-4bf7-9037-df7da7f7ac91', 'business:linktrees:delete', 'business.linktrees', 'delete', 'business linktrees delete', 'critical', '2026-07-16 21:31:41.92101+03', 'Linktrees', 200, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('0bb2906e-a3c0-4c47-bea2-79e82a397dc6', 'business:linktrees:upload', 'business.linktrees', 'upload', 'business linktrees upload', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Linktrees', 210, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('7a4e7b86-6d89-4ef6-982f-9f6c05a58f24', 'business:mini-websites:create', 'business.mini-websites', 'create', 'Create mini websites', 'sensitive', '2026-08-01 00:00:00+03', 'Mini websites', 245, '{}', false, 'active', '2026-08-01 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5996eafa-998d-406f-979c-d8bdbf2630cf', 'business:links:read', 'business.links', 'read', 'business links read', 'standard', '2026-07-16 21:31:41.92101+03', 'Links', 220, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('3ecb431e-1761-4ace-99f7-3aa0256c5edd', 'business:links:create', 'business.links', 'create', 'business links create', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Links', 230, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('e071be85-e7ed-4011-ad4b-cef02a24c961', 'business:links:update', 'business.links', 'update', 'business links update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Links', 240, '{"url": "URL", "metadata": "Link metadata", "platform": "Platform", "description": "Description", "display_name": "Display name", "display_order": "Display order", "default_message": "Default message"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('2cb3f841-e16b-49d9-bf30-68ba1fbabce1', 'business:links:delete', 'business.links', 'delete', 'business links delete', 'critical', '2026-07-16 21:31:41.92101+03', 'Links', 250, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('23a31232-63cc-4be1-843e-50f11f822cca', 'business:links:sync', 'business.links', 'sync', 'business links sync', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Links', 260, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('9def0e86-8469-494d-a5f8-1f5270aa42b1', 'business:links:reorder', 'business.links', 'reorder', 'business links reorder', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Links', 270, '{"display_order": "Display order"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('f65e5c47-08f4-43ec-807a-803136ee5665', 'business:analytics:totals-read', 'business.analytics', 'totals-read', 'business analytics totals-read', 'standard', '2026-07-16 21:31:41.92101+03', 'Analytics', 280, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('dad8f57c-2fbb-4e55-86d2-e2dd687f00bf', 'business:analytics:details-read', 'business.analytics', 'details-read', 'business analytics details-read', 'standard', '2026-07-16 21:31:41.92101+03', 'Analytics', 290, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('1e1826ef-4180-47e8-8a56-b7c79d20c354', 'business:analytics:tiktok-health-read', 'business.analytics', 'tiktok-health-read', 'View TikTok delivery diagnostics and retry failed events', 'standard', '2026-07-27 00:00:00+03', 'Analytics', 362, '{}', false, 'active', '2026-07-27 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('3b9d857f-e21e-4920-93ce-c42072db2a91', 'business:analytics:advanced-read', 'business.analytics', 'advanced-read', 'View the full advanced analytics page (cross-page breakdowns, funnel, retention, realtime, visitor lists)', 'standard', '2026-07-26 03:19:00+03', 'Analytics', 365, '{}', false, 'active', '2026-07-26 03:19:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('32246583-d06d-4e8a-b01a-4dddffd79e64', 'business:analytics:daily-read', 'business.analytics', 'daily-read', 'business analytics daily-read', 'standard', '2026-07-16 21:31:41.92101+03', 'Analytics', 300, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a3308ee2-44f8-4794-842f-707f8f5a7bfc', 'business:analytics:range-read', 'business.analytics', 'range-read', 'business analytics range-read', 'standard', '2026-07-16 21:31:41.92101+03', 'Analytics', 310, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('68c6ec50-aa2d-4865-bed5-205f62dd96ef', 'business:analytics:clear-linktree', 'business.analytics', 'clear-linktree', 'business analytics clear-linktree', 'critical', '2026-07-16 21:31:41.92101+03', 'Analytics', 320, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('d22f67a9-e32c-4cda-9b7e-56474492775d', 'business:analytics:clear-all', 'business.analytics', 'clear-all', 'business analytics clear-all', 'critical', '2026-07-16 21:31:41.92101+03', 'Analytics', 330, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('70310224-28d9-471b-8dd6-56484148fee9', 'business:settings:profile-access', 'business.settings', 'profile-access', 'Open the profile settings section', 'standard', '2026-07-16 22:07:32.055836+03', 'Business navigation', 15, '{}', false, 'active', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('127a91d9-093b-4e93-b0fa-d6d78f3e223a', 'business:settings:defaults-access', 'business.settings', 'defaults-access', 'Open the page defaults settings section', 'standard', '2026-07-16 22:07:32.055836+03', 'Business navigation', 16, '{}', false, 'active', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('ab2b6074-fe5d-44ba-9c80-b23277878c91', 'business:settings:security-access', 'business.settings', 'security-access', 'Open the account security settings section', 'standard', '2026-07-16 22:07:32.055836+03', 'Business navigation', 17, '{}', false, 'active', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5c47877c-aa54-4988-a569-46149ef10803', 'business:settings:integrations-access', 'business.settings', 'integrations-access', 'Open the integrations settings section', 'sensitive', '2026-07-16 22:07:32.055836+03', 'Business navigation', 18, '{}', false, 'active', '2026-07-16 22:07:32.055836+03');

-- Registered by forward migrations. The application refuses to boot when a
-- catalog permission is missing, so they are part of the baseline now.
-- From 2026-08-12_add_business_session_impersonation.sql:
INSERT INTO public.auth_permissions (permission_key, resource, action, description, risk_level, category, display_order, field_schema, supports_approval, status) VALUES ('platform:businesses:impersonate', 'platform.businesses', 'impersonate', 'Open a business dashboard as that business', 'critical', 'Business administration', 600, '{}', false, 'active');
-- From 2026-08-13_remove_password_authentication.sql. The business-side key was
-- renamed in place above so its grants survive; these two had no seeded rows to
-- rename, so they are inserted.
INSERT INTO public.auth_permissions (permission_key, resource, action, description, risk_level, category, display_order, field_schema, supports_approval, status) VALUES ('platform:businesses:sessions-revoke', 'platform.businesses', 'sessions-revoke', 'Revoke login sessions for a business', 'critical', 'Business administration', 540, '{}', false, 'active');
INSERT INTO public.auth_permissions (permission_key, resource, action, description, risk_level, category, display_order, field_schema, supports_approval, status) VALUES ('platform:settings:sessions-revoke', 'platform.settings', 'sessions-revoke', 'Manage platform administrator login sessions', 'critical', 'Platform settings', 720, '{}', false, 'active');


--
-- Data for Name: billing_entitlements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('abdda73e-7602-4a6e-8f83-20261d575821', 'feature.advanced_analytics', 'Advanced analytics', 'Advanced analytics and reporting', 'boolean', NULL, 'analytics', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('214c520c-3605-4507-aac9-323c2864a6cb', 'feature.api_access', 'API access', 'Allow business API clients', 'boolean', NULL, 'api', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('4d1778f5-0a66-45c5-8a29-519030bcbdfb', 'feature.webhooks', 'Webhooks', 'Allow outbound webhooks', 'boolean', NULL, 'api', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('53dfb3bf-cfc9-4189-9c7c-879fca9db420', 'feature.premium_templates', 'Premium templates', 'Allow premium visual templates', 'boolean', NULL, 'content', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('3b9f4737-a022-4af9-ba7b-e4ccb1805e6f', 'feature.pixel_tracking', 'Pixel tracking', 'Allow supported advertising pixels', 'boolean', NULL, 'analytics', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f20', 'feature.advertising_page', 'Advertising page', 'Allow the TikTok sponsorship service page', 'boolean', NULL, 'content', 'active', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f21', 'feature.mini_websites', 'Mini websites', 'Allow published mini website pages', 'boolean', NULL, 'content', 'active', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('bf2db4ff-f256-4fe8-9b8b-891b5feac367', 'feature.remove_branding', 'Remove branding', 'Allow platform branding removal', 'boolean', NULL, 'content', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('fd265354-836b-4561-bae9-fda950a08d64', 'limit.linktrees', 'Public page limit', 'Maximum active Linktrees and mini-websites', 'integer', 'pages', 'limits', 'active', '2026-07-16 21:31:41.878112+03', '2026-08-01 00:00:00+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('1fbcc8f4-3d50-4c5d-b35a-cca221b66421', 'limit.api_requests_monthly', 'Monthly API requests', 'Maximum API requests per billing period', 'integer', 'requests', 'limits', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('44a0832d-86e8-4ab1-83a9-416b67d4ec33', 'limit.api_clients', 'API client limit', 'Maximum active API clients', 'integer', 'clients', 'limits', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('5a1095de-55bd-4022-a2aa-5389df26ccc6', 'limit.webhook_endpoints', 'Webhook endpoint limit', 'Maximum active webhook endpoints', 'integer', 'endpoints', 'limits', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('bbcdffe3-bb86-4f9b-a28d-ec3da6af4a61', 'retention.audit_days', 'Audit retention', 'Number of days audit records remain available', 'integer', 'days', 'retention', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('a4da5bc4-110c-4fc9-b804-fe743ea6f372', 'feature.profile_editing', 'Profile editing', 'Allow business profile editing', 'boolean', NULL, 'profile', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('0a5ce780-b980-4621-a91d-d182d0059f76', 'feature.branding_editing', 'Branding editing', 'Allow business branding asset editing', 'boolean', NULL, 'profile', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('c5584929-d8fe-4123-bdf8-58ecc25181cf', 'feature.page_defaults', 'Page defaults', 'Allow business page default editing', 'boolean', NULL, 'content', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('5ec6420c-1935-4e30-819d-85eba440b0a7', 'feature.tiktok', 'TikTok integration', 'Allow TikTok pixels and Events API', 'boolean', NULL, 'integrations', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('696aa1a2-8815-43c2-b407-598bd53db63c', 'feature.analytics_clear', 'Analytics clearing', 'Allow destructive analytics clearing', 'boolean', NULL, 'analytics', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('11716c27-03ec-4e0c-93f3-d6b6932a8dcb', 'limit.tiktok_pixels', 'TikTok pixel limit', 'Maximum configured TikTok pixels', 'integer', 'pixels', 'limits', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('c296078e-89aa-4a70-88be-28058132772a', 'limit.templates', 'Template limit', 'Maximum available templates', 'integer', 'templates', 'limits', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('137c4e87-1c93-48d5-9f64-8632a15d15ee', 'limit.analytics_range_days', 'Analytics range limit', 'Maximum analytics query range', 'integer', 'days', 'limits', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('91fd0234-e4c2-4eb1-8238-f53c391cfba0', 'limit.profile_changes_monthly', 'Monthly profile changes', 'Maximum profile mutations per month', 'integer', 'changes', 'limits', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('76068746-ae98-4f3e-a356-4b3a208a6ab3', 'retention.analytics_days', 'Analytics retention', 'Analytics retention in days', 'integer', 'days', 'retention', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');


--
-- Data for Name: billing_plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plans (id, code, name, description, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('45fe1328-6fb2-4b91-9c30-fd51c3861027', 'ultra', 'Ultra', 'Complete business access', 'active', 'USD', 0, 30000, 0, 30, false, NULL, '2026-07-16 21:31:41.878112+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plans (id, code, name, description, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('367d0046-7d0b-4d78-a8d0-5c6ff3697603', 'pro', 'Pro', 'Advanced analytics management access', 'active', 'USD', 0, 20000, 0, 20, false, NULL, '2026-07-16 21:31:42.035711+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plans (id, code, name, description, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('58b3d358-35a8-42dc-8762-7179505f05d2', 'basic', 'Basic', 'Essential business access', 'active', 'USD', 0, 15000, 0, 10, true, NULL, '2026-07-16 21:31:41.878112+03', '2026-07-16 22:06:14.312012+03');


--
-- Data for Name: billing_subscription_plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_subscription_plans (id, code, name, description, permission_profile_id, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('9e00fefd-0eba-4d41-bebd-41091e1bbb98', 'ultra', 'Ultra', 'Complete business access', '45fe1328-6fb2-4b91-9c30-fd51c3861027', 'active', 'USD', 0, 30000, 0, 30, false, NULL, '2026-07-16 21:31:41.878112+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_subscription_plans (id, code, name, description, permission_profile_id, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('386ad055-892f-4055-a011-cfa5767148b8', 'pro', 'Pro', 'Advanced analytics management access', '367d0046-7d0b-4d78-a8d0-5c6ff3697603', 'active', 'USD', 0, 20000, 0, 20, false, NULL, '2026-07-16 21:31:42.035711+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_subscription_plans (id, code, name, description, permission_profile_id, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('e653f412-d965-4c8d-9ba5-aff6eaf70523', 'basic', 'Basic', 'Essential business access', '58b3d358-35a8-42dc-8762-7179505f05d2', 'active', 'USD', 0, 15000, 0, 10, true, NULL, '2026-07-16 21:31:41.878112+03', '2026-07-16 22:06:14.312012+03');


--
-- Data for Name: billing_plan_configurations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plan_configurations (id, plan_id, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '367d0046-7d0b-4d78-a8d0-5c6ff3697603', '2026-07-16 21:31:42.035711+03', '2026-07-16 21:31:42.063436+03');
INSERT INTO public.billing_plan_configurations (id, plan_id, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '58b3d358-35a8-42dc-8762-7179505f05d2', '2026-07-16 21:31:42.035711+03', '2026-07-16 21:31:42.063436+03');
INSERT INTO public.billing_plan_configurations (id, plan_id, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '45fe1328-6fb2-4b91-9c30-fd51c3861027', '2026-07-16 21:31:42.035711+03', '2026-07-16 21:31:42.063436+03');


--
-- Data for Name: billing_plan_entitlements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'a4da5bc4-110c-4fc9-b804-fe743ea6f372', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '0a5ce780-b980-4621-a91d-d182d0059f76', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'c5584929-d8fe-4123-bdf8-58ecc25181cf', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5ec6420c-1935-4e30-819d-85eba440b0a7', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'abdda73e-7602-4a6e-8f83-20261d575821', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '696aa1a2-8815-43c2-b407-598bd53db63c', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '53dfb3bf-cfc9-4189-9c7c-879fca9db420', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'bf2db4ff-f256-4fe8-9b8b-891b5feac367', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'fd265354-836b-4561-bae9-fda950a08d64', '-1', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '11716c27-03ec-4e0c-93f3-d6b6932a8dcb', '3', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'c296078e-89aa-4a70-88be-28058132772a', '12', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '137c4e87-1c93-48d5-9f64-8632a15d15ee', '-1', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '91fd0234-e4c2-4eb1-8238-f53c391cfba0', '3', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '76068746-ae98-4f3e-a356-4b3a208a6ab3', '-1', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'a4da5bc4-110c-4fc9-b804-fe743ea6f372', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '0a5ce780-b980-4621-a91d-d182d0059f76', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'c5584929-d8fe-4123-bdf8-58ecc25181cf', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5ec6420c-1935-4e30-819d-85eba440b0a7', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'abdda73e-7602-4a6e-8f83-20261d575821', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '696aa1a2-8815-43c2-b407-598bd53db63c', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '53dfb3bf-cfc9-4189-9c7c-879fca9db420', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'bf2db4ff-f256-4fe8-9b8b-891b5feac367', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'fd265354-836b-4561-bae9-fda950a08d64', '20', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '11716c27-03ec-4e0c-93f3-d6b6932a8dcb', '2', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'c296078e-89aa-4a70-88be-28058132772a', '11', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '137c4e87-1c93-48d5-9f64-8632a15d15ee', '365', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '91fd0234-e4c2-4eb1-8238-f53c391cfba0', '0', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '76068746-ae98-4f3e-a356-4b3a208a6ab3', '365', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'a4da5bc4-110c-4fc9-b804-fe743ea6f372', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '0a5ce780-b980-4621-a91d-d182d0059f76', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'c5584929-d8fe-4123-bdf8-58ecc25181cf', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5ec6420c-1935-4e30-819d-85eba440b0a7', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'abdda73e-7602-4a6e-8f83-20261d575821', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '696aa1a2-8815-43c2-b407-598bd53db63c', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '53dfb3bf-cfc9-4189-9c7c-879fca9db420', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'bf2db4ff-f256-4fe8-9b8b-891b5feac367', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'fd265354-836b-4561-bae9-fda950a08d64', '5', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '11716c27-03ec-4e0c-93f3-d6b6932a8dcb', '1', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'c296078e-89aa-4a70-88be-28058132772a', '7', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '137c4e87-1c93-48d5-9f64-8632a15d15ee', '30', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '91fd0234-e4c2-4eb1-8238-f53c391cfba0', '0', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '76068746-ae98-4f3e-a356-4b3a208a6ab3', '30', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');


--
-- Data for Name: billing_plan_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '70310224-28d9-471b-8dd6-56484148fee9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '127a91d9-093b-4e93-b0fa-d6d78f3e223a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'ab2b6074-fe5d-44ba-9c80-b23277878c91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '127a91d9-093b-4e93-b0fa-d6d78f3e223a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'ab2b6074-fe5d-44ba-9c80-b23277878c91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '127a91d9-093b-4e93-b0fa-d6d78f3e223a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'ab2b6074-fe5d-44ba-9c80-b23277878c91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5c47877c-aa54-4988-a569-46149ef10803', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5c47877c-aa54-4988-a569-46149ef10803', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '4e81f943-2177-43eb-ae9b-93359ea72b1a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '4da8ea76-7679-4d7b-9dcf-dc71dae83575', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'db78a685-cb71-40ad-b2d9-4ca6b2de62e4', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5ba6c5f9-12af-4573-9db6-990a74943aa0', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '071506c7-4c6d-46e2-bb8a-12ef55ae5ea6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '58bbca30-f652-42e2-857d-3f5082e87bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '3b044300-e0cc-45d3-8ff8-9db06386a794', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '84484813-6b91-4fa1-8f25-e579cc221d6c', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '6e795805-5513-4c2b-a29a-ea50d3d9bcbf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'a95b87eb-6585-45b8-9faf-2ca2c2505952', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '94bc7644-adfe-4eca-a9b0-094885900e30', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'ebea69bb-5bc5-454a-b9be-0c430e720e7d', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5a726536-4ae9-44d8-9451-b2b8a7d2b39f', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'c38a2902-fbc2-45fe-954d-891966da9bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '35912012-f370-4553-bdcb-f58c2222aa90', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'ef30a5a5-0216-434e-88c1-99083dc99ffe', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'd0c0394f-0980-4bf7-9037-df7da7f7ac91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '0bb2906e-a3c0-4c47-bea2-79e82a397dc6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5996eafa-998d-406f-979c-d8bdbf2630cf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '3ecb431e-1761-4ace-99f7-3aa0256c5edd', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'e071be85-e7ed-4011-ad4b-cef02a24c961', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '2cb3f841-e16b-49d9-bf30-68ba1fbabce1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '23a31232-63cc-4be1-843e-50f11f822cca', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '9def0e86-8469-494d-a5f8-1f5270aa42b1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'f65e5c47-08f4-43ec-807a-803136ee5665', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'dad8f57c-2fbb-4e55-86d2-e2dd687f00bf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-26 03:19:00+03', '2026-07-26 03:19:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '4e81f943-2177-43eb-ae9b-93359ea72b1a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '4da8ea76-7679-4d7b-9dcf-dc71dae83575', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'db78a685-cb71-40ad-b2d9-4ca6b2de62e4', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5ba6c5f9-12af-4573-9db6-990a74943aa0', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '071506c7-4c6d-46e2-bb8a-12ef55ae5ea6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '58bbca30-f652-42e2-857d-3f5082e87bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '3b044300-e0cc-45d3-8ff8-9db06386a794', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '84484813-6b91-4fa1-8f25-e579cc221d6c', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '6e795805-5513-4c2b-a29a-ea50d3d9bcbf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'a95b87eb-6585-45b8-9faf-2ca2c2505952', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '94bc7644-adfe-4eca-a9b0-094885900e30', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'ebea69bb-5bc5-454a-b9be-0c430e720e7d', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5a726536-4ae9-44d8-9451-b2b8a7d2b39f', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'c38a2902-fbc2-45fe-954d-891966da9bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '35912012-f370-4553-bdcb-f58c2222aa90', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'ef30a5a5-0216-434e-88c1-99083dc99ffe', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'd0c0394f-0980-4bf7-9037-df7da7f7ac91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '0bb2906e-a3c0-4c47-bea2-79e82a397dc6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5996eafa-998d-406f-979c-d8bdbf2630cf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '3ecb431e-1761-4ace-99f7-3aa0256c5edd', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'e071be85-e7ed-4011-ad4b-cef02a24c961', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '2cb3f841-e16b-49d9-bf30-68ba1fbabce1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '23a31232-63cc-4be1-843e-50f11f822cca', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '9def0e86-8469-494d-a5f8-1f5270aa42b1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'f65e5c47-08f4-43ec-807a-803136ee5665', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'dad8f57c-2fbb-4e55-86d2-e2dd687f00bf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-26 03:19:00+03', '2026-07-26 03:19:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'eeebdd59-e782-4fcc-92c1-a53dd1c9a1f7', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '0fc5f2d5-7251-4e74-8bb8-a0e3e9d05b4e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'da2a9e74-3f92-4d23-856d-90f54ce0b97e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5649b298-7825-4c82-aeb7-efb5f82111ba', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'eeebdd59-e782-4fcc-92c1-a53dd1c9a1f7', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '0fc5f2d5-7251-4e74-8bb8-a0e3e9d05b4e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'da2a9e74-3f92-4d23-856d-90f54ce0b97e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5649b298-7825-4c82-aeb7-efb5f82111ba', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '32246583-d06d-4e8a-b01a-4dddffd79e64', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'a3308ee2-44f8-4794-842f-707f8f5a7bfc', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '4da8ea76-7679-4d7b-9dcf-dc71dae83575', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'db78a685-cb71-40ad-b2d9-4ca6b2de62e4', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5ba6c5f9-12af-4573-9db6-990a74943aa0', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '071506c7-4c6d-46e2-bb8a-12ef55ae5ea6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'b5e9d58c-3c70-4f0a-9684-2ee2f20efc41', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '6e795805-5513-4c2b-a29a-ea50d3d9bcbf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'dc4467b8-45d0-4672-a1ae-962670c4ea10', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '4e81f943-2177-43eb-ae9b-93359ea72b1a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '4545c9eb-2fd0-441b-937e-21f1dea9bf51', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '2862c342-354e-4589-89ca-705720f8e082', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '58bbca30-f652-42e2-857d-3f5082e87bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '3b044300-e0cc-45d3-8ff8-9db06386a794', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '84484813-6b91-4fa1-8f25-e579cc221d6c', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'a95b87eb-6585-45b8-9faf-2ca2c2505952', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '94bc7644-adfe-4eca-a9b0-094885900e30', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'ebea69bb-5bc5-454a-b9be-0c430e720e7d', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5a726536-4ae9-44d8-9451-b2b8a7d2b39f', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'eeebdd59-e782-4fcc-92c1-a53dd1c9a1f7', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '0fc5f2d5-7251-4e74-8bb8-a0e3e9d05b4e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'da2a9e74-3f92-4d23-856d-90f54ce0b97e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5649b298-7825-4c82-aeb7-efb5f82111ba', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'e9bd236d-89c8-4984-9cab-b8a1c25a778c', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '1e1826ef-4180-47e8-8a56-b7c79d20c354', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'c38a2902-fbc2-45fe-954d-891966da9bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '35912012-f370-4553-bdcb-f58c2222aa90', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'ef30a5a5-0216-434e-88c1-99083dc99ffe', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'd0c0394f-0980-4bf7-9037-df7da7f7ac91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '0bb2906e-a3c0-4c47-bea2-79e82a397dc6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5996eafa-998d-406f-979c-d8bdbf2630cf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '3ecb431e-1761-4ace-99f7-3aa0256c5edd', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'e071be85-e7ed-4011-ad4b-cef02a24c961', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '2cb3f841-e16b-49d9-bf30-68ba1fbabce1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '23a31232-63cc-4be1-843e-50f11f822cca', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '9def0e86-8469-494d-a5f8-1f5270aa42b1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'f65e5c47-08f4-43ec-807a-803136ee5665', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '3b9d857f-e21e-4920-93ce-c42072db2a91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-26 03:19:00+03', '2026-07-26 03:19:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'dad8f57c-2fbb-4e55-86d2-e2dd687f00bf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '32246583-d06d-4e8a-b01a-4dddffd79e64', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'a3308ee2-44f8-4794-842f-707f8f5a7bfc', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '68c6ec50-aa2d-4865-bed5-205f62dd96ef', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'd22f67a9-e32c-4cda-9b7e-56474492775d', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');

-- Mini-website creation retains each plan's existing Linktree-create policy.
INSERT INTO public.billing_plan_permissions
  (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at)
SELECT rule.plan_configuration_id,
       '7a4e7b86-6d89-4ef6-982f-9f6c05a58f24'::uuid,
       rule.access_mode, rule.field_modes, rule.resource_scope,
       rule.conditions, '2026-08-01 00:00:00+03', '2026-08-01 00:00:00+03'
FROM public.billing_plan_permissions rule
WHERE rule.permission_id = '35912012-f370-4553-bdcb-f58c2222aa90';

-- The advertising page follows each plan's existing mini-website policy: a plan
-- that can open and manage mini websites can open and manage this page too.
-- Written set-based rather than as fixed pairs so it stays correct if the plan
-- configurations above are edited.
INSERT INTO public.billing_plan_permissions
  (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at)
SELECT rule.plan_configuration_id,
       granted.permission_id,
       rule.access_mode, rule.field_modes, rule.resource_scope,
       rule.conditions, '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_permissions rule
CROSS JOIN (VALUES
  ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f11'::uuid),
  ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f12'::uuid),
  ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f13'::uuid),
  ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f14'::uuid)
) AS granted(permission_id)
WHERE rule.permission_id = 'b5e9d58c-3c70-4f0a-9684-2ee2f20efc41';

-- Mini websites are an Ultra feature, but until now that was expressed only as
-- a dashboard permission, so a downgraded business kept its /bio pages online
-- with no way to edit or remove them. This entitlement is what the public read
-- checks; it is granted to exactly the plans that can manage mini websites.
INSERT INTO public.billing_plan_entitlements
  (plan_configuration_id, entitlement_id, value, created_at, updated_at)
SELECT rule.plan_configuration_id,
       'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f21'::uuid,
       'true', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_permissions rule
WHERE rule.permission_id = 'b5e9d58c-3c70-4f0a-9684-2ee2f20efc41';

-- Plans without it record an explicit false rather than a missing row, so the
-- billing screens show the feature as withheld instead of unknown.
INSERT INTO public.billing_plan_entitlements
  (plan_configuration_id, entitlement_id, value, created_at, updated_at)
SELECT cfg.id, 'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f21'::uuid,
       'false', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_configurations cfg
WHERE NOT EXISTS (
  SELECT 1 FROM public.billing_plan_entitlements existing
   WHERE existing.plan_configuration_id = cfg.id
     AND existing.entitlement_id = 'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f21'::uuid
);

-- The entitlement the three advertising permissions require, granted to the
-- same plans, so a plan that carries the permissions can actually use them.
INSERT INTO public.billing_plan_entitlements
  (plan_configuration_id, entitlement_id, value, created_at, updated_at)
SELECT rule.plan_configuration_id,
       'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f20'::uuid,
       'true', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_permissions rule
WHERE rule.permission_id = 'b5e9d58c-3c70-4f0a-9684-2ee2f20efc41';

-- Plans without it record an explicit false rather than a missing row, so the
-- billing screens show the feature as withheld instead of unknown — the same
-- treatment feature.mini_websites gets above.
INSERT INTO public.billing_plan_entitlements
  (plan_configuration_id, entitlement_id, value, created_at, updated_at)
SELECT cfg.id, 'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f20'::uuid,
       'false', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_configurations cfg
WHERE NOT EXISTS (
  SELECT 1 FROM public.billing_plan_entitlements existing
   WHERE existing.plan_configuration_id = cfg.id
     AND existing.entitlement_id = 'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f20'::uuid
);


--
-- Data for Name: billing_plan_templates; Type: TABLE DATA; Schema: public; Owner: -
--

-- Linktree keys are the post-rename ones (2026-08-12_rename_linktree_templates.sql);
-- hero-image and dark-card were retired by 2026-08-11_remove_hero_image_dark_card_templates.sql.
-- liquid-glass is granted to every active plan, and is the only surviving
-- mini-website template after 2026-08-18_retire_soft_horizon_mini_website_template.sql.
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'spectrum', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'spotlight', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'frost', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'aurora', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'serenity', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'liquid-glass', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'spectrum', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'spotlight', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'frost', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'aurora', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'serenity', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'liquid-glass', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'spectrum', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'spotlight', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'liquid-glass', '2026-07-16 22:06:14.312012+03');


--
-- Data for Name: billing_policy_audit_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: billing_usage_counters; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_branding; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_defaults; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_profile_change_requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_tiktok_pixels; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: http_request_event_daily_stats; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: http_request_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: linktrees; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: permission_approval_requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_permission_denies; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: security_audit_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_admin_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_admins; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: template_global_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: whatsapp_questions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: http_request_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.http_request_events_id_seq', 1, false);


--
-- Name: security_audit_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.security_audit_events_id_seq', 1, false);


--
-- Derived catalog rows
--
-- Computed from the rows above rather than written out, so a plan's API
-- entitlements follow its code instead of being restated per configuration.
-- It has to run after `billing_plan_configurations`, `billing_plans` and
-- `billing_entitlements` are loaded, which is why it lives here and not beside
-- the API tables in `full_schema.sql`.
--

INSERT INTO public.billing_plan_entitlements(plan_configuration_id, entitlement_id, value)
SELECT configuration.id, entitlement.id,
       CASE entitlement.entitlement_key
         WHEN 'feature.api_access' THEN to_jsonb(plan.code IN ('pro','ultra'))
         WHEN 'feature.webhooks' THEN to_jsonb(plan.code IN ('pro','ultra'))
         WHEN 'limit.api_requests_monthly' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 200000 WHEN 'pro' THEN 50000 ELSE 0 END)
         WHEN 'limit.api_clients' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 10 WHEN 'pro' THEN 3 ELSE 0 END)
         WHEN 'limit.webhook_endpoints' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 10 WHEN 'pro' THEN 3 ELSE 0 END)
       END
FROM public.billing_plan_configurations configuration
JOIN public.billing_plans plan ON plan.id=configuration.plan_id
CROSS JOIN public.billing_entitlements entitlement
WHERE entitlement.entitlement_key IN ('feature.api_access','feature.webhooks','limit.api_requests_monthly','limit.api_clients','limit.webhook_endpoints')
ON CONFLICT (plan_configuration_id, entitlement_id) DO NOTHING;

-- The one non-customer workspace that owns MultiTree root-domain content.
INSERT INTO public.businesses (
  id, username, name, email, phone, subdomain, status, plan, max_linktrees,
  account_type, onboarding_step, onboarding_version, onboarding_completed_at
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'multitree-platform',
  'MultiTree',
  NULL,
  NULL,
  'multitree-platform',
  'active',
  'enterprise',
  32767,
  'platform',
  3,
  '2026-08',
  NOW()
);

INSERT INTO public.business_branding (
  business_id, logo, favicon, default_avatar, website_color
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  '/images/multitree-logo-mark.png',
  '/favicon.ico',
  '/images/multitree-logo-mark.png',
  '#b6f20d'
);

INSERT INTO public.business_defaults (
  business_id, footer_text, footer_phone, template_key, background_color,
  footer_hidden, whatsapp_enabled
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'MultiTree',
  NULL,
  'spectrum',
  '#ffffff',
  false,
  false
);

-- Capabilities introduced with the platform-content and Creator domains.
INSERT INTO public.auth_permissions (
  permission_key, category, resource, action, description, risk_level,
  display_order, supports_approval, status
) VALUES
  ('platform:settings:tiktok-read', 'Platform settings', 'platform.settings',
   'tiktok-read', 'View platform TikTok Pixel and Events API configuration',
   'sensitive', 728, false, 'active'),
  ('platform:settings:tiktok-update', 'Platform settings', 'platform.settings',
   'tiktok-update', 'Manage platform TikTok Pixel and Events API configuration',
   'critical', 729, false, 'active'),
  ('platform:linktrees:read', 'Platform Linktrees', 'platform.linktrees', 'read',
   'View MultiTree root-domain Linktrees', 'standard', 772, false, 'active'),
  ('platform:linktrees:create', 'Platform Linktrees', 'platform.linktrees', 'create',
   'Create MultiTree root-domain Linktrees', 'sensitive', 773, false, 'active'),
  ('platform:linktrees:update', 'Platform Linktrees', 'platform.linktrees', 'update',
   'Update MultiTree root-domain Linktrees', 'sensitive', 774, false, 'active'),
  ('platform:linktrees:delete', 'Platform Linktrees', 'platform.linktrees', 'delete',
   'Delete MultiTree root-domain Linktrees', 'critical', 775, false, 'active'),
  ('platform:linktrees:upload', 'Platform Linktrees', 'platform.linktrees', 'upload',
   'Upload assets for MultiTree root-domain Linktrees', 'sensitive', 776, false, 'active'),
  ('platform:mini-websites:read', 'Platform Mini Websites', 'platform.mini-websites', 'read',
   'View MultiTree root-domain mini websites', 'standard', 777, false, 'active'),
  ('platform:mini-websites:create', 'Platform Mini Websites', 'platform.mini-websites', 'create',
   'Create MultiTree root-domain mini websites', 'sensitive', 778, false, 'active'),
  ('platform:mini-websites:update', 'Platform Mini Websites', 'platform.mini-websites', 'update',
   'Update MultiTree root-domain mini websites', 'sensitive', 779, false, 'active'),
  ('platform:mini-websites:delete', 'Platform Mini Websites', 'platform.mini-websites', 'delete',
   'Delete MultiTree root-domain mini websites or their analytics', 'critical', 780, false, 'active'),
  ('platform:mini-websites:upload', 'Platform Mini Websites', 'platform.mini-websites', 'upload',
   'Upload assets for MultiTree root-domain mini websites', 'sensitive', 781, false, 'active'),
  ('platform:creators:read', 'Creator administration', 'platform.creators', 'read',
   'View self-service Creator accounts and their trial state', 'standard', 782, false, 'active'),
  ('platform:creators:manage', 'Creator administration', 'platform.creators', 'manage',
   'Suspend, reactivate, extend, or activate Creator accounts', 'critical', 783, false, 'active');
