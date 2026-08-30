CREATE TABLE IF NOT EXISTS public.file_user_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (file_id, shared_with_user_id)
);

GRANT SELECT, INSERT, DELETE ON public.file_user_shares TO authenticated;
GRANT ALL ON public.file_user_shares TO service_role;

ALTER TABLE public.file_user_shares ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_file_owner(_file_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.files f WHERE f.id = _file_id AND f.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_file_shared_with(_file_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.file_user_shares s
    WHERE s.file_id = _file_id AND s.shared_with_user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_id_by_username(_username text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id FROM public.profiles p
  WHERE lower(p.username) = lower(trim(_username))
     OR lower(p.email) = lower(trim(_username))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_file_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_file_shared_with(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_username(text) TO authenticated;

CREATE POLICY "Owners and admins can view file shares"
ON public.file_user_shares FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR shared_with_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owners and admins can create file shares"
ON public.file_user_shares FOR INSERT TO authenticated
WITH CHECK (
  shared_with_user_id <> auth.uid()
  AND (
    (owner_id = auth.uid() AND public.is_file_owner(file_id, auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Owners and admins can remove file shares"
ON public.file_user_shares FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view files shared with them"
ON public.files FOR SELECT TO authenticated
USING (public.is_file_shared_with(id, auth.uid()));