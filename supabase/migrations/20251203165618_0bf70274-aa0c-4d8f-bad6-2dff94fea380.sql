-- Add public read policy for files table to allow shared links to work
CREATE POLICY "Anyone can view files for sharing" 
ON public.files 
FOR SELECT 
USING (true);