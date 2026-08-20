--
-- 11_core_constraints.sql
--
-- Primary keys and unique constraints for the core tables.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- Name: access_rules access_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_rules
    ADD CONSTRAINT access_rules_pkey PRIMARY KEY (id);


--
-- Name: auth_permissions auth_permissions_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions
    ADD CONSTRAINT auth_permissions_permission_key_key UNIQUE (permission_key);


--
-- Name: auth_permissions auth_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions
    ADD CONSTRAINT auth_permissions_pkey PRIMARY KEY (id);


--
-- Name: billing_entitlements billing_entitlements_entitlement_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entitlements
    ADD CONSTRAINT billing_entitlements_entitlement_key_key UNIQUE (entitlement_key);


--
-- Name: billing_entitlements billing_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entitlements
    ADD CONSTRAINT billing_entitlements_pkey PRIMARY KEY (id);


--
-- Name: billing_plan_configurations billing_plan_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_configurations
    ADD CONSTRAINT billing_plan_configurations_pkey PRIMARY KEY (id);


--
-- Name: billing_plan_entitlements billing_plan_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_entitlements
    ADD CONSTRAINT billing_plan_entitlements_pkey PRIMARY KEY (plan_configuration_id, entitlement_id);


--
-- Name: billing_plan_permissions billing_plan_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_permissions
    ADD CONSTRAINT billing_plan_permissions_pkey PRIMARY KEY (plan_configuration_id, permission_id);


--
-- Name: billing_plan_templates billing_plan_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_templates
    ADD CONSTRAINT billing_plan_templates_pkey PRIMARY KEY (plan_configuration_id, template_key);


--
-- Name: billing_plans billing_plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plans
    ADD CONSTRAINT billing_plans_code_key UNIQUE (code);


--
-- Name: billing_plans billing_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plans
    ADD CONSTRAINT billing_plans_pkey PRIMARY KEY (id);


--
-- Name: billing_policy_audit_events billing_policy_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_policy_audit_events
    ADD CONSTRAINT billing_policy_audit_events_pkey PRIMARY KEY (id);


--
-- Name: billing_subscription_plans billing_subscription_plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_subscription_plans
    ADD CONSTRAINT billing_subscription_plans_code_key UNIQUE (code);


--
-- Name: billing_subscription_plans billing_subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_subscription_plans
    ADD CONSTRAINT billing_subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: billing_usage_counters billing_usage_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_usage_counters
    ADD CONSTRAINT billing_usage_counters_pkey PRIMARY KEY (business_id, entitlement_key, period_start);


--
-- Name: business_branding business_branding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_branding
    ADD CONSTRAINT business_branding_pkey PRIMARY KEY (business_id);


--
-- Name: business_defaults business_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_defaults
    ADD CONSTRAINT business_defaults_pkey PRIMARY KEY (business_id);


--
-- Name: business_profile_change_requests business_profile_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profile_change_requests
    ADD CONSTRAINT business_profile_change_requests_pkey PRIMARY KEY (business_id);


--
-- Name: business_sessions business_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_pkey PRIMARY KEY (id);


--
-- Name: business_sessions business_sessions_session_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_session_token_hash_key UNIQUE (session_token_hash);


--
-- Name: business_subscriptions business_subscriptions_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_business_id_key UNIQUE (business_id);


--
-- Name: business_subscriptions business_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: business_tiktok_pixels business_tiktok_pixels_business_id_pixel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_tiktok_pixels
    ADD CONSTRAINT business_tiktok_pixels_business_id_pixel_id_key UNIQUE (business_id, pixel_id);


--
-- Name: business_tiktok_pixels business_tiktok_pixels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_tiktok_pixels
    ADD CONSTRAINT business_tiktok_pixels_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_subdomain_key UNIQUE (subdomain);


--
-- Name: businesses businesses_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_username_key UNIQUE (username);


--
-- Name: http_request_event_daily_stats http_request_event_daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_request_event_daily_stats
    ADD CONSTRAINT http_request_event_daily_stats_pkey PRIMARY KEY (event_day, source, method, actor_type, outcome);


--
-- Name: http_request_events http_request_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_request_events
    ADD CONSTRAINT http_request_events_pkey PRIMARY KEY (id);


--
-- Name: links links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- Name: linktrees linktrees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT linktrees_pkey PRIMARY KEY (id);


--
-- Name: permission_approval_requests permission_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_approval_requests
    ADD CONSTRAINT permission_approval_requests_pkey PRIMARY KEY (id);


--
-- Name: platform_permission_denies platform_permission_denies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_permission_denies
    ADD CONSTRAINT platform_permission_denies_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.schema_migrations'::regclass
          AND contype = 'p'
    ) THEN
        ALTER TABLE ONLY public.schema_migrations
            ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);
    END IF;
END
$$;


--
-- Name: security_audit_events security_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_events
    ADD CONSTRAINT security_audit_events_pkey PRIMARY KEY (id);


--
-- Name: platform_admin_sessions platform_admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admin_sessions
    ADD CONSTRAINT platform_admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: platform_admin_sessions platform_admin_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admin_sessions
    ADD CONSTRAINT platform_admin_sessions_session_token_key UNIQUE (session_token);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_username_key UNIQUE (username);


--
-- Name: template_global_settings template_global_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_global_settings
    ADD CONSTRAINT template_global_settings_pkey PRIMARY KEY (template_key);


--
-- Name: links uq_links_id_linktree_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT uq_links_id_linktree_business UNIQUE (id, linktree_id, business_id);


--
-- Name: linktrees uq_linktrees_id_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT uq_linktrees_id_business UNIQUE (id, business_id);


--
-- Name: linktrees uq_linktrees_seo_name_per_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT uq_linktrees_seo_name_per_business UNIQUE (business_id, seo_name);


--
-- Name: linktrees uq_linktrees_uid_per_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT uq_linktrees_uid_per_business UNIQUE (business_id, uid);


--
-- Name: whatsapp_questions whatsapp_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_questions
    ADD CONSTRAINT whatsapp_questions_pkey PRIMARY KEY (id);


