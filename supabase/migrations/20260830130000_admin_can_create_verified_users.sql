CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_display_name text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_display_name text;
  v_username text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can create users';
  END IF;

  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  v_display_name := NULLIF(btrim(COALESCE(p_display_name, '')), '');
  IF v_display_name IS NULL THEN
    v_display_name := split_part(p_email, '@', 1);
  END IF;

  v_username := split_part(p_email, '@', 1);

  RETURN QUERY
  WITH created AS (
    SELECT *
    FROM auth.admin_create_user(
      jsonb_build_object(
        'email', p_email,
        'password', p_password,
        'email_confirm', true,
        'user_metadata', jsonb_build_object(
          'display_name', v_display_name,
          'username', v_username
        )
      )
    )
  )
  SELECT
    c.id,
    c.email,
    COALESCE(c.raw_user_meta_data->>'display_name', v_display_name) AS display_name,
    COALESCE(c.raw_user_meta_data->>'username', v_username) AS username
  FROM created c;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text) TO authenticated;
