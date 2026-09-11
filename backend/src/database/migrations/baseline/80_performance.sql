--
-- 80_performance.sql
--
-- Indexes for otherwise-unindexed foreign keys, plus per-table storage tuning.
--
-- Part of the Sponsor.krd baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

-- ============================================================================
-- PERFORMANCE AND SCALE BASELINE
-- Indexes for every foreign-key column that would otherwise be unindexed,
-- plus per-table storage tuning for high-churn event tables and hot-update
-- rollup/counter tables. Consolidated from the performance scale migrations.
-- ============================================================================

CREATE INDEX idx_access_rules_created_by ON public.access_rules (created_by);
CREATE INDEX idx_billing_policy_audit_business ON public.billing_policy_audit_events (business_id);
CREATE INDEX idx_billing_policy_audit_plan_config ON public.billing_policy_audit_events (plan_configuration_id);
CREATE INDEX idx_billing_policy_audit_plan ON public.billing_policy_audit_events (plan_id);
CREATE INDEX idx_business_subscriptions_plan_config ON public.business_subscriptions (plan_configuration_id);
CREATE INDEX idx_permission_approvals_permission ON public.permission_approval_requests (permission_id);
CREATE INDEX idx_communication_announcements_created_by ON public.communication_announcements (created_by);
CREATE INDEX idx_communication_announcements_published_by ON public.communication_announcements (published_by);
CREATE INDEX idx_communication_conversations_assigned_admin ON public.communication_conversations (assigned_admin_id);
CREATE INDEX idx_communication_messages_sender_admin ON public.communication_messages (sender_admin_id);
CREATE INDEX idx_communication_messages_sender_business ON public.communication_messages (sender_business_id);
CREATE INDEX idx_platform_retention_settings_updated_by ON public.platform_data_retention_settings (updated_by);
CREATE INDEX idx_platform_retention_runs_triggered_by ON public.platform_data_retention_runs (triggered_by);
CREATE INDEX idx_platform_media_settings_updated_by ON public.platform_media_settings (updated_by);
CREATE INDEX idx_analytics_visitors_first_page ON public.analytics_visitors (first_public_page_id);
CREATE INDEX idx_analytics_sessions_visitor ON public.analytics_sessions (visitor_id);
CREATE INDEX idx_analytics_action_daily_business ON public.analytics_action_daily (business_id);
-- High-churn event tables: default autovacuum triggers at 20% dead tuples;
-- trigger at 2-5% instead so retention deletes and delivery retries never
-- bloat the tables. Hot-update rollup/counter/session tables get
-- fillfactor < 100 so frequent UPSERTs stay HOT and avoid index churn.
DO $$
DECLARE
  churn_table text;
  hot_table text;
BEGIN
  FOREACH churn_table IN ARRAY ARRAY[
    'public.analytics_events', 'public.marketing_event_outbox'
  ] LOOP
    IF to_regclass(churn_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02)', churn_table);
    END IF;
  END LOOP;

  FOREACH hot_table IN ARRAY ARRAY[
    'public.billing_usage_counters', 'public.analytics_page_daily',
    'public.analytics_action_daily',
    'public.analytics_visitors',
    'public.analytics_sessions', 'public.business_sessions',
    'public.platform_admin_sessions'
  ] LOOP
    IF to_regclass(hot_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s SET (fillfactor = 90, autovacuum_vacuum_scale_factor = 0.05)', hot_table);
    END IF;
  END LOOP;
END $$;
