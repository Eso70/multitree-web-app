--
-- 12_core_indexes.sql
--
-- Indexes for the core tables.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- Name: idx_access_rules_effect_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_rules_effect_status ON public.access_rules USING btree (effect, status, created_at DESC);


--
-- Name: idx_access_rules_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_rules_expiry ON public.access_rules USING btree (expires_at) WHERE (((status)::text = 'active'::text) AND (expires_at IS NOT NULL));


--
-- Name: idx_access_rules_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_rules_network ON public.access_rules USING gist (ip_network inet_ops) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_access_rules_scope_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_rules_scope_target ON public.access_rules USING btree (scope, business_id, linktree_id) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_billing_plans_status_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_plans_status_order ON public.billing_plans USING btree (status, display_order, name);


--
-- Name: idx_billing_subscription_plans_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_subscription_plans_profile ON public.billing_subscription_plans USING btree (permission_profile_id, status);


--
-- Name: idx_billing_subscription_plans_status_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_subscription_plans_status_order ON public.billing_subscription_plans USING btree (status, display_order, name);


--
-- Name: idx_billing_usage_counters_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_usage_counters_period ON public.billing_usage_counters USING btree (entitlement_key, period_end);


--
-- Name: idx_business_profile_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_profile_requests_status ON public.business_profile_change_requests USING btree (status, requested_at DESC);


--
-- Name: idx_business_sessions_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_sessions_business_id ON public.business_sessions USING btree (business_id);


--
-- Name: idx_business_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_sessions_token ON public.business_sessions USING btree (session_token_hash, session_expires_at DESC);


--
-- Name: idx_business_subscriptions_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_subscriptions_plan ON public.business_subscriptions USING btree (plan_id, status);


--
-- Name: idx_business_subscriptions_status_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_subscriptions_status_period ON public.business_subscriptions USING btree (status, current_period_end);


--
-- Name: idx_business_subscriptions_subscription_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_subscriptions_subscription_plan ON public.business_subscriptions USING btree (subscription_plan_id, status);


--
-- Name: idx_business_tiktok_pixels_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_tiktok_pixels_order ON public.business_tiktok_pixels USING btree (business_id, status, display_order, created_at);


--
-- Name: idx_businesses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_status ON public.businesses USING btree (status);


--
-- Name: idx_businesses_subdomain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_subdomain ON public.businesses USING btree (subdomain) WHERE (subdomain IS NOT NULL);


--
-- Name: idx_businesses_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_username ON public.businesses USING btree (username);

CREATE UNIQUE INDEX uq_businesses_one_platform_workspace
  ON public.businesses (account_type)
  WHERE account_type = 'platform';


--
-- Name: idx_http_request_activity_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_activity_search ON public.http_request_events USING gin ((((((((((((COALESCE(('http.'::text || lower((method)::text)), ''::text) || ' '::text) || (COALESCE(actor_label, ''::character varying))::text) || ' '::text) || (COALESCE(route_pattern, ''::character varying))::text) || ' '::text) || (COALESCE(request_path, ''::character varying))::text) || ' '::text) || COALESCE(host(ip_address), ''::text)) || ' '::text) || (COALESCE(request_id, ''::character varying))::text)) public.gin_trgm_ops);


--
-- Name: idx_http_request_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_actor ON public.http_request_events USING btree (actor_type, actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_http_request_actor_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_actor_type_time ON public.http_request_events USING btree (actor_type, created_at DESC, id DESC);


--
-- Name: idx_http_request_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_business ON public.http_request_events USING btree (business_id, created_at DESC) WHERE (business_id IS NOT NULL);


--
-- Name: idx_http_request_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_created_at ON public.http_request_events USING btree (created_at DESC, id DESC);


--
-- Name: idx_http_request_duration_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_duration_time ON public.http_request_events USING btree (duration_ms DESC, created_at DESC, id DESC) WHERE (duration_ms IS NOT NULL);


--
-- Name: idx_http_request_ingestion_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_http_request_ingestion_key ON public.http_request_events USING btree (ingestion_key) WHERE (ingestion_key IS NOT NULL);


--
-- Name: idx_http_request_method_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_method_time ON public.http_request_events USING btree (method, created_at DESC, id DESC);


--
-- Name: idx_http_request_outcome_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_outcome_time ON public.http_request_events USING btree ((
CASE
    WHEN (status_code = ANY (ARRAY[401, 403])) THEN 'denied'::text
    WHEN (status_code >= 400) THEN 'failure'::text
    ELSE 'success'::text
END), created_at DESC, id DESC);


--
-- Name: idx_http_request_path_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_path_time ON public.http_request_events USING btree (request_path, created_at DESC, id DESC);


--
-- Name: idx_http_request_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_request_id ON public.http_request_events USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_http_request_route_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_route_status ON public.http_request_events USING btree (route_pattern, status_code, created_at DESC);


--
-- Name: idx_http_request_source_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_source_time ON public.http_request_events USING btree (source, created_at DESC, id DESC);


--
-- Name: idx_http_request_status_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_status_time ON public.http_request_events USING btree (status_code, created_at DESC, id DESC) WHERE (status_code IS NOT NULL);


--
-- Name: idx_links_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_business_id ON public.links USING btree (business_id);


--
-- Name: idx_links_linktree_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_linktree_order ON public.links USING btree (linktree_id, display_order);


--
-- Name: idx_linktrees_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_business_id ON public.linktrees USING btree (business_id);


--
-- Name: idx_linktrees_business_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_business_status ON public.linktrees USING btree (business_id, status);


--
-- Name: idx_linktrees_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_created_at ON public.linktrees USING btree (created_at DESC);


--
-- Name: idx_linktrees_seo_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_seo_name ON public.linktrees USING btree (business_id, seo_name);


--
-- Name: idx_linktrees_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_uid ON public.linktrees USING btree (business_id, uid);


--
-- Name: idx_permission_approvals_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_approvals_business ON public.permission_approval_requests USING btree (business_id, status, requested_at DESC);


--
-- Name: idx_permission_approvals_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_approvals_pending ON public.permission_approval_requests USING btree (requested_at, expires_at, business_id) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_plan_entitlements_entitlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_entitlements_entitlement ON public.billing_plan_entitlements USING btree (entitlement_id, plan_configuration_id);


--
-- Name: idx_plan_permissions_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_permissions_permission ON public.billing_plan_permissions USING btree (permission_id, plan_configuration_id);


--
-- Name: idx_platform_permission_denies_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_permission_denies_match ON public.platform_permission_denies USING btree (permission_id, business_id, expires_at);


--
-- Name: idx_platform_admin_sessions_platform_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_admin_sessions_platform_admin_id ON public.platform_admin_sessions USING btree (platform_admin_id);


--
-- Name: idx_platform_admin_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_admin_sessions_token ON public.platform_admin_sessions USING btree (session_token, session_expires_at DESC);


--
-- Name: idx_security_audit_activity_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_activity_search ON public.security_audit_events USING gin (((((((((((((COALESCE(event_type, ''::character varying))::text || ' '::text) || (COALESCE(actor_label, ''::character varying))::text) || ' '::text) || (COALESCE(resource_label, ''::character varying))::text) || ' '::text) || (COALESCE(resource_id, ''::character varying))::text) || ' '::text) || COALESCE(host(ip_address), ''::text)) || ' '::text) || (COALESCE(request_id, ''::character varying))::text)) public.gin_trgm_ops);


--
-- Name: idx_security_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_actor ON public.security_audit_events USING btree (actor_type, actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_security_audit_actor_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_actor_type_time ON public.security_audit_events USING btree (actor_type, created_at DESC, id DESC);


--
-- Name: idx_security_audit_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_business ON public.security_audit_events USING btree (business_id, created_at DESC) WHERE (business_id IS NOT NULL);


--
-- Name: idx_security_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_created_at ON public.security_audit_events USING btree (created_at DESC);


--
-- Name: idx_security_audit_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_event ON public.security_audit_events USING btree (event_type, outcome, created_at DESC);


--
-- Name: idx_security_audit_outcome_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_outcome_time ON public.security_audit_events USING btree (outcome, created_at DESC, id DESC);


--
-- Name: idx_security_audit_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_request ON public.security_audit_events USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_security_audit_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_resource ON public.security_audit_events USING btree (resource_type, resource_id, created_at DESC) WHERE (resource_type IS NOT NULL);


--
-- Name: idx_wq_linktree_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wq_linktree_id ON public.whatsapp_questions USING btree (linktree_id, display_order);


--
-- Name: uq_billing_one_default_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_one_default_plan ON public.billing_plans USING btree (is_default) WHERE ((is_default = true) AND ((status)::text = 'active'::text));


--
-- Name: uq_billing_one_default_subscription_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_one_default_subscription_plan ON public.billing_subscription_plans USING btree (is_default) WHERE ((is_default = true) AND ((status)::text = 'active'::text));


--
-- Name: uq_billing_plan_configurations_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_plan_configurations_plan ON public.billing_plan_configurations USING btree (plan_id);


--
-- Name: uq_billing_plans_name_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_plans_name_ci ON public.billing_plans USING btree (lower(btrim((name)::text)));


--
-- Name: uq_billing_subscription_plans_name_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_subscription_plans_name_ci ON public.billing_subscription_plans USING btree (lower(btrim((name)::text)));


--
-- Name: uq_business_subscription_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_business_subscription_provider ON public.business_subscriptions USING btree (provider, provider_subscription_id) WHERE (provider_subscription_id IS NOT NULL);


--
-- Name: uq_linktrees_one_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_linktrees_one_default ON public.linktrees USING btree (business_id) WHERE (is_default = true);

