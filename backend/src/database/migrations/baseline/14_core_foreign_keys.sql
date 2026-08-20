--
-- 14_core_foreign_keys.sql
--
-- Foreign keys for the core tables, after every table they reference.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- Name: access_rules access_rules_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_rules
    ADD CONSTRAINT access_rules_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: access_rules access_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_rules
    ADD CONSTRAINT access_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.platform_admins(id) ON DELETE SET NULL;


--
-- Name: access_rules access_rules_linktree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_rules
    ADD CONSTRAINT access_rules_linktree_id_fkey FOREIGN KEY (linktree_id) REFERENCES public.linktrees(id) ON DELETE CASCADE;


--
-- Name: billing_plan_configurations billing_plan_configurations_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_configurations
    ADD CONSTRAINT billing_plan_configurations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.billing_plans(id) ON DELETE CASCADE;


--
-- Name: billing_plan_entitlements billing_plan_entitlements_entitlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_entitlements
    ADD CONSTRAINT billing_plan_entitlements_entitlement_id_fkey FOREIGN KEY (entitlement_id) REFERENCES public.billing_entitlements(id) ON DELETE RESTRICT;


--
-- Name: billing_plan_entitlements billing_plan_entitlements_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_entitlements
    ADD CONSTRAINT billing_plan_entitlements_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE CASCADE;


--
-- Name: billing_plan_permissions billing_plan_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_permissions
    ADD CONSTRAINT billing_plan_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.auth_permissions(id) ON DELETE RESTRICT;


--
-- Name: billing_plan_permissions billing_plan_permissions_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_permissions
    ADD CONSTRAINT billing_plan_permissions_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE CASCADE;


--
-- Name: billing_plan_templates billing_plan_templates_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_templates
    ADD CONSTRAINT billing_plan_templates_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE CASCADE;


--
-- Name: billing_policy_audit_events billing_policy_audit_events_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_policy_audit_events
    ADD CONSTRAINT billing_policy_audit_events_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- Name: billing_policy_audit_events billing_policy_audit_events_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_policy_audit_events
    ADD CONSTRAINT billing_policy_audit_events_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE SET NULL;


--
-- Name: billing_policy_audit_events billing_policy_audit_events_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_policy_audit_events
    ADD CONSTRAINT billing_policy_audit_events_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.billing_plans(id) ON DELETE SET NULL;


--
-- Name: billing_subscription_plans billing_subscription_plans_permission_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_subscription_plans
    ADD CONSTRAINT billing_subscription_plans_permission_profile_id_fkey FOREIGN KEY (permission_profile_id) REFERENCES public.billing_plans(id) ON DELETE RESTRICT;


--
-- Name: billing_usage_counters billing_usage_counters_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_usage_counters
    ADD CONSTRAINT billing_usage_counters_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_branding business_branding_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_branding
    ADD CONSTRAINT business_branding_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_defaults business_defaults_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_defaults
    ADD CONSTRAINT business_defaults_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_profile_change_requests business_profile_change_requests_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profile_change_requests
    ADD CONSTRAINT business_profile_change_requests_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_sessions business_sessions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_subscriptions business_subscriptions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_subscriptions business_subscriptions_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE RESTRICT;


--
-- Name: business_subscriptions business_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.billing_plans(id) ON DELETE RESTRICT;


--
-- Name: business_subscriptions business_subscriptions_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.billing_subscription_plans(id) ON DELETE RESTRICT;


--
-- Name: business_tiktok_pixels business_tiktok_pixels_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_tiktok_pixels
    ADD CONSTRAINT business_tiktok_pixels_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: links fk_links_linktree_business; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT fk_links_linktree_business FOREIGN KEY (linktree_id, business_id) REFERENCES public.linktrees(id, business_id) ON DELETE CASCADE;


--
-- Name: http_request_events http_request_events_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_request_events
    ADD CONSTRAINT http_request_events_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- Name: links links_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: links links_linktree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_linktree_id_fkey FOREIGN KEY (linktree_id) REFERENCES public.linktrees(id) ON DELETE CASCADE;


--
-- Name: linktrees linktrees_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT linktrees_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: permission_approval_requests permission_approval_requests_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_approval_requests
    ADD CONSTRAINT permission_approval_requests_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: permission_approval_requests permission_approval_requests_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_approval_requests
    ADD CONSTRAINT permission_approval_requests_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.auth_permissions(id) ON DELETE RESTRICT;


--
-- Name: platform_permission_denies platform_permission_denies_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_permission_denies
    ADD CONSTRAINT platform_permission_denies_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: platform_permission_denies platform_permission_denies_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_permission_denies
    ADD CONSTRAINT platform_permission_denies_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.auth_permissions(id) ON DELETE CASCADE;


--
-- Name: security_audit_events security_audit_events_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_events
    ADD CONSTRAINT security_audit_events_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- Name: platform_admin_sessions platform_admin_sessions_platform_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admin_sessions
    ADD CONSTRAINT platform_admin_sessions_platform_admin_id_fkey FOREIGN KEY (platform_admin_id) REFERENCES public.platform_admins(id) ON DELETE CASCADE;


--
-- Name: whatsapp_questions whatsapp_questions_linktree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_questions
    ADD CONSTRAINT whatsapp_questions_linktree_id_fkey FOREIGN KEY (linktree_id) REFERENCES public.linktrees(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

