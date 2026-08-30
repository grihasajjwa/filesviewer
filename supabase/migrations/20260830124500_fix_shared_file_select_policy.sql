DROP POLICY IF EXISTS "Users can view files shared with them" ON public.files;

CREATE POLICY "Users can view files shared with them"
ON public.files FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.file_user_shares s
    WHERE s.file_id = public.files.id
      AND s.shared_with_user_id = auth.uid()
  )
);