-- LOCAL REVIEW PROPOSAL ONLY. Not a migration and not deployed.
-- API validation and trusted Wix integration remain mandatory.
-- Requires the existing unique players(wix_member_id) constraint and verified
-- players/games/player_games/game_suggestions column contracts before rollout.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_player_onboarding_atomic(p_profile jsonb, p_game_slugs text[], p_suggested_game text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_profile public.players%ROWTYPE;
  v_player_id public.players.id%TYPE;
  v_game_ids uuid[];
  v_slugs text[];
BEGIN
  IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' THEN
    RAISE EXCEPTION 'Invalid profile' USING ERRCODE = '22023';
  END IF;
  v_profile := jsonb_populate_record(NULL::public.players, p_profile);
  IF NULLIF(btrim(v_profile.wix_member_id), '') IS NULL THEN
    RAISE EXCEPTION 'Trusted member required' USING ERRCODE = '22023';
  END IF;
  SELECT array_agg(DISTINCT slug ORDER BY slug) INTO v_slugs FROM unnest(p_game_slugs) AS selected(slug);
  IF coalesce(cardinality(v_slugs), 0) NOT BETWEEN 1 AND 50 OR array_position(v_slugs, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Games required' USING ERRCODE = '22023';
  END IF;
  -- Share-lock catalog rows so an active game cannot change before commit.
  SELECT array_agg(id ORDER BY id) INTO v_game_ids FROM (
    SELECT id FROM public.games WHERE slug = ANY(v_slugs) AND active = true ORDER BY id FOR SHARE
  ) AS valid_games;
  IF coalesce(cardinality(v_game_ids), 0) <> cardinality(v_slugs) THEN
    RAISE EXCEPTION 'Invalid games' USING ERRCODE = '22023';
  END IF;
  -- The upsert holds the player row lock through game replacement and commit.
  -- Concurrent calls for one Wix member serialize on this existing unique key.
  INSERT INTO public.players (wix_member_id, email, first_name, last_name, alias, phone, birth_date, street_address, city, region_code, region_name, postal_code, country_code, payout_contact_preference, emergency_contact_name, emergency_contact_phone, legal_guardian_name, legal_guardian_phone, wants_to_organize, interested_in_volunteering, is_public)
  VALUES (v_profile.wix_member_id, v_profile.email, v_profile.first_name, v_profile.last_name, v_profile.alias, v_profile.phone, v_profile.birth_date, v_profile.street_address, v_profile.city, v_profile.region_code, v_profile.region_name, v_profile.postal_code, v_profile.country_code, v_profile.payout_contact_preference, v_profile.emergency_contact_name, v_profile.emergency_contact_phone, v_profile.legal_guardian_name, v_profile.legal_guardian_phone, v_profile.wants_to_organize, v_profile.interested_in_volunteering, v_profile.is_public)
  ON CONFLICT (wix_member_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    alias = EXCLUDED.alias,
    phone = EXCLUDED.phone,
    birth_date = EXCLUDED.birth_date,
    street_address = EXCLUDED.street_address,
    city = EXCLUDED.city,
    region_code = EXCLUDED.region_code,
    region_name = EXCLUDED.region_name,
    postal_code = EXCLUDED.postal_code,
    country_code = EXCLUDED.country_code,
    payout_contact_preference = EXCLUDED.payout_contact_preference,
    emergency_contact_name = EXCLUDED.emergency_contact_name,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone,
    legal_guardian_name = EXCLUDED.legal_guardian_name,
    legal_guardian_phone = EXCLUDED.legal_guardian_phone,
    wants_to_organize = EXCLUDED.wants_to_organize,
    interested_in_volunteering = EXCLUDED.interested_in_volunteering,
    is_public = EXCLUDED.is_public
  RETURNING id INTO v_player_id;
  DELETE FROM public.player_games WHERE player_id = v_player_id;
  INSERT INTO public.player_games (player_id, game_id, interested_in_playing, interested_in_competing, interested_in_organizing)
  SELECT v_player_id, id, true, true, coalesce(v_profile.wants_to_organize, false) FROM unnest(v_game_ids) AS games(id);
  IF NULLIF(btrim(p_suggested_game), '') IS NOT NULL THEN
    INSERT INTO public.game_suggestions (suggested_name, suggested_by_player_id, status)
    SELECT btrim(p_suggested_game), v_player_id, 'pending'
    WHERE NOT EXISTS (SELECT 1 FROM public.game_suggestions WHERE suggested_by_player_id = v_player_id AND suggested_name = btrim(p_suggested_game));
  END IF;
  RETURN jsonb_build_object('id', v_player_id);
  -- Intentionally no exception handler: every failure rolls back all writes.
END;
$$;
REVOKE ALL ON FUNCTION public.save_player_onboarding_atomic(jsonb, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_player_onboarding_atomic(jsonb, text[], text) TO service_role;
COMMIT;
