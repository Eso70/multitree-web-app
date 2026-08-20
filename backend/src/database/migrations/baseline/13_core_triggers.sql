--
-- 13_core_triggers.sql
--
-- Triggers for the core tables.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- Name: access_rules trg_access_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_access_rules_updated_at BEFORE UPDATE ON public.access_rules FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: auth_permissions trg_auth_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auth_permissions_updated_at BEFORE UPDATE ON public.auth_permissions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_entitlements trg_billing_entitlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_entitlements_updated_at BEFORE UPDATE ON public.billing_entitlements FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_plan_configurations trg_billing_plan_configurations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_plan_configurations_updated_at BEFORE UPDATE ON public.billing_plan_configurations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_plans trg_billing_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_plans_updated_at BEFORE UPDATE ON public.billing_plans FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_policy_audit_events trg_billing_policy_audit_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_policy_audit_immutable BEFORE DELETE OR UPDATE ON public.billing_policy_audit_events FOR EACH ROW EXECUTE FUNCTION public.fn_reject_billing_policy_audit_mutation();


--
-- Name: billing_subscription_plans trg_billing_subscription_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_subscription_plans_updated_at BEFORE UPDATE ON public.billing_subscription_plans FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: business_branding trg_business_branding_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_branding_updated_at BEFORE UPDATE ON public.business_branding FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: businesses trg_business_default_subscription; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_default_subscription AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_assign_default_subscription();


--
-- Name: business_defaults trg_business_defaults_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_defaults_updated_at BEFORE UPDATE ON public.business_defaults FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: business_subscriptions trg_business_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_subscriptions_updated_at BEFORE UPDATE ON public.business_subscriptions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: business_tiktok_pixels trg_business_tiktok_pixels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_tiktok_pixels_updated_at BEFORE UPDATE ON public.business_tiktok_pixels FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: businesses trg_businesses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: links trg_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_links_updated_at BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: linktrees trg_linktrees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_linktrees_updated_at BEFORE UPDATE ON public.linktrees FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_plan_entitlements trg_plan_entitlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plan_entitlements_updated_at BEFORE UPDATE ON public.billing_plan_entitlements FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_plan_permissions trg_plan_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plan_permissions_updated_at BEFORE UPDATE ON public.billing_plan_permissions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: links trg_reorder_links; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reorder_links AFTER DELETE ON public.links FOR EACH ROW EXECUTE FUNCTION public.fn_reorder_links_after_delete();


--
-- Name: platform_admins trg_platform_admins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_admins_updated_at BEFORE UPDATE ON public.platform_admins FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: whatsapp_questions trg_whatsapp_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_whatsapp_questions_updated_at BEFORE UPDATE ON public.whatsapp_questions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


