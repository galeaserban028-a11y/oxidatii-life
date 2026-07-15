
-- 1. Column-level protection for sensitive profile fields.
-- Owner reads these via get_my_account_state() (SECURITY DEFINER); admins via admin_list_users().
REVOKE SELECT (
  coin_balance,
  premium_tier,
  premium_until,
  birthdate,
  map_ghost,
  map_visibility,
  map_precision,
  map_auto_ghost_hours,
  map_hide_from_live_list,
  map_require_reciprocity,
  boost_until,
  last_boost_at,
  location_consent
) ON public.profiles FROM anon, authenticated;

-- 2. Lock down internal SECURITY DEFINER functions from public callers.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.enqueue_email(text, jsonb)',
    'public.delete_email(text, bigint)',
    'public.read_email_batch(text, integer, integer)',
    'public.email_queue_dispatch()',
    'public.email_queue_wake()',
    'public.find_new_hot_cells(integer, integer)',
    'public.recompute_business_reputation()',
    'public.grant_crystal_ball_unlock(uuid, integer)',
    'public.grant_replay_unlock(uuid, date, text)',
    'public.compute_business_score(uuid)',
    'public.antispam_guard(uuid, text, text, integer, integer, integer)',
    'public.antispam_messages_trigger()',
    'public.antispam_photo_comments_trigger()',
    'public.cleanup_on_block()',
    'public.cleanup_old_spritz()',
    'public.award_post_coins()',
    'public.bump_business_live_energy()',
    'public.notify_on_follow_update()',
    'public.notify_on_follow_delete()',
    'public.set_follow_status_on_insert()',
    'public.handle_new_user()',
    'public.validate_birthdate()',
    'public.validate_handle()',
    'public.update_updated_at_column()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipping missing function: %', fn;
    END;
  END LOOP;
END $$;
