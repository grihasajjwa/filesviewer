-- Admins could view/insert/update any file but not delete others' files, so the
-- Trash view's permanent delete silently removed 0 rows and still showed success.
CREATE POLICY "Admins can delete any files"
ON public.files
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));