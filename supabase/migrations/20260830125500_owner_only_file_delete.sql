-- Shared recipients can view files, but only the file owner can delete them.
DROP POLICY IF EXISTS "Admins can delete all files" ON public.files;

CREATE POLICY "Owners can delete their own files"
ON public.files
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
