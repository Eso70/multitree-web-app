--
-- 01_functions.sql
--
-- Shared PL/pgSQL functions, including the updated_at trigger function.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- Name: fn_assign_default_subscription(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_assign_default_subscription() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  default_subscription_plan_id UUID;
  default_permission_profile_id UUID;
  default_configuration_id UUID;
  default_trial_days SMALLINT;
BEGIN
  IF NEW.account_type <> 'business' THEN
    RETURN NEW;
  END IF;

  SELECT
    subscription_plan.id,
    subscription_plan.permission_profile_id,
    subscription_plan.trial_days
  INTO
    default_subscription_plan_id,
    default_permission_profile_id,
    default_trial_days
  FROM billing_subscription_plans subscription_plan
  WHERE subscription_plan.is_default = TRUE
    AND subscription_plan.status = 'active'
  LIMIT 1;

  SELECT configuration.id
  INTO default_configuration_id
  FROM billing_plan_configurations configuration
  WHERE configuration.plan_id = default_permission_profile_id
  LIMIT 1;

  IF default_subscription_plan_id IS NOT NULL
     AND default_permission_profile_id IS NOT NULL
     AND default_configuration_id IS NOT NULL THEN
    INSERT INTO business_subscriptions
      (business_id, subscription_plan_id, plan_id, plan_configuration_id,
       status, billing_cycle, current_period_end)
    VALUES
      (NEW.id, default_subscription_plan_id, default_permission_profile_id,
       default_configuration_id,
       CASE WHEN default_trial_days > 0 THEN 'trialing' ELSE 'active' END,
       CASE WHEN default_trial_days > 0 THEN 'free' ELSE 'monthly' END,
       CASE
         WHEN default_trial_days > 0
           THEN NOW() + make_interval(days => default_trial_days)
         ELSE NULL
       END)
    ON CONFLICT (business_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_reject_billing_policy_audit_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_reject_billing_policy_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'billing policy audit events are immutable';
END;
$$;


--
-- Name: fn_reorder_links_after_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_reorder_links_after_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE links
  SET display_order = display_order - 1
  WHERE linktree_id = OLD.linktree_id
    AND display_order > OLD.display_order;
  RETURN OLD;
END;
$$;


--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: get_next_display_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_display_order(p_linktree_id uuid) RETURNS smallint
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN (SELECT COALESCE(MAX(display_order), -1) + 1
          FROM links WHERE linktree_id = p_linktree_id);
END;
$$;


--
-- Name: reorder_links(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reorder_links(p_linktree_id uuid, p_link_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  lid UUID;
  i   SMALLINT := 0;
BEGIN
  FOREACH lid IN ARRAY p_link_ids LOOP
    UPDATE links SET display_order = i
    WHERE id = lid AND linktree_id = p_linktree_id;
    i := i + 1;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;
